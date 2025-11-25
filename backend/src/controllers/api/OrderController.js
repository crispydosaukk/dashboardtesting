import db from "../../config/db.js";

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

    const order_number = "ORD" + Date.now();

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

    return res.status(200).json({
      status: 1,
      message: "Order Placed Successfully",
      order_number: order_number
    });

  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server Error",
      error: error.message
    });
  }
};
