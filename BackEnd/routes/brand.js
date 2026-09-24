import express from "express";
import db from "../dataBase.js";

const router = express.Router();

router.post("/", (req, res) => {

    console.log("Received data:", req.body);

    const { brandCode, brandName, active } = req.body;
    const status = active ? 'active' : 'inactive';

    const sql = `
        INSERT INTO brands (brand_code, brand_name, status)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [brandCode, brandName, status],
        (err, result) => {

            if (err) {
                console.log("Database error:", err.message);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        success: false,
                        message: "A Brand with this code or name already exists!"
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: "Failed to save brand"
                });
            }

            console.log("Brand saved!");
            console.log("New ID:", result.insertId);

            res.json({
                success: true,
                message: "Brand saved successfully!",
                id: result.insertId
            });
        }
    );

});

export default router;