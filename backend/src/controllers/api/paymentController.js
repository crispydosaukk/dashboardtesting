import db from "../../config/db.js";

export const getPaymentHistory = async (req, res) => {
  try {
    const customerId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
         order_no,
         payment_request_id,
         amount,
         payment_status,
         created_at
       FROM order_payment_history
       WHERE order_no IN (
         SELECT DISTINCT order_number
         FROM orders
         WHERE customer_id = ?
       )
       ORDER BY created_at DESC`,
      [customerId]
    );

    return res.json({
      status: 1,
      data: rows,
    });
  } catch (err) {
    console.error("Payment history error:", err);
    return res.status(500).json({
      status: 0,
      message: "Server error",
    });
  }
};
