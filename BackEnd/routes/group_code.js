import express from "express";
import db from "../dataBase.js";

const router = express.Router();

router.get("/", (req, res) => {
    console.log(req.body);
});

router.post("/", (req, res) => {
    console.log("Received data:", req.body);
    const { groupCode, groupName, active } = req.body;
    const status = active ? 'active' : 'inactive';

    const sql = `
        INSERT INTO group_codes (group_code, group_name, STATUS)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [groupCode, groupName, status],
        (err, result) => {
            if (err) {
                console.log("Database error:", err.message);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        success: false,
                        message: "A Group with this code or name already exists!"
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: "Failed to save group code"
                });
            }

            console.log("Group saved! New ID:", result.insertId);
            res.json({
                success: true,
                message: "Group code data received successfully!",
                id: result.insertId
            });
        }
    );
});

export default router;