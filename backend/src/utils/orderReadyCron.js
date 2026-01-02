import db from "../config/db.js";
import { sendNotification } from "./sendNotification.js";

export async function checkReadyOrders() {
  const [rows] = await db.query(`
    SELECT DISTINCT order_number, customer_id
    FROM orders
    WHERE order_status = 1
      AND delivery_estimate_time IS NOT NULL
      AND delivery_estimate_time <= NOW()
  `);

  for (const row of rows) {
    // mark READY
    await db.query(
      `UPDATE orders SET order_status = 3 WHERE order_number = ?`,
      [row.order_number]
    );

    // notify customer
    await sendNotification({
      userType: "customer",
      userId: row.customer_id,
      title: "🍽️ Order Ready",
      body: `Your order ${row.order_number} is ready`,
      data: {
        order_number: row.order_number,
        type: "ORDER_READY"
      }
    });
  }
}
