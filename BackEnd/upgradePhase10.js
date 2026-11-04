import db from "./dataBase.js";

const promiseDb = db.promise();

async function ensureColumn(name, definition) {
    const [columns] = await promiseDb.query("SHOW COLUMNS FROM sales_invoices LIKE ?", [name]);
    if (columns.length === 0) {
        await promiseDb.query(`ALTER TABLE sales_invoices ADD COLUMN ${name} ${definition}`);
    }
}

async function run() {
    try {
        await ensureColumn("shipping_method", "VARCHAR(80) NULL");
        await ensureColumn("courier_name", "VARCHAR(120) NULL");
        await ensureColumn("shipping_status", "VARCHAR(20) NULL");
        await promiseDb.query("UPDATE sales_invoices SET shipping_status = 'TO_SHIP' WHERE status = 'POSTED' AND shipping_status IS NULL");
        console.log("Invoice shipping fields are ready.");
    } catch (error) {
        console.error("Phase 10 database upgrade failed:", error.message);
        process.exitCode = 1;
    } finally {
        await promiseDb.end();
    }
}

run();