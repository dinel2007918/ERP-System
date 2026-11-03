import express from "express";
import promiseDb from "../dataBase.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
    let connection;
    try {
        connection = promiseDb.promise ? await promiseDb.promise().getConnection() : promiseDb;

        // --- DAILY TOP METRICS ---
        // 1. Daily Sales
        const [[dailySalesRet]] = await connection.query(`
            SELECT COALESCE(SUM(grand_total), 0) AS total 
            FROM sales_invoices 
            WHERE DATE(created_at) = CURDATE() AND status != 'CANCELED'
        `);
        const dailySales = parseFloat(dailySalesRet.total);

        // 2. Daily Purchases
        const [[dailyPurchasesRet]] = await connection.query(`
            SELECT COALESCE(SUM(grand_total), 0) AS total 
            FROM purchase_invoices 
            WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'
        `);
        const dailyPurchases = parseFloat(dailyPurchasesRet.total);

        // 3. Daily Payments Received
        const [[dailyPaymentsRet]] = await connection.query(`
            SELECT COALESCE(SUM(amount), 0) AS total 
            FROM customer_payments 
            WHERE DATE(created_at) = CURDATE()
        `);
        const dailyPayments = parseFloat(dailyPaymentsRet.total);

        // 4. Daily Profit (Sales items linked to item cost)
        const [[dailyProfitRet]] = await connection.query(`
            SELECT COALESCE(SUM(sii.line_total - (sii.quantity * i.cost)), 0) AS total 
            FROM sales_invoice_items sii 
            JOIN items i ON sii.item_code = i.item_code 
            JOIN sales_invoices si ON sii.invoice_id = si.id 
            WHERE DATE(si.created_at) = CURDATE() AND si.status != 'CANCELED'
        `);
        const dailyProfit = parseFloat(dailyProfitRet.total);

        // --- MONTHLY GRAPHICAL METRICS (LAST 12 MONTHS) ---
        // Generate an array of the last 12 months dynamically to ensure timeline continuity
        const monthsMap = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
            monthsMap[m] = {
                month: m,
                Sales: 0,
                Cash: 0,
                Credit: 0,
                Profit: 0
            };
        }

        // Fetch Monthly Sales
        const [monthlySales] = await connection.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(grand_total) AS total 
            FROM sales_invoices 
            WHERE created_at >= DATE_SUB(LAST_DAY(CURDATE()), INTERVAL 12 MONTH) AND status != 'CANCELED' 
            GROUP BY month
        `);
        monthlySales.forEach(row => {
            if (monthsMap[row.month]) monthsMap[row.month].Sales = parseFloat(row.total);
        });

        // Fetch Monthly Cash Received (from Customer Payments table ideally)
        // Wait, the client graph differentiates Sales Breakdown into 'Cash' vs 'Credit' inside the Sales timeline natively.
        // Let's proxy cash vs credit from the payment_method defined directly on the Sales Invoice table!
        const [monthlyMethodSales] = await connection.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, payment_method, SUM(grand_total) AS total 
            FROM sales_invoices 
            WHERE created_at >= DATE_SUB(LAST_DAY(CURDATE()), INTERVAL 12 MONTH) AND status != 'CANCELED' 
            GROUP BY month, payment_method
        `);
        monthlyMethodSales.forEach(row => {
            if (monthsMap[row.month]) {
                if ((row.payment_method || "Cash").toLowerCase().includes("cash")) {
                    monthsMap[row.month].Cash += parseFloat(row.total);
                } else {
                    monthsMap[row.month].Credit += parseFloat(row.total);
                }
            }
        });

        // Fetch Monthly Profit
        const [monthlyProfit] = await connection.query(`
            SELECT DATE_FORMAT(si.created_at, '%Y-%m') AS month, SUM(sii.line_total - (sii.quantity * i.cost)) AS total 
            FROM sales_invoice_items sii 
            JOIN items i ON sii.item_code = i.item_code 
            JOIN sales_invoices si ON sii.invoice_id = si.id 
            WHERE si.created_at >= DATE_SUB(LAST_DAY(CURDATE()), INTERVAL 12 MONTH) AND si.status != 'CANCELED' 
            GROUP BY month
        `);
        monthlyProfit.forEach(row => {
            if (monthsMap[row.month]) monthsMap[row.month].Profit = parseFloat(row.total);
        });

        // Convert the structural map strictly back to sequential array
        const graphData = Object.values(monthsMap);

        res.json({
            success: true,
            topMetrics: {
                dailySales,
                dailyPurchases,
                dailyPayments,
                dailyProfit
            },
            graphData
        });

    } catch (err) {
        console.error("Dashboard API Error:", err);
        res.status(500).json({ success: false, message: "Internal server error gathering metrics." });
    } finally {
        if (connection && connection.release) connection.release();
    }
});

export default router;
