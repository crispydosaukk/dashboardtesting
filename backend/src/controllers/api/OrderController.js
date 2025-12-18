import db from "../../config/db.js";

// ----------------- ORDER NUMBER GENERATOR ----------------- //
function generateOrderNumber(restaurantName = "") {
  const nameStr = String(restaurantName || "");

  // Normalize name and remove the words 'crispy' and 'dosa' robustly (handles extra spaces/punctuation)
  let cleaned = nameStr
    .toLowerCase()
    // remove joined/adjacent forms (crispydosa) and individual words
    .replace(/crispy\s*dosa/gi, "")
    .replace(/crispy|dosa/gi, "")
    .replace(/[^a-z0-9\s]/gi, " ") // replace non-alphanum with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();

  // Fallback to original name's first non-space character if cleaned becomes empty
  const firstLetter = cleaned[0]
    ? cleaned[0].toUpperCase()
    : (nameStr.trim()[0] ? nameStr.trim()[0].toUpperCase() : "X");

  const now = new Date();
  const DD = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return `CD${firstLetter}${DD}${MM}${HH}${mm}`;
}

// 🔹 Get referral flat amount from settings (DYNAMIC)
async function getReferralFlatAmount(conn) {
  const [[row]] = await conn.query(
    "SELECT referral_flat_amount FROM settings ORDER BY id DESC LIMIT 1"
  );
  return Number(row?.referral_flat_amount || 0);
}

// 🔹 Get loyalty settings (DYNAMIC)
async function getLoyaltySettings(conn) {
  const [[row]] = await conn.query(
    `SELECT 
       minimum_order,
       loyalty_points_per_gbp,
       loyalty_available_after_hours,
       loyalty_expiry_days
     FROM settings
     ORDER BY id DESC
     LIMIT 1`
  );

  return {
    minimum_order: Number(row?.minimum_order || 0),
    loyalty_points_per_gbp: Number(row?.loyalty_points_per_gbp || 1),
    loyalty_available_after_hours: Number(row?.loyalty_available_after_hours || 24),
    loyalty_expiry_days: Number(row?.loyalty_expiry_days || 30),
  };
}

// ----------------- CREATE ORDER (WITH WALLET) ----------------- //
export const createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      user_id,
      customer_id,
      payment_mode,
      payment_request_id,
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

    // 🔴 MINIMUM CART TOTAL VALIDATION (NEW RULE)

      const [[settingsRow]] = await conn.query(
        "SELECT minimum_cart_total FROM settings ORDER BY id DESC LIMIT 1"
      );

      const minimumCartTotal = Number(settingsRow?.minimum_cart_total || 0);

      // validate BEFORE wallet deduction
      if (minimumCartTotal > 0 && orderGrossTotal < minimumCartTotal) {
        await conn.rollback();
        return res.status(400).json({
          status: 0,
          message: `Minimum order amount is £${minimumCartTotal.toFixed(2)}`
        });
      }

    const requestedWallet = Number(wallet_used || 0);
    if (requestedWallet < 0) {
      return res
        .status(400)
        .json({ status: 0, message: "Invalid wallet amount" });
    }

    // ✅ transaction start
    await conn.beginTransaction();

    // Fetch restaurant name
    // Prefer the restaurant linked to the first product (products.user_id) to avoid mismatch
    // between the passed in user_id and product ownership.
    let restaurantName = "";

    if (Array.isArray(items) && items.length > 0 && items[0].product_id) {
      const firstProductId = items[0].product_id;
      const [prdRows] = await conn.query(
        `SELECT rd.restaurant_name
         FROM products p
         JOIN restaurant_details rd ON p.user_id = rd.user_id
         WHERE p.id = ?
         LIMIT 1`,
        [firstProductId]
      );
      if (prdRows.length) {
        restaurantName = prdRows[0].restaurant_name || "";
      }
    }

    // Fallback to user_id based lookup if product-based lookup failed
    if (!restaurantName && user_id) {
      const [rData] = await conn.query(
        "SELECT restaurant_name FROM restaurant_details WHERE user_id = ? LIMIT 1",
        [user_id]
      );
      restaurantName = rData.length ? rData[0].restaurant_name : "";
    }

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

    // ✅ to store first inserted order row id (for loyalty reference)
    let orderIdForLoyalty = null;

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

      const sql = `
        INSERT INTO orders 
        (user_id, order_number, customer_id, product_id, payment_mode, payment_request_id, 
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
        payment_request_id || null,
        product_name,
        price,
        totalDiscount,
        totalVat,
        gross,                   // ✅ gross_total
        walletAmountForThisRow,   // ✅ wallet_amount (only first row)
        quantity,
        paid,                    // ✅ grand_total (PAID amount)
        car_color || null,
        reg_number || null,
        owner_name || null,
        mobile_number || null,
        instore || 0,
        allergy_note || null,
      ];

      const [orderInsertRes] = await conn.query(sql, values);

      // ✅ capture first order row id ONCE
      if (firstRow && orderInsertRes?.insertId) {
        orderIdForLoyalty = orderInsertRes.insertId;
      }

      // ✅ set firstRow false only AFTER first insert completes
      firstRow = false;
    }

    // -------------------------------------------------
    // 🟢 LOYALTY EARNINGS (DYNAMIC)  ✅ RUN ONCE PER ORDER
    // -------------------------------------------------
    const loyaltyCfg = await getLoyaltySettings(conn);

    // total paid after wallet usage (whole order)
    const paidTotal = Math.max(0, Number(orderGrossTotal) - Number(walletDeducted));

    // Earn points only if paidTotal >= minimum_order
    if (paidTotal >= loyaltyCfg.minimum_order) {
      const pointsEarned = Math.floor(paidTotal * loyaltyCfg.loyalty_points_per_gbp);

      if (pointsEarned > 0 && orderIdForLoyalty) {
        await conn.query(
          `INSERT INTO loyalty_earnings
           (customer_id, order_id, points_earned, points_remaining, available_from, expires_at, created_at)
           VALUES (?, ?, ?, ?,
             DATE_ADD(NOW(), INTERVAL ? HOUR),
             DATE_ADD(NOW(), INTERVAL ? DAY),
             NOW()
           )`,
          [
            customer_id,
            orderIdForLoyalty,
            pointsEarned,
            pointsEarned,
            loyaltyCfg.loyalty_available_after_hours,
            loyaltyCfg.loyalty_expiry_days,
          ]
        );
      }
    }

    // -------------------------------------------------
    // 🟢 REFERRAL REWARD (AFTER FIRST ORDER ONLY)
    // -------------------------------------------------
    const [[customerRow]] = await conn.query(
      `SELECT referred_by_customer_id, referral_bonus_awarded
       FROM customers WHERE id = ? FOR UPDATE`,
      [customer_id]
    );

    if (
      customerRow?.referred_by_customer_id &&
      customerRow.referral_bonus_awarded === 0
    ) {
      const referrerId = customerRow.referred_by_customer_id;
      const referralAmount = await getReferralFlatAmount(conn);

      if (referralAmount > 0) {
        // 1️⃣ Update referrer wallet
        await conn.query(
          `INSERT INTO customer_wallets (customer_id, balance, created_at, updated_at)
           VALUES (?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
           balance = balance + VALUES(balance),
           updated_at = NOW()`,
          [referrerId, referralAmount]
        );

        // 2️⃣ Get new balance
        const [[walletRow]] = await conn.query(
          "SELECT balance FROM customer_wallets WHERE customer_id = ?",
          [referrerId]
        );

        const newBalance = Number(walletRow?.balance || 0);

        // 3️⃣ Wallet transaction entry
        await conn.query(
          `INSERT INTO wallet_transactions
           (customer_id, transaction_type, amount, balance_after, source, order_id, description, created_at)
           VALUES (?, 'CREDIT', ?, ?, 'REFERRAL_BONUS', NULL, ?, NOW())`,
          [
            referrerId,
            referralAmount,
            newBalance,
            `Referral bonus for order ${order_number}`,
          ]
        );

        // 4️⃣ Mark referral as awarded
        await conn.query(
          "UPDATE customers SET referral_bonus_awarded = 1 WHERE id = ?",
          [customer_id]
        );
      }
    }

    if (payment_request_id) {
  await conn.query(
    `INSERT INTO order_payment_history
     (order_no, payment_request_id, amount, payment_status)
     VALUES (?, ?, ?, 'success')`,
    [
      order_number,
      payment_request_id,
      paidTotal, // total paid after wallet
    ]
  );
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

export const getAllOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const roleName = req.user.role || req.user.role_title || null;

    // consider role_id 6 as Super Admin (legacy frontend uses role_id === 6)
    const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

    let sql = `
      SELECT 
        o.*,
        c.full_name AS customer_name,
        rd.restaurant_name AS restaurant_name
      FROM orders o
      INNER JOIN products p ON o.product_id = p.id
      INNER JOIN restaurant_details rd ON p.user_id = rd.user_id
      LEFT JOIN customers c ON o.customer_id = c.id
    `;

    const params = [];

    // 🔐 FILTER ONLY IF NOT SUPER ADMIN
    if (!isSuperAdmin) {
      sql += ` WHERE rd.user_id = ? `;
      params.push(userId);
    }

    sql += ` ORDER BY o.id DESC `;

    const [rows] = await db.query(sql, params);

    return res.json({
      status: 1,
      orders: rows,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
    });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.params.customer_id;

    const [rows] = await db.query(`
      SELECT 
        order_number AS order_no,
        MIN(id) AS order_id,
        customer_id,
        user_id,
        SUM(gross_total) AS total_amount,
        SUM(quantity) AS items_count,
        MAX(order_status) AS status,
        MAX(created_at) AS created_at
      FROM orders
      WHERE customer_id = ?
      GROUP BY order_number
      ORDER BY created_at DESC
    `, [customerId]);

    return res.json({
      status: 1,
      data: rows
    });
  } catch (error) {
    console.error("getCustomerOrders error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error"
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    // order_id comes from URL
    const orderId = req.params.order_id;

    // 1️⃣ Find order_number using ANY row
    const [[row]] = await db.query(
      "SELECT order_number FROM orders WHERE id = ?",
      [orderId]
    );

    if (!row) {
      return res.status(404).json({
        status: 0,
        message: "Order not found"
      });
    }

    const orderNumber = row.order_number;

    // 2️⃣ Fetch ALL items of this order
    const [rows] = await db.query(
      "SELECT * FROM orders WHERE order_number = ?",
      [orderNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 0,
        message: "Order not found"
      });
    }

    // 3️⃣ Build clean order response
    const order = {
      order_id: orderId,
      order_no: orderNumber,
      customer_id: rows[0].customer_id,
      status: rows[0].order_status,
      created_at: rows[0].created_at,
      total_amount: rows.reduce(
        (sum, r) => sum + Number(r.grand_total),
        0
      ),
      items: rows.map(r => ({
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: r.quantity,
        price: r.price
      }))
    };

    return res.json({
      status: 1,
      data: order
    });

  } catch (error) {
    console.error("getOrder error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error"
    });
  }
};
