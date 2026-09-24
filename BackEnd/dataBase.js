import mysql from "mysql2";
const db =mysql.createPool({
    host:'localhost',
    user:'dinel',
    password:'dinel@2007918',
    database:'erp_system'
});
export default db;
