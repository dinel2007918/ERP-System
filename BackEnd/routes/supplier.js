import express from 'express';
import promiseDb from '../dataBase.js';

const router = express.Router();

// Get active suppliers (Search)
router.get("/search", async (req, res) => {
    const query = req.query.q || '';
    if (query.trim().length < 1) return res.json([]);
    const searchTerm = `%${query}%`;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [results] = await connection.query(`
            SELECT *, supplier_name as name, contact_number as contact FROM suppliers 
            WHERE supplier_name LIKE ? OR supplier_code LIKE ?
            LIMIT 15
        `, [searchTerm, searchTerm]);
        res.json(results);
    } catch (e) {
        res.status(500).json([]);
    } finally {
        if (connection.release) connection.release();
    }
});

// Update or Insert Supplier
router.post("/", async (req, res) => {
    const data = req.body;
    let { supplierCode, supplierName, contactNumber, email, address, isActive, paymentType, creditLimit, creditPeriod } = data;

    if (!supplierCode || !supplierName) {
        return res.status(400).json({ success: false, message: "Supplier Name and Code are required." });
    }

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const _supplier_code = supplierCode.toUpperCase();
        const _name = supplierName.toUpperCase();
        const _contact = (contactNumber || '').toUpperCase();
        const _email = (email || '').toUpperCase();
        const _address = (address || '').toUpperCase();
        const _status = isActive === false ? 'INACTIVE' : 'ACTIVE';
        const _paymentType = paymentType || 'Cash';
        const _credit_limit = parseFloat(creditLimit) || 0;
        const _credit_period = parseInt(creditPeriod) || 0;

        const query = `
            INSERT INTO suppliers 
            (supplier_code, supplier_name, contact_number, email, address, status, default_payment_type, credit_limit, credit_period)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            supplier_name = VALUES(supplier_name),
            contact_number = VALUES(contact_number),
            email = VALUES(email),
            address = VALUES(address),
            status = VALUES(status),
            default_payment_type = VALUES(default_payment_type),
            credit_limit = VALUES(credit_limit),
            credit_period = VALUES(credit_period)
        `;

        await connection.query(query, [_supplier_code, _name, _contact, _email, _address, _status, _paymentType, _credit_limit, _credit_period]);
        res.json({ success: true, message: "Supplier details securely updated." });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Database Error", error: e.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// Heavy-duty Supplier Inquiry Ledger
router.get("/:id/inquiry", async (req, res) => {
    const supplierId = req.params.id;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;

    try {
        const [invoices] = await connection.query(`
            SELECT id, invoice_number, invoice_date as date, grand_total, amount_paid, (grand_total - amount_paid) as balance, status 
            FROM purchase_invoices 
            WHERE supplier_id = ? 
            ORDER BY invoice_date DESC
        `, [supplierId]);

        const [returns] = await connection.query(`
            SELECT id, return_number, return_type, total_amount, return_date, status 
            FROM purchase_returns 
            WHERE supplier_id = ? 
            ORDER BY return_date DESC
        `, [supplierId]);

        const [settlements] = await connection.query(`
            SELECT s.id, s.amount_applied, s.created_at, r.return_number, i.invoice_number 
            FROM supplier_settlements s
            LEFT JOIN purchase_returns r ON s.credit_note_id = r.id
            LEFT JOIN purchase_invoices i ON s.mapped_invoice_id = i.id
            WHERE s.supplier_id = ? 
            ORDER BY s.created_at DESC
        `, [supplierId]);

        const [payments] = await connection.query(`
            SELECT id, amount, payment_method, cheque_number, cheque_bank, cheque_date, status, created_at
            FROM supplier_payments
            WHERE supplier_id = ?
            ORDER BY created_at DESC
        `, [supplierId]);

        let activeBalance = 0;
        invoices.forEach(inv => {
            if (inv.status === 'completed') {
                activeBalance += Math.max(0, parseFloat(inv.balance));
            }
        });

        let pendingCheques = 0;
        payments.forEach(pay => {
            if (pay.payment_method === 'CHEQUE' && pay.status === 'PENDING') {
                pendingCheques += parseFloat(pay.amount);
            }
        });

        res.json({
            success: true,
            ledger: {
                invoices,
                returns,
                settlements,
                payments,
                metrics: {
                    activeBalance,
                    pendingCheques
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// Process Supplier Payment (FIFO Distribution)
router.post("/pay", async (req, res) => {
    const { supplierId, amount, paymentMethod, chequeNumber, chequeBank, chequeDate } = req.body;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;

    try {
        await connection.beginTransaction();

        let initialStatus = paymentMethod === 'CHEQUE' ? 'PENDING' : 'COMPLETED';

        // 1. Insert Payment Log
        const [payRes] = await connection.query(`
            INSERT INTO supplier_payments 
            (supplier_id, amount, payment_method, cheque_number, cheque_bank, cheque_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [supplierId, amount, paymentMethod, chequeNumber || null, chequeBank || null, chequeDate || null, initialStatus]);

        // 2. FIFO Application to Invoices (Only if NOT a pending cheque)
        // If it's a cheque, balances aren't deducted until it clears.
        if (initialStatus === 'COMPLETED') {
            const [invoices] = await connection.query(`
                SELECT id, (grand_total - amount_paid) as balance 
                FROM purchase_invoices 
                WHERE supplier_id = ? AND status = 'POSTED' AND (grand_total - amount_paid) > 0
                ORDER BY date ASC
            `, [supplierId]);

            let remainingPool = parseFloat(amount);

            for (const inv of invoices) {
                if (remainingPool <= 0) break;

                const bal = parseFloat(inv.balance);
                const application = Math.min(bal, remainingPool);

                await connection.query(`
                    UPDATE purchase_invoices 
                    SET amount_paid = amount_paid + ? 
                    WHERE id = ?
                `, [application, inv.id]);

                remainingPool -= application;
            }
        }

        await connection.commit();
        res.json({ success: true, message: `Payment of LKR ${amount} successfully logged.` });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error", error: err.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// GET /api/suppliers/cheques
router.get("/cheques", async (req, res) => {
    const statusFilter = req.query.status || 'PENDING';
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [cheques] = await connection.query(`
            SELECT cp.*, s.supplier_name, s.supplier_code
            FROM supplier_payments cp
            LEFT JOIN suppliers s ON cp.supplier_id = s.id
            WHERE cp.payment_method = 'CHEQUE' AND cp.status = ?
            ORDER BY cp.created_at DESC
        `, [statusFilter]);
        res.json({ success: true, cheques });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection.release) connection.release();
    }
});

// PUT /api/suppliers/cheques/:id/status
router.put("/cheques/:id/status", async (req, res) => {
    const paymentId = req.params.id;
    const { newStatus } = req.body;

    if (!['CLEARED', 'BOUNCED'].includes(newStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status state." });
    }

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        await connection.beginTransaction();

        const [pRows] = await connection.query("SELECT * FROM supplier_payments WHERE id = ? AND payment_method = 'CHEQUE' FOR UPDATE", [paymentId]);
        if (pRows.length === 0) throw new Error("Cheque not found");
        const payment = pRows[0];

        if (payment.status !== 'PENDING') {
            throw new Error(`Cheque is already marked as ${payment.status}. Cannot modify.`);
        }

        // If CLEARING -> Deduct from active invoices FIFO natively since it wasn't deducted upon payment issue!
        if (newStatus === 'CLEARED') {
            const [invoices] = await connection.query(`
                SELECT id, (grand_total - amount_paid) as balance 
                FROM purchase_invoices 
                WHERE supplier_id = ? AND status = 'completed' AND (grand_total - amount_paid) > 0
                ORDER BY date ASC
            `, [payment.supplier_id]);

            let remainingPool = parseFloat(payment.amount);

            for (const inv of invoices) {
                if (remainingPool <= 0) break;
                const bal = parseFloat(inv.balance);
                const application = Math.min(bal, remainingPool);

                await connection.query(`
                    UPDATE purchase_invoices 
                    SET amount_paid = amount_paid + ? 
                    WHERE id = ?
                `, [application, inv.id]);

                remainingPool -= application;
            }
        }

        await connection.query("UPDATE supplier_payments SET status = ? WHERE id = ?", [newStatus, paymentId]);

        await connection.commit();
        res.json({ success: true, message: `Supplier Cheque securely marked as ${newStatus}` });
    } catch (err) {
        await connection.rollback();
        console.error("Supplier Cheque Status Error:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection.release) connection.release();
    }
});

export default router;
