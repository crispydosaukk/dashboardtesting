import db from "../../config/db.js";

// ----------------- ORDER NUMBER GENERATOR ----------------- //
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

// ----------------- CREATE ORDER (WITH WALLET) ----------------- //
export const createOrder = async (req, res) => {
  const conn = await db.getConnection();
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
      items,
      wallet_used, // ✅ from app
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 0, message: "Items are required" });
    }

    // ✅ compute order gross total (for wallet validation)
    const orderGrossTotal = items.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 0);
      const discount = Number(item.discount_amount || 0);
      const vat = Number(item.vat || 0);

      const totalPrice = price * qty;
      const gross = totalPrice - discount + vat; // gross per item
      return sum + gross;
    }, 0);

    const requestedWallet = Number(wallet_used || 0);
    if (requestedWallet < 0) {
      return res
        .status(400)
        .json({ status: 0, message: "Invalid wallet amount" });
    }

    // ✅ transaction start
    await conn.beginTransaction();

    // Fetch restaurant name
    const [rData] = await conn.query(
      "SELECT restaurant_name FROM restaurant_details WHERE user_id = ? LIMIT 1",
      [user_id]
    );

    let restaurantName = rData.length ? rData[0].restaurant_name : "";
    const order_number = generateOrderNumber(restaurantName);

    // ✅ Wallet deduction if used
    let walletDeducted = 0;

    if (requestedWallet > 0) {
      // lock wallet row
      const [[walletRow]] = await conn.query(
        "SELECT balance FROM customer_wallets WHERE customer_id = ? FOR UPDATE",
        [customer_id]
      );

      const currentBalance = Number(walletRow?.balance || 0);

      if (currentBalance <= 0) {
        await conn.rollback();
        return res
          .status(400)
          .json({ status: 0, message: "Wallet balance is 0" });
      }

      const maxUsable = Math.min(currentBalance, orderGrossTotal);

      if (requestedWallet > maxUsable) {
        await conn.rollback();
        return res.status(400).json({
          status: 0,
          message: `You can use max £${maxUsable.toFixed(2)} from wallet`,
        });
      }

      walletDeducted = requestedWallet;
      const newBalance = currentBalance - walletDeducted;

      // update wallet
      await conn.query(
        "UPDATE customer_wallets SET balance = ? WHERE customer_id = ?",
        [newBalance, customer_id]
      );

      // wallet transaction entry
      await conn.query(
        `INSERT INTO wallet_transactions
          (customer_id, transaction_type, amount, balance_after, source, payment_id, order_id, description)
         VALUES (?, 'DEBIT', ?, ?, 'ORDER', NULL, NULL, ?)`,
        [
          customer_id,
          walletDeducted,
          newBalance,
          `Wallet used for order ${order_number}`,
        ]
      );
    }

    // ✅ Insert order rows
    // store wallet_amount only in first inserted row (others 0)
    let firstRow = true;

    for (const item of items) {
      const {
        product_id,
        product_name,
        price,
        discount_amount,
        vat,
        quantity,
      } = item;

      const totalPrice = Number(price) * Number(quantity);
      const totalDiscount = Number(discount_amount || 0);
      const totalVat = Number(vat || 0);

      // ✅ before wallet
      const gross = totalPrice - totalDiscount + totalVat;

      // ✅ apply wallet only once (first row)
      const walletAmountForThisRow = firstRow ? walletDeducted : 0;

      // ✅ PAID amount (after wallet) should be stored in grand_total
      const paid = firstRow ? Math.max(0, gross - walletDeducted) : gross;

      firstRow = false;

      const sql = `
        INSERT INTO orders 
        (user_id, order_number, customer_id, product_id, payment_mode, razorpay_payment_requestid, 
         product_name, price, discount_amount, vat, gross_total, wallet_amount, quantity, grand_total, order_status,
         delivery_estimate_time, car_color, reg_number, owner_name, mobile_number, instore, allergy_note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?)
      `;

      // ✅ IMPORTANT: values order must match columns order exactly
      const values = [
        user_id,
        order_number,
        customer_id,
        product_id,
        payment_mode,
        razorpay_payment_requestid || null,
        product_name,
        price,
        totalDiscount,
        totalVat,
        gross,                 // ✅ gross_total
        walletAmountForThisRow, // ✅ wallet_amount (only first row)
        quantity,
        paid,                  // ✅ grand_total (PAID amount)
        car_color || null,
        reg_number || null,
        owner_name || null,
        mobile_number || null,
        instore || 0,
        allergy_note || null,
      ];

      await conn.query(sql, values);
    }

    // clear cart
    await conn.query("DELETE FROM cart WHERE customer_id = ?", [customer_id]);

    await conn.commit();

    return res.status(200).json({
      status: 1,
      message: "Order Placed Successfully",
      order_number,
      wallet_used: walletDeducted,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    console.error("Order creation error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server Error",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// ----------------- GET ALL ORDERS (UNCHANGED) ----------------- //
export const getAllOrders = async (req, res) => {
  try {
    const sql = `
      SELECT 
        o.*,
        c.full_name AS customer_name,
        rd.restaurant_name AS restaurant_name
      FROM orders o
      LEFT JOIN customers c
        ON o.customer_id = c.id
      LEFT JOIN products p
        ON o.product_id = p.id
      LEFT JOIN restaurant_details rd
        ON p.user_id = rd.user_id
      ORDER BY o.id DESC
    `;

    const [rows] = await db.query(sql);

    const hiddenFields = [
      "id",
      "user_id",
      "customer_id",
      "product_id",
      "razorpay_payment_requestid",
      "updated_at",
    ];

    const cleaned = rows.map((row) => {
      const newObj = {};

      for (const key in row) {
        if (!hiddenFields.includes(key)) {
          newObj[key] = row[key];
        }
      }

      newObj.customer_name = row.customer_name || "-";
      newObj.restaurant_name = row.restaurant_name || "-";

      return newObj;
    });

    return res.status(200).json({
      status: 1,
      message: "Orders fetched successfully",
      orders: cleaned,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};
