import express from 'express';
import promiseDb from '../dataBase.js';

const router = express.Router();

// Get all purchase invoices for management dashboard
router.get("/management", async (req, res) => {
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [invoices] = await connection.query(`
            SELECT pi.id, pi.invoice_number, pi.invoice_date as date, pi.grand_total, pi.status, s.supplier_name 
            FROM purchase_invoices pi
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            ORDER BY pi.invoice_date DESC
            LIMIT 100
        `);
        res.json(invoices);
    } catch (e) {
        console.error("Management fetch error:", e);
        res.status(500).json([]);
    } finally {
        if (connection.release) connection.release();
    }
});

// Search suppliers
router.get("/suppliers/search", async (req, res) => {
    const query = req.query.q || '';
    if (query.trim().length < 2) return res.json([]);
    const searchTerm = `%${query}%`;
    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        const [results] = await connection.query(`
            SELECT *, supplier_name as name FROM suppliers 
            WHERE supplier_name LIKE ? OR supplier_code LIKE ?
            LIMIT 10
        `, [searchTerm, searchTerm]);
        res.json(results);
    } catch (e) {
        console.error("Error searching suppliers:", e);
        res.status(500).json([]);
    } finally {
        if (connection.release) connection.release();
    }
});

// Create Purchase Invoice (and Overwrite Item Global Costs)
router.post("/", async (req, res) => {
    console.log("==> PURCHASE INVOICE PAYLOAD RECEIVED:");
    console.log(JSON.stringify(req.body, null, 2));
    const { supplierData, invoiceNumber, invoiceDate, items } = req.body;

    const connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;
    try {
        await connection.beginTransaction();

        // 1. Resolve Supplier
        let supplierId = supplierData.id;
        if (!supplierId) {
            return res.status(400).json({ success: false, message: "CRITICAL: You must explicitly select an existing Supplier. Auto-creation of unregistered suppliers is disabled." });
        }

        // 2. Calculate Totals
        let subtotal = 0;
        let grandTotal = 0;
        items.forEach(item => {
            const lineTotal = parseFloat(item.quantity) * parseFloat(item.newCost || item.oldCost);
            subtotal += lineTotal;
        });
        grandTotal = subtotal; // Assuming no separate global discount yet

        // 3. Create Invoice
        const [invRes] = await connection.query(
            `INSERT INTO purchase_invoices (invoice_number, supplier_id, date, subtotal, grand_total, status)
             VALUES (?, ?, ?, ?, ?, 'completed')`,
            [invoiceNumber, supplierId, invoiceDate || new Date(), subtotal, grandTotal]
        );
        const invoiceId = invRes.insertId;

        // 4. Insert Items AND overwrite master items Pricing Engine
        for (const it of items) {
            const qty = parseFloat(it.quantity);
            const nCost = parseFloat(it.newCost || 0);
            const nSalePrice = parseFloat(it.newSalePrice || 0);
            const d1 = parseFloat(it.discount1 || 0);
            const d2 = parseFloat(it.discount2 || 0);
            const d3 = parseFloat(it.discount3 || 0);
            const lineTotal = qty * nCost;

            // Log purchase item line
            await connection.query(
                `INSERT INTO purchase_invoice_items 
                 (invoice_id, item_code, quantity, old_cost, new_cost, old_sale_price, new_sale_price, discount_1, discount_2, discount_3, line_total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoiceId, it.itemCode, qty, parseFloat(it.oldCost || 0), nCost, parseFloat(it.oldSalePrice || 0), nSalePrice, d1, d2, d3, lineTotal]
            );

            // GLOBAL PRICING & STOCK OVERWRITE!
            await connection.query(
                `UPDATE items SET 
                Cost = ?, 
                sale_price = ?, 
                1st_discount = ?, 
                2st_discount = ?, 
                3st_discount = ?,
                stock_quantity = COALESCE(stock_quantity, 0) + ?
                WHERE Item_Code = ?`,
                [nCost, nSalePrice, d1, d2, d3, qty, it.itemCode]
            );

            // Fetch the freshly updated stock value
            const [[{ stock_quantity: newStockBalance }]] = await connection.query(
                `SELECT stock_quantity FROM items WHERE Item_Code = ?`, [it.itemCode]
            );

            // Add stock_movements log securely mapping native phase 1 schema constraints
            await connection.query(
                `INSERT INTO stock_movements (item_code, movement_type, quantity_change, quantity_after, reason, reference_id) 
                 VALUES (?, 'purchase', ?, ?, 'PURCHASE_INVOICE', ?)`,
                [it.itemCode, qty, newStockBalance, invoiceNumber]
            );
        }

        await connection.commit();
        res.json({ success: true, message: "Purchase Invoice successfully posted! Master Pricing Overwritten." });
    } catch (e) {
        if (connection.rollback) await connection.rollback();
        console.error("==> Purchase Invoice Crash Details:", e);
        if (e.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: "Invoice number already exists!" });
        } else {
            res.status(500).json({ success: false, message: "Database Error", error: e.message });
        }
    } finally {
        if (connection.release) connection.release();
    }
});

export default router;
