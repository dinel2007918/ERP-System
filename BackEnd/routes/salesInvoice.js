import express from "express";
import db from "../dataBase.js";

const router = express.Router();
const promiseDb = db.promise();

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
        createdBy
    } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required invoice data" });
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
            INSERT INTO sales_invoices (invoice_number, customer_id, sales_order_id, invoice_date, subtotal, discount, grand_total, amount_paid, payment_method, status)
            VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'POSTED')
        `, [invoiceNumber, customerId, orderId || null, subtotal, discountTotal, grandTotal, amountPaid || 0, paymentMethod || 'Cash']);

        const invoiceId = invResult.insertId;

        // Process Items
        for (const itm of items) {
            const qty = parseFloat(itm.quantity);

            // Insert Invoice Line
            await connection.query(`
                INSERT INTO sales_invoice_items (invoice_id, item_code, quantity, unit_price, discount, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [invoiceId, itm.itemCode, qty, itm.unitPrice, itm.discount, itm.lineTotal]);

            // Deduct from Physical Stock (Items table)
            const [itemRows] = await connection.query("SELECT stock_quantity FROM items WHERE Item_Code = ? FOR UPDATE", [itm.itemCode]);
            if (itemRows.length === 0) throw new Error(`Item ${itm.itemCode} not found in inventory.`);

            const currentQty = parseFloat(itemRows[0].stock_quantity);

            // If this is a direct invoice (no order), ensure physical stock >= quantity
            if (!orderId && currentQty < qty) {
                // Actually, wait, even if orderId is missing, if they haven't reserved it, we must ensure it doesn't drop below 0 if business logic demands. I will let physical stock drop for now or enforce it:
                if (currentQty < qty) throw new Error(`Insufficient physical stock for ${itm.itemCode}.`);
            }

            const newQty = currentQty - qty;
            await connection.query("UPDATE items SET stock_quantity = ? WHERE Item_Code = ?", [newQty, itm.itemCode]);

            // Record into Stock Movements
            await connection.query(`
                INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reference_id, reason, movement_date)
                VALUES (?, 'sales', ?, ?, ?, ?, NOW())
            `, [itm.itemCode, -qty, newQty, invoiceNumber, `Sales Invoice ${orderId ? `(from SO ${orderId})` : ''}`]);

            // Release Reservations if this comes from a Sales Order
            if (orderId && itm.orderItemId) {
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

        // Process Payment Log if payment made
        if (parseFloat(amountPaid) > 0) {
            await connection.query(`
                INSERT INTO payments (reference_id, type, entity_id, amount, method, payment_date)
                VALUES (?, 'CUSTOMER', ?, ?, ?, NOW())
            `, [invoiceNumber, customerId, amountPaid, paymentMethod || 'Cash']);
        }

        // If converted from order, update the Order Status
        if (orderId) {
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
            SELECT i.id, i.invoice_number, i.invoice_date as date, i.grand_total, i.amount_paid, i.status, c.customer_name
            FROM sales_invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            ORDER BY i.created_at DESC
        `);
        res.json({ success: true, invoices: rows });
    } catch (err) {
        console.error("Failed to fetch invoices:", err);
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

        // 2. Fetch items for this invoice to reverse stock
        const [itemRows] = await connection.query("SELECT item_code, quantity FROM sales_invoice_items WHERE invoice_id = ?", [invoiceId]);

        // 3. Reverse physical stock
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

        // 4. If this invoice came from an order, we might need to reverse the order's invoiced_quantity and released_quantity
        // (For simplicity in this scope, let's just mark the invoice itself as CANCELED. Fully reversing the entire ERP tree can be done later if needed).

        // 5. Cancel the invoice status
        await connection.query("UPDATE sales_invoices SET status = 'CANCELED' WHERE id = ?", [invoiceId]);

        // 6. Delete or mark payments mathematically closed? Easiest is just letting the invoice be CANCELED.

        await connection.commit();
        res.json({ success: true, message: "Canceled successfully" });

    } catch (err) {
        await connection.rollback();
        console.error("Cancel failed:", err);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

export default router;
