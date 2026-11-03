import db from "./dataBase.js";

const promiseDb = db.promise();
async function run() {
    try {
        await promiseDb.query("UPDATE roles SET role_name='Admin' WHERE id=1");
        await promiseDb.query("UPDATE roles SET role_name='SalesRep' WHERE id=2");
        await promiseDb.query("INSERT IGNORE INTO roles (id, role_name, permissions) VALUES (3, 'Manager', '[]')");

        try {
            await promiseDb.query("ALTER TABLE users ADD COLUMN dashboard_access TINYINT(1) DEFAULT 0");
        } catch (e) { console.log(e.message); }

        try {
            await promiseDb.query("ALTER TABLE users ADD COLUMN invoice_post_access TINYINT(1) DEFAULT 0");
        } catch (e) { console.log(e.message); }

        console.log("SUCCESS");
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
run();
