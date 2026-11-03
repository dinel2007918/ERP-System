import express from "express";
import cors from "cors";

import brandsRouter from "./routes/brand.js";
import group_codeRouter from "./routes/group_code.js";
import type_codeRouter from "./routes/type_code.js";
import itemRouter from "./routes/item.js";
import customerRouter from "./routes/customer.js";
import stockRouter from "./routes/stock.js";
import salesOrderRouter from "./routes/salesOrder.js";
import salesInvoiceRouter from "./routes/salesInvoice.js";
import salesReturnRouter from "./routes/salesReturn.js";
import paymentsRouter from "./routes/payments.js";
import purchaseInvoiceRouter from "./routes/purchaseInvoice.js";
import supplierRouter from "./routes/supplier.js";
import purchaseReturnRouter from "./routes/purchaseReturn.js";
import usersRouter from "./routes/users.js";
import dashboardRouter from "./routes/dashboard.js";

import { authenticateToken } from "./authMiddleware.js";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("api is running");
});

// Protect all /api endpoints natively (except login handled inside middleware logic)
app.use("/api", authenticateToken);

app.use("/api/users", usersRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/type_code", type_codeRouter);
app.use("/api/group_code", group_codeRouter);
app.use("/api/newItem", itemRouter);
app.use("/api/customers", customerRouter);
app.use("/api/stock", stockRouter);
app.use("/api/sales-orders", salesOrderRouter);
app.use("/api/sales-invoices", salesInvoiceRouter);
app.use("/api/sales-returns", salesReturnRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/purchase-invoices", purchaseInvoiceRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/purchase-returns", purchaseReturnRouter);
app.use("/api/dashboard", dashboardRouter);
// ...one app.use per route file

app.listen(5005, () => console.log("Server running on http://localhost:5005"));