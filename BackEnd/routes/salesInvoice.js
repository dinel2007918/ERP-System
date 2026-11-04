import express from "express";
import db from "../dataBase.js";

const router = express.Router();
const promiseDb = db.promise();

function canPostInvoices(user) {
    return !!user?.invoice_post_access || (Array.isArray(user?.privileges) && user.privileges.includes("draft-invoices"));
}

function canManageShipping(user) {
    return canPostInvoices(user) || (Array.isArray(user?.privileges) && user.privileges.includes("to-ship"));
}

// POST /api/sales-invoices (Handles standard direct invoice AND invoice-from-order conversions)
router.post("/", async (req, res) => {
    const {
        customerId,
        orderId,         // null if direct invoice
        poNumber,
        note,
        items,           // array of items (itemCode, quantity, unitPrice, discount, lineTotal, orderItemId if converting)
        subtotal,
        discountTotal,
        grandTotal,
        amountPaid,
        paymentMethod,
        shippingMethod,
        courierName,
        status           // 'DRAFT' or 'POSTED'
    } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required invoice data" });
    }

    const invoiceStatus = status || 'POSTED';
    if (!['DRAFT', 'POSTED'].includes(invoiceStatus)) {
        return res.status(400).json({ success: false, message: "Invalid invoice status" });
    }
    if (invoiceStatus === 'POSTED' && !canPostInvoices(req.user)) {
        return res.status(403).json({ success: false, message: "You do not have permission to post sales invoices." });
    }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // Generate Invoice Number
        const [seqResult] = await connection.query("SELECT COUNT(*) as cnt FROM sales_invoices WHERE DATE(created_at) = CURDATE()");
        const dailyCount = seqResult[0].cnt + 1;

        const dObj = new Date();
        const yy = String(dObj.getFullYear()).slice(-2);
        const mm = String(dObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dObj.getDate()).padStart(2, '0');
        const seq = String(dailyCount).padStart(3, '0');

        const invoiceNumber = `A${yy}${mm}${dd}${seq}`;

        // Create Invoice Header
        const [invResult] = await connection.query(`
            INSERT INTO sales_invoices (invoice_number, customer_id, sales_order_id, invoice_date, subtotal, discount, grand_total, amount_paid, payment_method, status, created_by, shipping_method, courier_name, shipping_status)
            VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [invoiceNumber, customerId, orderId || null, subtotal, discountTotal, grandTotal, amountPaid || 0, paymentMethod || 'Cash', invoiceStatus, req.user.id, shippingMethod || null, courierName || null, invoiceStatus === 'POSTED' ? 'TO_SHIP' : null]);

        const invoiceId = invResult.insertId;

        // Process Items
        for (const itm of items) {
            const qty = parseFloat(itm.quantity);

            // Insert Invoice Line
            await connection.query(`
                INSERT INTO sales_invoice_items (invoice_id, item_code, quantity, unit_price, discount, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [invoiceId, itm.itemCode, qty, itm.unitPrice, itm.discount, itm.lineTotal]);

            // Deduct from Physical Stock (Items table) ONLY IF POSTED
            if (invoiceStatus !== 'DRAFT') {
                const [itemRows] = await connection.query("SELECT stock_quantity FROM items WHERE Item_Code = ? FOR UPDATE", [itm.itemCode]);
                if (itemRows.length === 0) throw new Error(`Item ${itm.itemCode} not found in inventory.`);

                const currentQty = parseFloat(itemRows[0].stock_quantity);

                // If this is a direct invoice (no order), ensure physical stock >= quantity
                if (!orderId && currentQty < qty) {
                    if (currentQty < qty) throw new Error(`Insufficient physical stock for ${itm.itemCode}.`);
                }

                const newQty = currentQty - qty;
                await connection.query("UPDATE items SET stock_quantity = ? WHERE Item_Code = ?", [newQty, itm.itemCode]);

                // Record into Stock Movements
                await connection.query(`
                    INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reference_id, reason, movement_date)
                    VALUES (?, 'sales', ?, ?, ?, ?, NOW())
                `, [itm.itemCode, -qty, newQty, invoiceNumber, `Sales Invoice ${orderId ? `(from SO ${orderId})` : ''}`]);
            }

            // Release Reservations if this comes from a Sales Order ONLY IF POSTED
            if (invoiceStatus !== 'DRAFT' && orderId && itm.orderItemId) {
                // Fetch existing reservation
                const [resRows] = await connection.query(`
                    SELECT * FROM stock_reservations 
                    WHERE sales_order_item_id = ? AND status IN ('RESERVED', 'PARTIALLY_RELEASED') FOR UPDATE
                `, [itm.orderItemId]);

                if (resRows.length > 0) {
                    const reservation = resRows[0];
                    const activeReservedAmt = parseFloat(reservation.reserved_quantity) - parseFloat(reservation.released_quantity);

                    // The released amount increases by the amount we invoiced (qty). If we invoice more than reserved, just cap it or allow it. Usually we only invoice up to reserved.
                    const releaseAmount = Math.min(activeReservedAmt, qty);
                    const newReleased = parseFloat(reservation.released_quantity) + releaseAmount;

                    const newStatus = newReleased >= parseFloat(reservation.reserved_quantity) ? 'CONVERTED' : 'PARTIALLY_RELEASED';

                    await connection.query(`
                        UPDATE stock_reservations SET released_quantity = ?, status = ? WHERE id = ?
                    `, [newReleased, newStatus, reservation.id]);

                    // Update sales_order_items invoiced_quantity
                    await connection.query(`
                        UPDATE sales_order_items SET invoiced_quantity = invoiced_quantity + ? WHERE id = ?
                    `, [qty, itm.orderItemId]);
                }
            }
        }

        // Process Payment Log if payment made AND POSTED
        if (invoiceStatus !== 'DRAFT' && parseFloat(amountPaid) > 0) {
            await connection.query(`
                INSERT INTO payments (reference_id, type, entity_id, amount, method, payment_date)
                VALUES (?, 'CUSTOMER', ?, ?, ?, NOW())
            `, [invoiceNumber, customerId, amountPaid, paymentMethod || 'Cash']);
        }

        // If converted from order, update the Order Status (ONLY IF POSTED)
        if (invoiceStatus !== 'DRAFT' && orderId) {
            // Check if all lines are fully invoiced
            const [orderItems] = await connection.query("SELECT ordered_quantity, invoiced_quantity FROM sales_order_items WHERE sales_order_id = ?", [orderId]);
            const allCompleted = orderItems.every(i => parseFloat(i.invoiced_quantity) >= parseFloat(i.ordered_quantity));
            const newOrderStatus = allCompleted ? 'COMPLETED' : 'PARTIALLY_INVOICED';
            await connection.query("UPDATE sales_orders SET status = ? WHERE id = ?", [newOrderStatus, orderId]);
        }

        await connection.commit();
        res.json({ success: true, message: "Invoice posted successfully", invoiceNumber, invoiceId });
    } catch (err) {
        await connection.rollback();
        console.error("Invoice creation failed:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to process invoice" });
    } finally {
        connection.release();
    }
});

// GET /api/sales-invoices (List all invoices)
router.get("/", async (req, res) => {
    const connection = await promiseDb.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT i.id, i.invoice_number, i.invoice_date as date, i.grand_total, i.amount_paid, i.status, i.rejection_reason, c.customer_name
            FROM sales_invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE (? = 1 OR i.status <> 'DRAFT')
            ORDER BY i.created_at DESC
        `, [canPostInvoices(req.user) ? 1 : 0]);
        res.json({ success: true, invoices: rows });
    } catch (err) {
        console.error("Failed to fetch invoices:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

router.get("/shipping", async (req, res) => {
    if (!canManageShipping(req.user)) {
        return res.status(403).json({ success: false, message: "You do not have permission to manage shipping." });
    }
    const connection = await promiseDb.getConnection();
    try {
        const [invoices] = await connection.query(`
            SELECT i.id, i.invoice_number, i.invoice_date as date, i.grand_total, i.shipping_method, i.courier_name, i.shipping_status, c.customer_name
            FROM sales_invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.status = 'POSTED' AND i.shipping_status = 'TO_SHIP'
            ORDER BY i.invoice_date ASC
        `);
        res.json({ success: true, invoices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

router.put("/:id/shipping", async (req, res) => {
    if (!canManageShipping(req.user)) {
        return res.status(403).json({ success: false, message: "You do not have permission to update shipping." });
    }
    const { shippingMethod, courierName, shippingStatus } = req.body;
    if (!['TO_SHIP', 'SHIPPED'].includes(shippingStatus)) {
        return res.status(400).json({ success: false, message: "Invalid shipping status." });
    }
    if (shippingStatus === 'SHIPPED' && (!shippingMethod?.trim() || !courierName?.trim())) {
        return res.status(400).json({ success: false, message: "Shipping method and courier are required before marking an invoice shipped." });
    }
    const connection = await promiseDb.getConnection();
    try {
        const [result] = await connection.query(`
            UPDATE sales_invoices
            SET shipping_method = ?, courier_name = ?, shipping_status = ?
            WHERE id = ? AND status = 'POSTED'
        `, [shippingMethod?.trim() || null, courierName?.trim() || null, shippingStatus, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Posted invoice not found." });
        }
        res.json({ success: true, message: "Shipping details updated." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// GET /api/sales-invoices/:id
router.get("/:id", async (req, res) => {
    const invoiceId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        const [invRows] = await connection.query(`
            SELECT i.*, c.customer_name, c.address, c.contact_number, c.email
            FROM sales_invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.id = ?
        `, [invoiceId]);

        if (invRows.length === 0) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        const invoice = invRows[0];

        const [itemRows] = await connection.query(`
            SELECT si.*, itm.Description as item_name 
            FROM sales_invoice_items si
            LEFT JOIN items itm ON si.item_code = itm.Item_Code
            WHERE si.invoice_id = ?
        `, [invoiceId]);

        invoice.items = itemRows;

        res.json({ success: true, invoice });
    } catch (err) {
        console.error("Failed to fetch invoice:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/sales-invoices/:id/cancel
router.put("/:id/cancel", async (req, res) => {
    const invoiceId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check if invoice exists and isn't already canceled
        const [invRows] = await connection.query("SELECT * FROM sales_invoices WHERE id = ? FOR UPDATE", [invoiceId]);
        if (invRows.length === 0) throw new Error("Invoice not found.");
        const invoice = invRows[0];

        if (invoice.status === 'CANCELED') {
            throw new Error("Invoice is already canceled.");
        }

        // 2. Reject a pending invoice while retaining the reason for review.
        if (invoice.status === 'DRAFT') {
            if (!canPostInvoices(req.user)) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: "You do not have permission to reject pending invoices." });
            }
            const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
            if (!reason) throw new Error("A rejection reason is required.");
            await connection.query("UPDATE sales_invoices SET status = 'REJECTED', rejection_reason = ? WHERE id = ?", [reason, invoiceId]);
            await connection.commit();
            return res.json({ success: true, message: "Invoice order rejected." });
        }

        // 3. POSTED invoice — reverse physical stock
        const [itemRows] = await connection.query("SELECT item_code, quantity FROM sales_invoice_items WHERE invoice_id = ?", [invoiceId]);

        for (const item of itemRows) {
            const qty = parseFloat(item.quantity);
            const [stockRows] = await connection.query("SELECT stock_quantity FROM items WHERE Item_Code = ? FOR UPDATE", [item.item_code]);
            if (stockRows.length > 0) {
                const currentQty = parseFloat(stockRows[0].stock_quantity);
                const newQty = currentQty + qty;
                await connection.query("UPDATE items SET stock_quantity = ? WHERE Item_Code = ?", [newQty, item.item_code]);

                // Log movement
                await connection.query(`
                    INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reference_id, reason, movement_date)
                    VALUES (?, 'sales_cancel', ?, ?, ?, ?, NOW())
                `, [item.item_code, qty, newQty, invoice.invoice_number, 'Invoice Cancellation']);
            }
        }

        // 4. Cancel the invoice status
        await connection.query("UPDATE sales_invoices SET status = 'CANCELED' WHERE id = ?", [invoiceId]);

        await connection.commit();
        res.json({ success: true, message: "Invoice canceled successfully." });

    } catch (err) {
        await connection.rollback();
        console.error("Cancel failed:", err);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});


// POST /api/sales-invoices/:id/approve
router.post("/:id/approve", async (req, res) => {
    if (!canPostInvoices(req.user)) {
        return res.status(403).json({ success: false, message: "You do not have permission to approve pending invoices." });
    }
    const invoiceId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        const [invRows] = await connection.query("SELECT * FROM sales_invoices WHERE id = ? FOR UPDATE", [invoiceId]);
        if (invRows.length === 0) throw new Error("Invoice not found.");
        const invoice = invRows[0];

        if (invoice.status !== 'DRAFT') throw new Error("Only DRAFT invoices can be formally approved.");

        const [items] = await connection.query("SELECT * FROM sales_invoice_items WHERE invoice_id = ?", [invoiceId]);

        // Process Items
        for (const itm of items) {
            const qty = parseFloat(itm.quantity);
            const itemCode = itm.item_code; // Note: column is item_code not itemCode here

            // Deduct from Physical Stock (Items table)
            const [itemRows] = await connection.query("SELECT stock_quantity FROM items WHERE Item_Code = ? FOR UPDATE", [itemCode]);
            if (itemRows.length === 0) throw new Error(`Item ${itemCode} not found in inventory.`);

            const currentQty = parseFloat(itemRows[0].stock_quantity);

            // Note: Draft approvals won't currently map back to reservations natively in this simple schema since we didn't save sales_order_item_id in sales_invoice_items,
            // but we can deduct physical safely. (If they reserved it, we would theoretically release it).
            if (currentQty < qty) throw new Error(`Insufficient physical stock for ${itemCode}.`);

            const newQty = currentQty - qty;
            await connection.query("UPDATE items SET stock_quantity = ? WHERE Item_Code = ?", [newQty, itemCode]);

            // Record into Stock Movements
            await connection.query(`
                INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reference_id, reason, movement_date)
                VALUES (?, 'sales', ?, ?, ?, ?, NOW())
            `, [itemCode, -qty, newQty, invoice.invoice_number, `Draft Approval: Sales Invoice`]);
        }

        // Process Payment Log if payment made
        if (parseFloat(invoice.amount_paid) > 0) {
            await connection.query(`
                INSERT INTO payments (reference_id, type, entity_id, amount, method, payment_date)
                VALUES (?, 'CUSTOMER', ?, ?, ?, NOW())
            `, [invoice.invoice_number, invoice.customer_id, invoice.amount_paid, invoice.payment_method || 'Cash']);
        }

        // Update status
        await connection.query("UPDATE sales_invoices SET status = 'POSTED', shipping_status = 'TO_SHIP' WHERE id = ?", [invoiceId]);

        await connection.commit();
        res.json({ success: true, message: "Draft successfully approved and posted." });
    } catch (err) {
        await connection.rollback();
        console.error("Draft approval failed:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to approve draft" });
    } finally {
        connection.release();
    }
});

export default router;
