import db from "../../config/db.js";

function generateOrderNumber(restaurantName = "") {
  let cleaned = restaurantName.toLowerCase().replace("crispy dosa", "").trim();
  let firstLetter = cleaned[0] ? cleaned[0].toUpperCase() : "X";

  const now = new Date();
  const DD = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return `CD${firstLetter}${DD}${MM}${HH}${mm}`;
}

export const createOrder = async (req, res) => {
  try {
    const {
      user_id,
      customer_id,
      payment_mode,
      razorpay_payment_requestid,
      instore,
      allergy_note,
      car_color,
      reg_number,
      owner_name,
      mobile_number,
      items
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 0, message: "Items are required" });
    }

    const [restData] = await db.query(
      "SELECT restaurant_name FROM restaurant_details WHERE user_id = ? LIMIT 1",
      [user_id]
    );

    const restaurantName = restData[0]?.restaurant_name || "";
    const order_number = generateOrderNumber(restaurantName);

    for (const item of items) {
      const {
        product_id,
        product_name,
        price,
        discount_amount,
        vat,
        quantity
      } = item;

      const totalPrice = Number(price) * Number(quantity);
      const totalDiscount = Number(discount_amount || 0);
      const totalVat = Number(vat || 0);
      const grand_total = totalPrice - totalDiscount + totalVat;

      const sql = `
        INSERT INTO orders 
        (user_id, order_number, customer_id, product_id, payment_mode, razorpay_payment_requestid,
         product_name, price, discount_amount, vat, quantity, grand_total, order_status,
         delivery_estimate_time, car_color, reg_number, owner_name, mobile_number, instore, allergy_note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        user_id,
        order_number,
        customer_id,
        product_id,
        payment_mode,
        razorpay_payment_requestid || null,
        product_name,
        price,
        discount_amount || 0,
        vat || 0,
        quantity,
        grand_total,
        car_color || null,
        reg_number || null,
        owner_name || null,
        mobile_number || null,
        instore || 0,
        allergy_note || null
      ];

      await db.query(sql, values);
    }

    await db.query("DELETE FROM cart WHERE customer_id = ?", [customer_id]);

    return res.status(200).json({
      status: 1,
      message: "Order Placed Successfully",
      order_number
    });

  } catch (error) {
    return res.status(500).json({
      status: 0,
      message: "Server Error",
      error: error.message
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM orders ORDER BY id DESC`
    );

    const hidden = [
      "id",
      "user_id",
      "customer_id",
      "product_id",
      "razorpay_payment_requestid",
      "created_at",
      "updated_at"
    ];

    const cleaned = rows.map(row => {
      const obj = {};
      for (const key in row) {
        if (!hidden.includes(key)) obj[key] = row[key];
      }
      return obj;
    });

    return res.status(200).json({
      status: 1,
      message: "Orders fetched successfully",
      orders: cleaned
    });

  } catch (error) {
    return res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message
    });
  }
};
