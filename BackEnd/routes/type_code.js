import express from "express";
import db from "../dataBase.js";

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        message: "type_code route is working"
    });
});

router.post("/", (req, res) => {
    console.log("Received data:", req.body);
    const { typeCode, typeName, active } = req.body;
    const status = active ? 'active' : 'inactive';

    const sql = `
        INSERT INTO type_codes (type_code, type_name, status)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [typeCode, typeName, status],
        (err, result) => {
            if (err) {
                console.log("Database error:", err.message);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        success: false,
                        message: "A Type with this code or name already exists!"
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: "Failed to save type code"
                });
            }

            console.log("Type saved! New ID:", result.insertId);
            res.json({
                success: true,
                message: "Type code data received successfully!",
                id: result.insertId
            });
        }
    );
});

export default router;