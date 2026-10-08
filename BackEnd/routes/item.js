import express from "express";
import db from "../dataBase.js";
import util from "util";
const router = express.Router();
const queryAsync = util.promisify(db.query).bind(db);


// Search items (for autocomplete in Item Inquiry)
router.get("/search", async (req, res) => {
    try {
        const q = req.query.q || '';
        const searchParam = `%${q}%`;
        const query = `
            SELECT Item_Code, Product_ID, Description, Cost, sale_price, stock_quantity, 
            1st_discount, 2st_discount, 3st_discount 
            FROM items 
            WHERE Item_Code LIKE ? OR Product_ID LIKE ? OR Description LIKE ?
            LIMIT 30
        `;
        const results = await queryAsync(query, [searchParam, searchParam, searchParam]);
        res.json({ items: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Get comprehensive item report
router.get("/report/:itemCode", async (req, res) => {
    try {
        const itemCode = req.params.itemCode;

        // 1. Fetch item details
        const items = await queryAsync("SELECT * FROM items WHERE Item_Code = ?", [itemCode]);
        if (items.length === 0) return res.status(404).json({ error: "Item not found" });
        const item = items[0];

        // 2. Fetch Aggregations (Sales, Purchases, Returns)
        const [salesAgg] = await queryAsync("SELECT SUM(quantity) as total_qty, SUM(line_total) as total_val FROM sales_invoice_items WHERE item_code = ?", [itemCode]);
        const [purchAgg] = await queryAsync("SELECT SUM(quantity) as total_qty, SUM(line_total) as total_val FROM purchase_invoice_items WHERE item_code = ?", [itemCode]);
        const [sRetAgg] = await queryAsync("SELECT SUM(quantity) as total_qty, SUM(line_total) as total_val FROM sales_return_items WHERE item_code = ?", [itemCode]);
        // Note: purchase_returns not implemented in Phase 1 schema based on my script, we'll return 0 for now.

        // 3. Last stock update
        const lastStock = await queryAsync("SELECT movement_date FROM stock_movements WHERE item_code = ? ORDER BY movement_date DESC LIMIT 1", [itemCode]);
        const last_update = lastStock.length > 0 ? lastStock[0].movement_date : null;

        // 4. Detailed History (Invoices only as requested: Purchases on top, then Sales, sorted by date)
        const history = await queryAsync(`
            SELECT 'purchase' as movement_type, pii.quantity as quantity_change, pi.invoice_number as reference_id, s.supplier_name as entity_name, pii.unit_cost as price, pi.invoice_date as movement_date 
            FROM purchase_invoice_items pii
            JOIN purchase_invoices pi ON pii.invoice_id = pi.id
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            WHERE pii.item_code = ?
            UNION ALL
            SELECT 'sales' as movement_type, sii.quantity as quantity_change, si.invoice_number as reference_id, c.customer_name as entity_name, sii.unit_price as price, si.invoice_date as movement_date 
            FROM sales_invoice_items sii
            JOIN sales_invoices si ON sii.invoice_id = si.id
            LEFT JOIN customers c ON si.customer_id = c.id
            WHERE sii.item_code = ?
            ORDER BY movement_type ASC, movement_date DESC
        `, [itemCode, itemCode]);

        res.json({
            success: true,
            item,
            summary: {
                total_sold_qty: salesAgg.total_qty || 0,
                total_sold_val: salesAgg.total_val || 0,
                total_purchased_qty: purchAgg.total_qty || 0,
                total_purchased_val: purchAgg.total_val || 0,
                total_sales_return_qty: sRetAgg.total_qty || 0,
                total_sales_return_val: sRetAgg.total_val || 0,
                total_purchase_return_qty: 0,
                total_purchase_return_val: 0,
                last_stock_update: last_update
            },
            history
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error", detail: err.message });
    }
});

router.get("/create-table", (req, res) => {
    const query = `
    CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_code VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(100) NOT NULL,
        contact_number VARCHAR(15),
        email VARCHAR(100),
        address VARCHAR(255),
        discount_tier VARCHAR(20) DEFAULT 'None',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    db.query(query, (err) => {
        if (err) return res.send(err.message);
        res.send("Table created!");
    });
});

// Recall item by Product ID
router.get("/recall/:productId", (req, res) => {
    const product_id = req.params.productId;
    const query = "SELECT * FROM items WHERE Product_ID = ?";

    db.query(query, [product_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error", detail: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, message: "Item not found" });

        res.json({ success: true, item: results[0] });
    });
});

// Generate the next sequential item code for a given group, type, and brand combo
router.post("/next-item-code", (req, res) => {
    const { groupCode, typeCode, brandCode } = req.body;

    if (!groupCode || !typeCode || !brandCode) {
        return res.status(400).json({ error: "Missing required groupCode, typeCode, or brandCode" });
    }

    const baseCode = `${groupCode}${typeCode}${brandCode}`;
    const baseCodeLength = baseCode.length;

    // Find the highest serial for this base code using SUBSTRING
    const query = `
        SELECT MAX(CAST(SUBSTRING(Item_Code, ?) AS UNSIGNED)) as maxSerial
        FROM items
        WHERE Item_Code LIKE ?
    `;

    db.query(query, [baseCodeLength + 1, `${baseCode}%`], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while generating item code" });
        }

        const maxSerial = results[0].maxSerial;
        const nextSerial = maxSerial ? maxSerial + 1 : 1;

        // Ensure 3-character padding
        const itemCode = `${baseCode}${String(nextSerial).padStart(3, '0')}`;
        return res.json({ itemCode });
    });
});

// Save a new item
router.post("/", (req, res) => {
    console.log("data", req.body);

    // Fallback variable mapping to handle NewItem.tsx payload
    const data = req.body;
    const Group_code = (data.groupCode || '').toUpperCase();
    const Type_code = (data.typeCode || '').toUpperCase();
    const brand = (data.Brand || '').toUpperCase();
    const Item_Code = (data.itemCode || '').toUpperCase();
    const Product_ID = (data.productId || '').toUpperCase();
    const Description = (data.discription || data.Description || '').toUpperCase();
    const Cost = parseFloat(data.cost) || 0;
    const sale_price = parseFloat(data.salePrice) || 0;
    const first_discount = parseFloat(data.discount1) || 0;
    const second_discount = parseFloat(data.discount2) || 0;
    const third_discount = parseFloat(data.discount3) || 0;

    const query = `
        INSERT INTO items 
        (Group_code, Type_code, brand, Item_Code, Product_ID, Description, Cost, sale_price, 1st_discount, 2st_discount, 3st_discount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        Product_ID = VALUES(Product_ID),
        Description = VALUES(Description),
        Cost = VALUES(Cost),
        sale_price = VALUES(sale_price),
        1st_discount = VALUES(1st_discount),
        2st_discount = VALUES(2st_discount),
        3st_discount = VALUES(3st_discount)
    `;

    const values = [
        Group_code, Type_code, brand, Item_Code, Product_ID, Description, Cost, sale_price, first_discount, second_discount, third_discount
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database error while inserting item:", err);
            return res.status(500).json({ success: false, message: "Database error", detail: err.message });
        }

        res.json({ success: true, message: "Item securely added to database" });
    });
});

export default router;