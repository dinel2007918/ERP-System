import db from "./dataBase.js";

const promiseDb = db.promise();

async function run() {
    try {
        const [columns] = await promiseDb.query("SHOW COLUMNS FROM sales_invoices LIKE 'rejection_reason'");
        if (columns.length === 0) {
            await promiseDb.query("ALTER TABLE sales_invoices ADD COLUMN rejection_reason TEXT NULL");
        }
        console.log("Pending invoice rejection reason is ready.");
    } catch (error) {
        console.error("Phase 9 database upgrade failed:", error.message);
        process.exitCode = 1;
    } finally {
        await promiseDb.end();
    }
}

run();