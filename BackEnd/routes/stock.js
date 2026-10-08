import express from "express";
import db from "../dataBase.js";
import util from "util";

const router = express.Router();
const queryAsync = util.promisify(db.query).bind(db);

router.post("/open", async (req, res) => {
    try {
        const { itemCode, quantity, reason } = req.body;

        if (!itemCode || !quantity) {
            return res.status(400).json({ success: false, message: "Item Code and Quantity are required" });
        }

        const qtyToAdd = parseFloat(quantity);
        if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
            return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
        }

        // 1. Fetch current quantity
        const items = await queryAsync("SELECT stock_quantity FROM items WHERE Item_Code = ?", [itemCode]);
        if (items.length === 0) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        const currentQty = parseFloat(items[0].stock_quantity) || 0;
        const newQty = currentQty + qtyToAdd;

        // 2. Update Items table
        await queryAsync("UPDATE items SET stock_quantity = ? WHERE Item_Code = ?", [newQty, itemCode]);

        // 3. Log into stock_movements
        await queryAsync(`
            INSERT INTO stock_movements 
            (item_code, movement_type, quantity_change, quantity_after, reason, movement_date)
            VALUES (?, 'opening_stock', ?, ?, ?, NOW())
        `, [itemCode, qtyToAdd, newQty, reason || "Opening Balance/Adjustment"]);

        res.json({ success: true, message: "Opening stock added successfully!", newQuantity: newQty });

    } catch (err) {
        console.error("Open stock error: ", err);
        res.status(500).json({ success: false, message: "Database error", detail: err.message });
    }
});

export default router;
