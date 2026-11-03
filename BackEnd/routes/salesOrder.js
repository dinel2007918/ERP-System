import express from "express";
import db from "../dataBase.js";

const router = express.Router();
const promiseDb = db.promise();

// Helper: Calculate Available Stock for an Item
async function getAvailableStock(connection, itemCode) {
    const [itemRows] = await connection.query("SELECT stock_quantity FROM items WHERE Item_Code = ?", [itemCode]);
    if (itemRows.length === 0) return 0;
    const physicalQuantity = parseFloat(itemRows[0].stock_quantity) || 0;

    const [resRows] = await connection.query(`
        SELECT COALESCE(SUM(reserved_quantity - released_quantity), 0) AS total_reserved 
        FROM stock_reservations 
        WHERE item_code = ? AND status IN ('RESERVED', 'PARTIALLY_RELEASED')
    `, [itemCode]);

    const activeReserved = parseFloat(resRows[0].total_reserved) || 0;

    const [draftRows] = await connection.query(`
        SELECT COALESCE(SUM(sii.quantity), 0) AS total_draft 
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON sii.invoice_id = si.id
        WHERE sii.item_code = ? AND si.status = 'DRAFT'
    `, [itemCode]);

    const activeDrafts = parseFloat(draftRows[0].total_draft) || 0;

    return physicalQuantity - activeReserved - activeDrafts;
}

// 1. POST /api/sales-orders (Create Order)
router.post("/", async (req, res) => {
    const { customerId, poNumber, note, items, subtotal, discountTotal, grandTotal, createdBy } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required order data" });
    }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // Validate stock for all items BEFORE inserting anything
        for (const itm of items) {
            const available = await getAvailableStock(connection, itm.itemCode);
            if (parseFloat(itm.quantity) > available) {
                throw new Error(`Insufficient available stock for ${itm.itemCode}. Available: ${available}`);
            }
        }

        // Generate Order Number
        const [seqResult] = await connection.query("SELECT COUNT(*) as cnt FROM sales_orders WHERE DATE(created_at) = CURDATE()");
        const dailyCount = seqResult[0].cnt + 1;
        const orderNumber = `SO-${new Date().getFullYear()}-${dailyCount.toString().padStart(6, '0')}`;

        // Insert Header
        const [orderResult] = await connection.query(`
            INSERT INTO sales_orders (order_number, customer_id, order_date, po_number, note, subtotal, discount_total, grand_total, status, created_by)
            VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, 'PENDING', ?)
        `, [orderNumber, customerId, poNumber || '', note || '', subtotal, discountTotal, grandTotal, createdBy || 'System']);

        const orderId = orderResult.insertId;

        // Insert Items and Make Reservations
        for (const itm of items) {
            const qty = parseFloat(itm.quantity);
            const [itemResult] = await connection.query(`
                INSERT INTO sales_order_items (sales_order_id, item_code, ordered_quantity, reserved_quantity, unit_price, discount, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [orderId, itm.itemCode, qty, qty, itm.unitPrice, itm.discount, itm.lineTotal]);

            const orderItemId = itemResult.insertId;

            await connection.query(`
                INSERT INTO stock_reservations (item_code, sales_order_id, sales_order_item_id, reserved_quantity, status)
                VALUES (?, ?, ?, ?, 'RESERVED')
            `, [itm.itemCode, orderId, orderItemId, qty]);
        }

        await connection.commit();
        res.json({ success: true, message: "Sales Order created successfully", orderNumber, orderId });
    } catch (err) {
        await connection.rollback();
        console.error("Create SO failed:", err);
        res.status(400).json({ success: false, message: err.message || "Failed to create sales order" });
    } finally {
        connection.release();
    }
});

// 2. GET /api/sales-orders/pending
router.get("/pending", async (req, res) => {
    try {
        const [rows] = await promiseDb.query(`
            SELECT so.*, c.customer_name, c.customer_code 
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.status IN ('PENDING', 'PARTIALLY_INVOICED')
            ORDER BY so.created_at DESC
        `);
        res.json({ success: true, orders: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

// 3. GET /api/sales-orders/:id (Get full order info along with items)
router.get("/:id", async (req, res) => {
    try {
        const [orders] = await promiseDb.query(`
            SELECT so.*, c.customer_name, c.customer_code, c.address, c.contact_number, c.discount_tier
            FROM sales_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.id = ?
        `, [req.params.id]);

        if (orders.length === 0) return res.status(404).json({ success: false, message: "Order not found" });

        const [items] = await promiseDb.query(`
            SELECT soi.*, i.Description as item_name, i.Product_ID
            FROM sales_order_items soi
            JOIN items i ON soi.item_code = i.Item_Code
            WHERE soi.sales_order_id = ?
        `, [req.params.id]);

        res.json({ success: true, order: orders[0], items });
    } catch (error) {
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

// 4. POST /api/sales-orders/:id/cancel
router.post("/:id/cancel", async (req, res) => {
    const orderId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        const [orders] = await connection.query("SELECT status FROM sales_orders WHERE id = ? FOR UPDATE", [orderId]);
        if (orders.length === 0) throw new Error("Order not found");
        if (orders[0].status === 'COMPLETED' || orders[0].status === 'CANCELLED') {
            throw new Error(`Cannot cancel a ${orders[0].status} order.`);
        }

        // Release reservations
        await connection.query(`
            UPDATE stock_reservations
            SET released_quantity = reserved_quantity, status = 'RELEASED'
            WHERE sales_order_id = ? AND status IN ('RESERVED', 'PARTIALLY_RELEASED')
        `, [orderId]);

        // Zero out un-invoiced reserved item amounts to reflect cancellation
        await connection.query(`
            UPDATE sales_order_items
            SET reserved_quantity = invoiced_quantity
            WHERE sales_order_id = ?
        `, [orderId]);

        // Mark cancelled
        await connection.query("UPDATE sales_orders SET status = 'CANCELLED' WHERE id = ?", [orderId]);

        await connection.commit();
        res.json({ success: true, message: "Order cancelled and stock released" });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ success: false, message: err.message || "Failed to cancel order" });
    } finally {
        connection.release();
    }
});

// Helper route to get strictly available stock for frontend validation
router.get("/stock/:itemCode", async (req, res) => {
    const connection = await promiseDb.getConnection();
    try {
        const available = await getAvailableStock(connection, req.params.itemCode);
        res.json({ success: true, available });
    } catch (err) {
        res.status(500).json({ success: false });
    } finally {
        connection.release();
    }
});

export default router;
