// backend/src/app.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import webRoutes from "./routes/web.js";
import apiRoutes from "./routes/api.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../../public/uploads")));


// Simple test route – for https://crispydosa.info/backend/
app.get("/", (req, res) => {
  res.send("Crispydosa backend is running ✅");
});

// Dashboard routes (web)
app.use("/api", webRoutes);

// Mobile app routes
app.use("/mobile", apiRoutes);

export default app;
