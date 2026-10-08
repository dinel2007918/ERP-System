import express from "express";
import db from "../dataBase.js";

const router = express.Router();
const promiseDb = db.promise();

// POST /api/payments
router.post("/", async (req, res) => {
    const { customerId, paymentMethod, amount, chequeNumber, chequeBank, chequeDate, targetInvoices } = req.body;

    // Status is based on type
    const initialStatus = paymentMethod === 'Cheque' ? 'PENDING' : 'CLEARED';

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Insert Payment Record
        const [pResult] = await connection.query(`
            INSERT INTO customer_payments (customer_id, payment_method, amount, cheque_number, cheque_bank, cheque_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [customerId, paymentMethod, amount, chequeNumber || null, chequeBank || null, chequeDate || null, initialStatus]);

        const paymentId = pResult.insertId;

        // 2. Allocate across targeted Invoices
        let totalAllocated = 0;
        for (const [invId, appliedStr] of Object.entries(targetInvoices)) {
            const applied = parseFloat(appliedStr);
            if (applied <= 0) continue;

            await connection.query(`
                INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated, created_at)
                VALUES (?, ?, ?, NOW())
            `, [paymentId, invId, applied]);

            // If it's a Cash or Transfer, instantly settle the invoice amounts
            if (initialStatus === 'CLEARED') {
                await connection.query(`
                    UPDATE sales_invoices 
                    SET amount_paid = amount_paid + ? 
                    WHERE id = ?
                `, [applied, invId]);
            }

            totalAllocated += applied;
        }

        await connection.commit();
        res.json({ success: true, paymentId, initialStatus });
    } catch (err) {
        await connection.rollback();
        console.error("Payment Process Error:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// GET /api/payments/cheques
// Fetch all PENDING cheques (can be extended to filter by status)
router.get("/cheques", async (req, res) => {
    const statusFilter = req.query.status || 'PENDING';
    const connection = await promiseDb.getConnection();
    try {
        const [cheques] = await connection.query(`
            SELECT cp.*, c.customer_name, c.customer_code
            FROM customer_payments cp
            LEFT JOIN customers c ON cp.customer_id = c.id
            WHERE cp.payment_method = 'Cheque' AND cp.status = ?
            ORDER BY cp.created_at DESC
        `, [statusFilter]);

        res.json({ success: true, cheques });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

// PUT /api/payments/cheques/:id/status
// Handle CLEARED or BOUNCED
router.put("/cheques/:id/status", async (req, res) => {
    const paymentId = req.params.id;
    const { newStatus } = req.body; // CLEARED or BOUNCED

    if (!['CLEARED', 'BOUNCED'].includes(newStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status state." });
    }

    const connection = await promiseDb.getConnection();
    try {
        await connection.beginTransaction();

        // Get the payment
        const [pRows] = await connection.query("SELECT * FROM customer_payments WHERE id = ? AND payment_method = 'Cheque' FOR UPDATE", [paymentId]);
        if (pRows.length === 0) throw new Error("Cheque not found");
        const payment = pRows[0];

        if (payment.status !== 'PENDING') {
            throw new Error(`Cheque is already marked as ${payment.status}. Cannot modify.`);
        }

        // Get the allocations
        const [aRows] = await connection.query("SELECT * FROM payment_allocations WHERE payment_id = ?", [paymentId]);

        // If CLEARING -> We must officially apply the cash to the invoices now!
        if (newStatus === 'CLEARED') {
            for (const alloc of aRows) {
                await connection.query(`
                    UPDATE sales_invoices 
                    SET amount_paid = amount_paid + ? 
                    WHERE id = ?
                `, [alloc.amount_allocated, alloc.invoice_id]);
            }
        }
        // If BOUNCED -> No DB math needed on Invoices because they were never credited to begin with.

        // Finalize status
        await connection.query("UPDATE customer_payments SET status = ? WHERE id = ?", [newStatus, paymentId]);

        await connection.commit();
        res.json({ success: true, message: `Cheque securely marked as ${newStatus}` });
    } catch (err) {
        await connection.rollback();
        console.error("Cheque Status Update Error:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

export default router;
