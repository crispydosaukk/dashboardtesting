import express from "express";
import cors from "cors";
import webRoutes from "./routes/web.js";

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images publicly
app.use("/uploads", express.static("public/uploads"));

// Serve your routes under /api
app.use("/api", webRoutes);

export default app;
