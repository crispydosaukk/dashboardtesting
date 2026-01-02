// backend/src/server.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";
import cron from "node-cron";
import { checkReadyOrders } from "./utils/orderReadyCron.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend/.env (one level above src)
dotenv.config({ path: path.join(__dirname, "../.env") });

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

cron.schedule("* * * * *", async () => {
  await checkReadyOrders();
});