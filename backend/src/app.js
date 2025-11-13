import express from "express";
import cors from "cors";
import webRoutes from "./routes/web.js";
import apiRoutes from "./routes/api.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("public/uploads"));

// Dashboard routes
app.use("/api", webRoutes);

// Mobile app routes
app.use("/mobile", apiRoutes);

export default app;
