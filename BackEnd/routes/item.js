import express from "express";
import db from "../dataBase.js";
const router = express.Router();

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
    `;

    const values = [
        Group_code, Type_code, brand, Item_Code, Product_ID, Description, Cost, sale_price, first_discount, second_discount, third_discount
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Database error while inserting item:", err);
            // Handling duplicate key errors (Concurrency protection)
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: "Item Code already taken by another user during submission. The form will reset the code, please try saving again."
                });
            }
            return res.status(500).json({ success: false, message: "Database error", detail: err.message });
        }

        res.json({ success: true, message: "Item securely added to database" });
    });
});

export default router;