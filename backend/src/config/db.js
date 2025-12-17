import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "crispydosa",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// sanity ping
(async () => {
  try {
    const [r] = await pool.query("SELECT DATABASE() AS db");
    console.log("MySQL Connected (promise pool):", r[0]?.db);
  } catch (e) {
    console.error("DB connection FAILED:", e.message);
  }
})();

export default pool;