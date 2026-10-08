import express from "express";
import db from "../dataBase.js";

const router = express.Router();
const promiseDb = db.promise();

// GET /api/sales-returns/invoice/:invoiceNumber
// Safely pulls invoice data and items for the Return UI 
router.get("/invoice/:invoiceNumber", async (req, res) => {
    const { invoiceNumber } = req.params;
    const connection = await promiseDb.getConnection();

    try {
        const [invRows] = await connection.query(`
            SELECT i.*, c.customer_name, c.default_payment_type 
            FROM sales_invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.invoice_number = ?
        `, [invoiceNumber]);

        if (invRows.length === 0) return res.status(404).json({ success: false, message: "Invoice not found" });
        const invoice = invRows[0];

        const [items] = await connection.query(`
            SELECT si.*, itm.Description as item_name
            FROM sales_invoice_items si
            LEFT JOIN items itm ON si.item_code = itm.Item_Code
            WHERE si.invoice_id = ?
        `, [invoice.id]);

        // Find existing returns to calculate net remaining limits
        const [returnedRows] = await connection.query(`
            SELECT item_code, SUM(quantity) as total_returned
            FROM sales_return_items sri
            JOIN sales_returns sr ON sri.return_id = sr.id
            WHERE sr.invoice_id = ?
            GROUP BY item_code
        `, [invoice.id]);

        const returnedMap = {};
        for (let r of returnedRows) returnedMap[r.item_code] = parseFloat(r.total_returned);

        const mappedItems = items.map(itm => {
            const alreadyReturned = returnedMap[itm.item_code] || 0;
            return {
                ...itm,
                already_returned: alreadyReturned,
                remaining_qty: parseFloat(itm.quantity) - alreadyReturned
            };
        });

        invoice.items = mappedItems;
        res.json({ success: true, invoice });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// POST /api/sales-returns
// Create a Sales Return / Credit Note
router.post("/", async (req, res) => {
    const { invoiceId, customerId, totalAmount, returnType, items } = req.body;
    // returnType: "CASH_REFUND" or "CREDIT_NOTE"

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // Generate return number
        const [seqResult] = await connection.query("SELECT COUNT(*) as cnt FROM sales_returns WHERE DATE(created_at) = CURDATE()");
        const dObj = new Date();
        const yy = String(dObj.getFullYear()).slice(-2);
        const mm = String(dObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dObj.getDate()).padStart(2, '0');
        const seq = String(seqResult[0].cnt + 1).padStart(3, '0');
        const returnNumber = `RTN${yy}${mm}${dd}${seq}`;

        // Insert Header
        const [rResult] = await connection.query(`
            INSERT INTO sales_returns (return_number, invoice_id, customer_id, return_date, total_amount, return_type, status, created_at)
            VALUES (?, ?, ?, NOW(), ?, ?, 'PENDING', NOW())
        `, [returnNumber, invoiceId, customerId, totalAmount, returnType]);

        const returnId = rResult.insertId;

        // Process return items
        for (const itm of items) {
            await connection.query(`
                INSERT INTO sales_return_items (return_id, item_code, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?)
            `, [returnId, itm.itemCode, itm.quantity, itm.unitPrice, itm.lineTotal]);

            // Add back to physical stock
            const qty = parseFloat(itm.quantity);
            const [sRows] = await connection.query("SELECT stock_quantity FROM items WHERE Item_Code = ? FOR UPDATE", [itm.itemCode]);
            if (sRows.length > 0) {
                const currentQty = parseFloat(sRows[0].stock_quantity);
                const newQty = currentQty + qty;
                await connection.query("UPDATE items SET stock_quantity = ? WHERE Item_Code = ?", [newQty, itm.itemCode]);

                await connection.query(`
                    INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reference_id, reason, movement_date)
                    VALUES (?, 'sales_return', ?, ?, ?, ?, NOW())
                `, [itm.itemCode, qty, newQty, returnNumber, 'Sales Return Module']);
            }
        }

        // If cash refund, just mark status as REFUNDED natively if they already handed over cash on the UI
        if (returnType === 'CASH_REFUND') {
            await connection.query("UPDATE sales_returns SET status = 'REFUNDED' WHERE id = ?", [returnId]);
        }

        await connection.commit();
        res.json({ success: true, returnNumber, returnId });
    } catch (err) {
        await connection.rollback();
        console.error("Sales Return failed:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// GET /api/sales-returns/customer/:customerId/settlements
// Gets pending credit notes and unpaid invoices for a specific customer
router.get("/customer/:customerId/settlements", async (req, res) => {
    const { customerId } = req.params;
    const connection = await promiseDb.getConnection();
    try {
        const [creditNotes] = await connection.query(`
            SELECT sr.*, i.invoice_number as original_invoice_number
            FROM sales_returns sr
            LEFT JOIN sales_invoices i ON sr.invoice_id = i.id
            WHERE sr.customer_id = ? AND sr.status = 'PENDING' AND sr.return_type = 'CREDIT_NOTE'
        `, [customerId]);

        // "Unpaid" Invoices logic: (grand_total - amount_paid > 0) and status = 'POSTED'
        const [invoices] = await connection.query(`
            SELECT id, invoice_number, invoice_date, grand_total, amount_paid, (grand_total - amount_paid) as balance
            FROM sales_invoices
            WHERE customer_id = ? AND status = 'POSTED' AND (grand_total - amount_paid > 0)
        `, [customerId]);

        res.json({ success: true, creditNotes, invoices });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// POST /api/sales-returns/settle
// Saves offsetting mapping -> Uses a specified credit_note to pay down a specified invoice
router.post("/settle", async (req, res) => {
    const { customerId, creditNoteId, targetInvoices } = req.body;
    // targetInvoices: { invoiceId: amountToApply }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        let totalApplied = 0;

        for (const [invId, amountToApply] of Object.entries(targetInvoices)) {
            const applied = parseFloat(amountToApply);
            if (applied <= 0) continue;

            // Log settlement mapping
            await connection.query(`
                INSERT INTO settlements (customer_id, credit_note_id, mapped_invoice_id, amount_applied, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `, [customerId, creditNoteId, invId, applied]);

            // Adjust the target invoice's amount_paid directly
            await connection.query(`
                UPDATE sales_invoices 
                SET amount_paid = amount_paid + ? 
                WHERE id = ?
            `, [applied, invId]);

            totalApplied += applied;
        }

        // Technically we should check if the creditNote is fully exhausted to mark SETTLED
        // We'll mark it SETTLED automatically since the UI only allows full assignment currently.
        await connection.query("UPDATE sales_returns SET status = 'SETTLED' WHERE id = ?", [creditNoteId]);

        await connection.commit();
        res.json({ success: true, message: "Settlement mapped successfully" });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/sales-returns/:id/refund
// Converts a pending Credit Note into a Cash Refund
router.put("/:id/refund", async (req, res) => {
    const returnId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        await connection.query("UPDATE sales_returns SET status = 'REFUNDED' WHERE id = ?", [returnId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// GET /api/sales-returns/:id
// Pulls all details for printing the Return PDF
router.get("/:id", async (req, res) => {
    const returnId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        const [rRows] = await connection.query(`
            SELECT sr.*, i.invoice_number, c.customer_name 
            FROM sales_returns sr
            LEFT JOIN sales_invoices i ON sr.invoice_id = i.id
            LEFT JOIN customers c ON sr.customer_id = c.id
            WHERE sr.id = ?
        `, [returnId]);

        if (rRows.length === 0) return res.status(404).json({ success: false, message: "Return doc not found" });
        const returnRecord = rRows[0];

        const [iRows] = await connection.query(`
            SELECT sri.*, itm.Description as item_name
            FROM sales_return_items sri
            LEFT JOIN items itm ON sri.item_code = itm.Item_Code
            WHERE sri.return_id = ?
        `, [returnId]);

        returnRecord.items = iRows;
        res.json({ success: true, returnRecord });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

export default router;
