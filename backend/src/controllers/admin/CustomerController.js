import bcrypt from "bcryptjs";
import db from "../../config/db.js";
import crypto from "crypto";   // 👈 NEW

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function generateRawReferralBytes() {
  const randomPart = crypto.randomBytes(8);
  const secret = process.env.REFERRAL_SECRET || "referral-dev-secret";

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(randomPart)
    .digest();

  const sig = hmac.subarray(0, 2);
  return Buffer.concat([randomPart, sig]);
}

async function generateUniqueReferralCode() {
  const maxTries = 10;

  for (let i = 0; i < maxTries; i++) {
    const raw = generateRawReferralBytes();
    const base32 = toBase32(raw);
    const compact = base32.slice(0, 12);

    const formatted =
      compact.slice(0, 4) +
      "-" +
      compact.slice(4, 8) +
      "-" +
      compact.slice(8, 12);

    const [rows] = await db.execute(
      "SELECT id FROM customers WHERE referral_code = ?",
      [formatted]
    );

    if (rows.length === 0) return formatted;
  }

  throw new Error("Unable to generate unique referral code");
}

// Get all customers (WITH wallet + referral + loyalty)
export const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        c.id,
        c.full_name,
        c.country_code,
        c.mobile_number,
        c.email,
        c.preferred_restaurant,
        c.date_of_birth,
        c.referral_code,
        c.gender,
        c.created_at,
        IFNULL(w.balance, 0) AS wallet_balance,

        -- ✅ Loyalty points available NOW (redeemable points)
        IFNULL(lp.available_points, 0) AS loyalty_points,

        -- ✅ Total points earned lifetime (optional)
        IFNULL(lp.total_earned, 0) AS loyalty_total_earned,

        -- ✅ Redeem rules (latest settings)
        IFNULL(s.loyalty_redeem_points, 10) AS loyalty_redeem_points,
        IFNULL(s.loyalty_redeem_value, 1) AS loyalty_redeem_value

      FROM customers c

      LEFT JOIN customer_wallets w 
        ON w.customer_id = c.id

      LEFT JOIN (
        SELECT 
          customer_id,
          SUM(CASE 
              WHEN available_from <= NOW() 
               AND expires_at >= NOW()
               AND points_remaining > 0
              THEN points_remaining ELSE 0 END
          ) AS available_points,
          SUM(points_earned) AS total_earned
        FROM loyalty_earnings
        GROUP BY customer_id
      ) lp
        ON lp.customer_id = c.id

      LEFT JOIN (
        SELECT loyalty_redeem_points, loyalty_redeem_value
        FROM settings
        ORDER BY id DESC
        LIMIT 1
      ) s ON 1=1

      ORDER BY c.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("getCustomers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Get single customer (optional but good to keep consistent)
export const getCustomerByIdCtrl = async (req, res) => {
  try {
    const { id } = req.params;

    const [[customer]] = await db.execute(
      `
      SELECT 
        c.id,
        c.full_name,
        c.country_code,
        c.mobile_number,
        c.email,
        c.preferred_restaurant,
        c.date_of_birth,
        c.referral_code,
        c.gender,
        c.created_at,
        IFNULL(w.balance, 0) AS wallet_balance
      FROM customers c
      LEFT JOIN customer_wallets w
        ON w.customer_id = c.id
      WHERE c.id = ?
      `,
      [id]
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error("getCustomerById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const addCustomer = async (req, res) => {
  try {
    const {
      full_name,
      country_code,
      mobile_number,
      email,
      password,
      preferred_restaurant,
      date_of_birth,
      // referral_code, // ignore manual value; we generate our own
      gender,
    } = req.body;

    if (!full_name || !country_code || !mobile_number || !email || !password)
      return res
        .status(400)
        .json({ message: "All required fields are required" });

    const [[exists]] = await db.query(
      "SELECT id FROM customers WHERE mobile_number = ? OR email = ?",
      [mobile_number, email]
    );

    if (exists)
      return res
        .status(409)
        .json({ message: "Mobile number or Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    // 🔹 Generate secure referral code
    const selfReferralCode = await generateUniqueReferralCode();

    const [result] = await db.execute(
      `INSERT INTO customers 
       (full_name, country_code, mobile_number, email, password,
        preferred_restaurant, date_of_birth, referral_code, gender, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        full_name,
        country_code,
        mobile_number,
        email,
        hash,
        preferred_restaurant || null,
        date_of_birth || null,
        selfReferralCode,  // ✅ here
        gender || null,
      ]
    );

    res.json({
      id: result.insertId,
      full_name,
      country_code,
      mobile_number,
      email,
      preferred_restaurant,
      date_of_birth,
      referral_code: selfReferralCode, // ✅ return to admin UI if you want
      gender,
    });
  } catch (err) {
    console.error("addCustomer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update customer info
export const editCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const params = [];

    if (updates.full_name) {
      fields.push("full_name = ?");
      params.push(updates.full_name);
    }
    if (updates.country_code) {
      fields.push("country_code = ?");
      params.push(updates.country_code);
    }
    if (updates.mobile_number) {
      fields.push("mobile_number = ?");
      params.push(updates.mobile_number);
    }
    if (updates.email) {
      fields.push("email = ?");
      params.push(updates.email);
    }
    if (updates.password) {
      const hash = await bcrypt.hash(updates.password, 10);
      fields.push("password = ?");
      params.push(hash);
    }
    if (updates.preferred_restaurant) {
      fields.push("preferred_restaurant = ?");
      params.push(updates.preferred_restaurant);
    }
    if (updates.date_of_birth) {
      fields.push("date_of_birth = ?");
      params.push(updates.date_of_birth);
    }
    if (updates.referral_code) {
      fields.push("referral_code = ?");
      params.push(updates.referral_code);
    }
    if (updates.gender) {
      fields.push("gender = ?");
      params.push(updates.gender);
    }

    if (!fields.length)
      return res
        .status(400)
        .json({ message: "No fields provided for update" });

    params.push(id);
    const sql = `UPDATE customers SET ${fields.join(
      ", "
    )}, updated_at = NOW() WHERE id = ?`;
    await db.execute(sql, params);

    res.json({ message: "Customer updated successfully" });
  } catch (err) {
    console.error("editCustomer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete customer
export const removeCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute("DELETE FROM customers WHERE id = ?", [id]);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("removeCustomer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get customers for the logged-in user (based on orders)
export const getCustomersByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const roleName = req.user.role || req.user.role_title || null;

    // Super Admin Check (Role 6 or 'Super Admin')
    const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

    let sql = `
      SELECT 
        c.id,
        c.full_name,
        c.country_code,
        c.mobile_number,
        c.email,
        MAX(c.created_at) as last_seen,
        
        -- Order Counts (Unique Orders)
        COUNT(DISTINCT o.order_number) as total_orders,
        COUNT(DISTINCT CASE WHEN o.order_status IN (0, 1, 3) THEN o.order_number END) as live_orders,
        COUNT(DISTINCT CASE WHEN o.order_status = 4 THEN o.order_number END) as completed_orders

      FROM customers c
      INNER JOIN orders o ON c.id = o.customer_id
    `;

    const params = [];

    // Filter by user ONLY if NOT Super Admin
    if (!isSuperAdmin) {
      sql += ` WHERE o.user_id = ? `;
      params.push(userId);
    }

    sql += `
      GROUP BY c.id
      ORDER BY total_orders DESC
    `;

    const [rows] = await db.execute(sql, params);

    res.json(rows);
  } catch (err) {
    console.error("getCustomersByUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

