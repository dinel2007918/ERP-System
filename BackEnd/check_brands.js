import db from "./dataBase.js";
db.query("SELECT * FROM brands", (err, res) => {
    if (err) console.error(err);
    else console.log("brands", res);
    process.exit();
});
