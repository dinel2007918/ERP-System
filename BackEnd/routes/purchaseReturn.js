import express from 'express';
import promiseDb from '../dataBase.js';

const router = express.Router();

router.get("/load-invoice/:poNumber", async (req, res) => {
    const { poNumber } = req.params;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;

    try {
        // Fetch original PO
        const [invoices] = await connection.query(
            `SELECT * FROM purchase_invoices WHERE invoice_number = ? LIMIT 1`,
            [poNumber]
        );
        if (invoices.length === 0) {
            return res.status(404).json({ success: false, message: "Purchase Invoice not found." });
        }

        const invoice = invoices[0];

        // Fetch Supplier details natively
        const [suppliers] = await connection.query(
            `SELECT id, supplier_code, supplier_name as name FROM suppliers WHERE id = ?`,
            [invoice.supplier_id]
        );

        // Fetch mapping Items
        const [items] = await connection.query(`
            SELECT pii.*, i.Product_ID, i.Description 
            FROM purchase_invoice_items pii
            LEFT JOIN items i ON pii.item_code = i.Item_Code
            WHERE pii.invoice_id = ?
        `, [invoice.id]);

        res.json({
            success: true,
            supplier: suppliers[0],
            items: items.map(it => ({
                id: it.id.toString(),
                itemCode: it.item_code,
                productId: it.Product_ID || it.item_code,
                description: it.Description || "",
                unitCost: parseFloat(it.new_cost) || parseFloat(it.unit_cost) || 0,
                returnQty: parseFloat(it.quantity) || 1,
                lineTotal: parseFloat(it.line_total) || 0
            }))
        });

    } catch (e) {
        console.error("Load PO Error:", e);
        res.status(500).json({ success: false, message: "Server error", error: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

router.post("/", async (req, res) => {
    const { supplierId, originalInvoiceNumber, returnType, items, totalAmount } = req.body;

    if (!supplierId || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Missing required return parameters." });
    }

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;

    try {
        await connection.beginTransaction();

        const returnNumber = 'RET-PUR-' + Date.now().toString().slice(-6);
        let activeInvoiceId = null;

        // Note: originalInvoiceNumber is purely a reference if mapping isn't exact
        // The return creates an independent Debt Note

        // 1. Create Return Wrapper (Debit Note)
        const [retRes] = await connection.query(`
            INSERT INTO purchase_returns 
            (return_number, invoice_id, supplier_id, return_date, total_amount, return_type, status)
            VALUES (?, ?, ?, NOW(), ?, ?, 'PENDING')
        `, [returnNumber, activeInvoiceId, supplierId, totalAmount, returnType]);

        const returnId = retRes.insertId;

        // 2. Iterate Return Cart
        for (const it of items) {
            const qty = parseFloat(it.returnQty);
            const cost = parseFloat(it.unitCost);
            const lineTotal = qty * cost;

            await connection.query(`
                INSERT INTO purchase_return_items (return_id, item_code, quantity, unit_cost, line_total)
                VALUES (?, ?, ?, ?, ?)
            `, [returnId, it.itemCode, qty, cost, lineTotal]);

            // PHYSICAL INVENTORY DISCARD! (DEDUCT STOCK)
            await connection.query(`
                UPDATE items 
                SET stock_quantity = stock_quantity - ? 
                WHERE Item_Code = ?
            `, [qty, it.itemCode]);

            const [[{ stock_quantity: newStockBalance }]] = await connection.query(
                `SELECT stock_quantity FROM items WHERE Item_Code = ?`, [it.itemCode]
            );

            // DEDUCT from stock_movements ensuring all constraints hold explicitly
            await connection.query(`
                INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reason, reference_id)
                VALUES (?, 'purchase_return', ?, ?, 'PURCHASE_RETURN (TO SUPPLIER)', ?)
            `, [it.itemCode, qty, newStockBalance, returnNumber]);
        }

        await connection.commit();
        res.json({ success: true, message: `Return Processed. Assigned Debit Note: ${returnNumber}. Inventory successfully deducted.` });
    } catch (err) {
        await connection.rollback();
        console.error("Purchase Return Error: ", err);
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    } finally {
        if (connection.release) connection.release();
    }
});
// Get pending Debit Notes and active Invoices for Settlement
router.get("/supplier/:id/settlements", async (req, res) => {
    const supplierId = req.params.id;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [creditNotes] = await connection.query(`
            SELECT id, return_number, total_amount, return_type, status 
            FROM purchase_returns 
            WHERE supplier_id = ? AND status = 'PENDING'
        `, [supplierId]);

        const [invoices] = await connection.query(`
            SELECT id, invoice_number, date, grand_total, amount_paid, (grand_total - amount_paid) as balance, status 
            FROM purchase_invoices 
            WHERE supplier_id = ? AND status = 'completed' AND (grand_total - amount_paid) > 0
        `, [supplierId]);

        res.json({ success: true, creditNotes, invoices });
    } catch (e) {
        res.status(500).json({ success: false, message: "Error loading settlements" });
    } finally {
        if (connection.release) connection.release();
    }
});

// Issue Cash Refund for Cash Suppliers
router.put("/:id/refund", async (req, res) => {
    const returnId = req.params.id;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        await connection.query("UPDATE purchase_returns SET status = 'SETTLED' WHERE id = ?", [returnId]);
        res.json({ success: true, message: "Cash Refund Issued." });
    } catch (e) {
        res.status(500).json({ success: false });
    } finally {
        if (connection.release) connection.release();
    }
});

// Settle Debit Note Against Target Invoices
router.post("/settle", async (req, res) => {
    const { supplierId, debitNoteId, targetInvoices } = req.body;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;

    try {
        await connection.beginTransaction();

        for (const [invId, amount] of Object.entries(targetInvoices)) {
            const numAmount = parseFloat(amount);
            if (numAmount > 0) {
                // Update specific invoice
                await connection.query(`
                    UPDATE purchase_invoices 
                    SET amount_paid = amount_paid + ? 
                    WHERE id = ?
                `, [numAmount, invId]);

                // Create supplier settlement log mapping
                await connection.query(`
                    INSERT INTO supplier_settlements (supplier_id, credit_note_id, mapped_invoice_id, amount_applied) 
                    VALUES (?, ?, ?, ?)
                `, [supplierId, debitNoteId, invId, numAmount]);
            }
        }

        // Close out the Debit note
        await connection.query("UPDATE purchase_returns SET status = 'SETTLED' WHERE id = ?", [debitNoteId]);

        await connection.commit();
        res.json({ success: true, message: "Settlement mapped successfully." });
    } catch (e) {
        console.error("SETTLEMENT FATAL ERROR: ", e);
        await connection.rollback();
        res.status(500).json({ success: false, message: "Settlement failed." });
    } finally {
        if (connection.release) connection.release();
    }
});

export default router;
