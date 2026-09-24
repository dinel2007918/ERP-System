import express from "express";
import cors from "cors";

import brandsRouter from "./routes/brand.js";
import group_codeRouter from "./routes/group_code.js";
import type_codeRouter from "./routes/type_code.js";
// ...one import per route file

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("api is running");
});
app.use("/api/brands", brandsRouter);
app.use("/api/type_code", type_codeRouter);
app.use("/api/group_code", group_codeRouter);
// ...one app.use per route file

app.listen(5005, () => console.log("Server running on http://localhost:5005"));