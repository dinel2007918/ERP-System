import db from "./dataBase.js";
import fs from "fs";

const promiseDb = db.promise();

async function checkDatabase() {
    try {
        const [tables] = await promiseDb.query("SHOW TABLES");
        const summary = {};
        for (const t of tables) {
            const tableName = Object.values(t)[0];
            try {
                const [rows] = await promiseDb.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                summary[tableName] = rows[0].count;
            } catch (err) {
                summary[tableName] = "Error: " + err.message;
            }
        }
        fs.writeFileSync("db_status.json", JSON.stringify({ status: "OK", tables: summary }, null, 2));
        console.log("Wrote db_status.json successfully");
    } catch (err) {
        fs.writeFileSync("db_status.json", JSON.stringify({ status: "ERROR", error: err.message }, null, 2));
        console.error("Database query failed:", err);
    } finally {
        process.exit(0);
    }
}

checkDatabase();
