import express from "express";
import db from "../dataBase.js";
const router = express.Router();
const promiseDb = db.promise();

router.get("/search", (req, res) => {
    const q = req.query.q || '';
    const searchParam = `%${q}%`;
    db.query("SELECT * FROM customers WHERE customer_name LIKE ? OR customer_code LIKE ? LIMIT 30", [searchParam, searchParam], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json(results);
    });
});

router.get("/all-names", (req, res) => {
    db.query("SELECT customer_name FROM customers WHERE is_active = 1", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        return res.json({ names: results.map(r => r.customer_name) });
    });
});

router.get("/:customerCode", (req, res) => {
    const code = req.params.customerCode.toUpperCase();
    const query = "SELECT * FROM customers WHERE customer_code = ?";

    db.query(query, [code], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", detail: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, message: "Customer not found" });

        res.json({ success: true, customer: results[0] });
    });
});
router.get("/recall-by-name/:name", (req, res) => {
    const nameStr = req.params.name;
    const query = "SELECT * FROM customers WHERE customer_name = ?";

    db.query(query, [nameStr], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", detail: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, message: "Customer not found" });

        res.json({ success: true, customer: results[0] });
    });
});

router.post("/next-customer-code", (req, res) => {
    let { name } = req.body;
    if (!name || name.trim() === '') return res.json({ customerCode: "" });

    let prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    if (prefix.length === 0) {
        prefix = "CUS";
    } else if (prefix.length < 3) {
        prefix = (prefix + "XXX").substring(0, 3);
    }

    const query = `
        SELECT MAX(CAST(SUBSTRING(customer_code, 4) AS UNSIGNED)) as maxSerial
        FROM customers
        WHERE customer_code LIKE ?
    `;

    db.query(query, [`${prefix}%`], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
        }

        const maxSerial = results[0].maxSerial;
        const nextSerial = maxSerial ? maxSerial + 1 : 1;

        const customerCode = `${prefix}${String(nextSerial).padStart(3, '0')}`;
        return res.json({ customerCode });
    });
});

router.post("/", (req, res) => {
    console.log("Customer data", req.body);
    const data = req.body;

    // Auto-uppercase strings before insertion (for safety, though frontend also does it)
    const customer_code = (data.customerCode || '').toUpperCase();
    const customer_name = (data.customerName || '').toUpperCase();
    const contact_number = (data.contactNumber || '').toUpperCase();
    const email = (data.email || '').toUpperCase();
    const address = (data.address || '').toUpperCase();
    const discount_tier = data.discountTier || 'None';
    const is_active = data.isActive === false ? false : true;
    const default_payment_type = data.paymentType || 'Cash';
    const credit_limit = parseFloat(data.creditLimit) || 0;
    const credit_period = parseInt(data.creditPeriod) || 0;

    const query = `
        INSERT INTO customers 
        (customer_code, customer_name, contact_number, email, address, discount_tier, is_active, default_payment_type, credit_limit, credit_period)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        contact_number = VALUES(contact_number),
        email = VALUES(email),
        address = VALUES(address),
        discount_tier = VALUES(discount_tier),
        is_active = VALUES(is_active),
        default_payment_type = VALUES(default_payment_type),
        credit_limit = VALUES(credit_limit),
        credit_period = VALUES(credit_period)
    `;

    const values = [
        customer_code, customer_name, contact_number, email, address, discount_tier, is_active, default_payment_type, credit_limit, credit_period
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database error while inserting customer:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: "Customer Code already taken. Please use a unique code."
                });
            }
            return res.status(500).json({ success: false, message: "Database error", detail: err.message });
        }
        res.json({ success: true, message: "Customer added to database perfectly!" });
    });
});

// Heavy-duty Ledger Endpoint
router.get("/:id/inquiry", async (req, res) => {
    const customerId = req.params.id;
    const connection = await promiseDb.getConnection();
    try {
        const [invoices] = await connection.query(`
            SELECT id, invoice_number, invoice_date as date, grand_total, amount_paid, (grand_total - amount_paid) as balance, status 
            FROM sales_invoices 
            WHERE customer_id = ? 
            ORDER BY invoice_date DESC
        `, [customerId]);

        const [returns] = await connection.query(`
            SELECT id, return_number, return_type, total_amount, return_date, status 
            FROM sales_returns 
            WHERE customer_id = ? 
            ORDER BY return_date DESC
        `, [customerId]);

        const [settlements] = await connection.query(`
            SELECT s.id, s.amount_applied, s.created_at, r.return_number, i.invoice_number 
            FROM settlements s
            LEFT JOIN sales_returns r ON s.credit_note_id = r.id
            LEFT JOIN sales_invoices i ON s.mapped_invoice_id = i.id
            WHERE s.customer_id = ? 
            ORDER BY s.created_at DESC
        `, [customerId]);

        const [cheques] = await connection.query(`
            SELECT id, cheque_number, cheque_bank, cheque_date, amount, status, created_at 
            FROM customer_payments 
            WHERE customer_id = ? AND payment_method = 'CHEQUE'
            ORDER BY created_at DESC
        `, [customerId]);

        let activeBalance = 0;
        invoices.forEach(inv => {
            if (inv.status === 'POSTED') {
                activeBalance += Math.max(0, parseFloat(inv.balance));
            }
        });

        let pendingCheques = 0;
        cheques.forEach(chk => {
            if (chk.status === 'PENDING') {
                pendingCheques += parseFloat(chk.amount);
            }
        });

        res.json({
            success: true,
            ledger: {
                invoices,
                returns,
                settlements,
                cheques,
                metrics: {
                    activeBalance,
                    pendingCheques
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});

export default router;
