import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"; // 👈 NEW
import db from "../../config/db.js";

// 🔹 Base32 alphabet (RFC 4648 without padding)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// 🔹 Encode Buffer to Base32 (no padding)
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

// 🔹 Generate a single raw secure code: 8 bytes random + 2 bytes HMAC
function generateRawReferralBytes() {
  const randomPart = crypto.randomBytes(8); // CSPRNG
  const secret = process.env.REFERRAL_SECRET || "referral-dev-secret";

  const hmac = crypto.createHmac("sha256", secret).update(randomPart).digest();

  const sig = hmac.subarray(0, 2); // first 2 bytes as short signature

  return Buffer.concat([randomPart, sig]); // 10 bytes total
}

// 🔹 Generate *formatted* code like XY4D-P92M-JQ8T (12 chars: 4-4-4)
async function generateUniqueReferralCode() {
  const maxTries = 10;

  for (let i = 0; i < maxTries; i++) {
    const raw = generateRawReferralBytes();
    const base32 = toBase32(raw); // usually ~16 chars
    const compact = base32.slice(0, 12); // take first 12 chars

    const formatted =
      compact.slice(0, 4) +
      "-" +
      compact.slice(4, 8) +
      "-" +
      compact.slice(8, 12); // XY4D-P92M-JQ8T

    // 🔎 Check DB to ensure uniqueness
    const [rows] = await db.execute(
      "SELECT id FROM customers WHERE referral_code = ?",
      [formatted]
    );

    if (rows.length === 0) {
      return formatted;
    }
  }

  throw new Error("Unable to generate unique referral code after several tries");
}

// 🔸 Get current signup flat amount from `settings` table
async function getSignupFlatAmount() {
  const [rows] = await db.execute(
    "SELECT signup_flat_amount FROM settings ORDER BY id DESC LIMIT 1"
  );

  if (!rows.length) return 0;

  const value = parseFloat(rows[0].signup_flat_amount || 0);
  return isNaN(value) ? 0 : value;
}

// 🟢 Register (Signup)
export const register = async (req, res) => {
  try {
    const {
      full_name,
      country_code,
      mobile_number,
      email,
      password,
      preferred_restaurant,
      date_of_birth,
      gender,
      referral_code, // ✅ NEW: referral code entered at signup
    } = req.body;

    // 🔹 Basic field validation
    if (!full_name || !country_code || !mobile_number || !email || !password) {
      return res.status(400).json({
        message:
          "Full name, country code, mobile number, email, and password are required",
      });
    }

    // 🔹 Check for duplicates (email or phone)
    const [existingUsers] = await db.execute(
      "SELECT id, email, mobile_number FROM customers WHERE email = ? OR mobile_number = ?",
      [email, mobile_number]
    );

    if (existingUsers.length > 0) {
      const duplicate = existingUsers[0];
      if (duplicate.email === email && duplicate.mobile_number === mobile_number) {
        return res
          .status(409)
          .json({ message: "Email and mobile number already registered" });
      } else if (duplicate.email === email) {
        return res.status(409).json({ message: "Email already registered" });
      } else {
        return res.status(409).json({ message: "Mobile number already registered" });
      }
    }

    // 🔹 Hash password
    const hash = await bcrypt.hash(password, 10);

    // 🔹 Generate strong unique referral code like XY4D-P92M-JQ8T
    const selfReferralCode = await generateUniqueReferralCode();

    // ------------------------------------------------------------------
    // ✅ STEP-1 ADDITION:
    // If user enters a referral code, find referrer customer_id
    // and save it in referred_by_customer_id (NO MONEY CREDIT NOW)
    // ------------------------------------------------------------------
    let referredByCustomerId = null;

    if (referral_code && String(referral_code).trim() !== "") {
      const code = String(referral_code).trim();

      const [[referrer]] = await db.execute(
        "SELECT id FROM customers WHERE referral_code = ? LIMIT 1",
        [code]
      );

      if (referrer?.id) {
        referredByCustomerId = referrer.id;

        // ❌ Prevent self-referral (optional safety)
        // (At signup, user doesn't exist yet, so no self-check needed here)
      } else {
        // If referral code invalid, you can either ignore or block signup.
        // Here: IGNORE (do not block signup)
        referredByCustomerId = null;
      }
    }

    // 🔹 Insert new user with generated referral_code
    // ✅ also store referred_by_customer_id and referral_bonus_awarded=0
    const [result] = await db.execute(
      `INSERT INTO customers 
       (full_name, country_code, mobile_number, email, preferred_restaurant,
        date_of_birth, referral_code, referred_by_customer_id, referral_bonus_awarded,
        gender, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())`,
      [
        full_name,
        country_code,
        mobile_number,
        email,
        preferred_restaurant || null,
        date_of_birth || null,
        selfReferralCode, // ✅ our secure code (this user's own code)
        referredByCustomerId, // ✅ NEW: who referred this user
        gender || null,
        hash,
      ]
    );

    const newCustomerId = result.insertId;

    // ------------------------------------------------------------------
    // 🟢 SIGNUP BONUS → CREDIT WALLET (first-time user amount)
    // ------------------------------------------------------------------
    const signupAmount = await getSignupFlatAmount(); // from settings

    if (signupAmount > 0) {
      // 1) Upsert into customer_wallets (assumes UNIQUE KEY on customer_id)
      await db.execute(
        `INSERT INTO customer_wallets (customer_id, balance, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           balance = balance + VALUES(balance),
           updated_at = NOW()`,
        [newCustomerId, signupAmount]
      );

      // 2) Fetch latest balance
      const [[walletRow]] = await db.execute(
        "SELECT balance FROM customer_wallets WHERE customer_id = ?",
        [newCustomerId]
      );

      const currentBalance = Number(walletRow?.balance || 0);

      // 3) Insert wallet_transactions entry
      await db.execute(
        `INSERT INTO wallet_transactions
         (customer_id, transaction_type, amount, balance_after, source, payment_id, order_id, description, created_at)
         VALUES (?, 'CREDIT', ?, ?, 'SIGNUP_BONUS', NULL, NULL, 'Signup bonus credited', NOW())`,
        [newCustomerId, signupAmount, currentBalance]
      );
    }

    // 🔹 Create token
    const token = jwt.sign(
      { id: newCustomerId },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );

    // 🔹 Success response
    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: newCustomerId,
        full_name,
        country_code,
        mobile_number,
        email,
        preferred_restaurant: preferred_restaurant || null,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        referral_code: selfReferralCode, // ✅ send to app
      },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email / Mobile and password required" });
    }

    // 🔥 Detect whether user entered email or mobile number
    const isEmail = email.includes("@");

    let query = "";
    if (isEmail) {
      query = "SELECT * FROM customers WHERE email = ?";
    } else {
      query = "SELECT * FROM customers WHERE mobile_number = ?";
    }

    // 🔹 Fetch user
    const [[user]] = await db.execute(query, [email]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔹 Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 🔹 Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        country_code: user.country_code,
        mobile_number: user.mobile_number,
        email: user.email,
        preferred_restaurant: user.preferred_restaurant,
        date_of_birth: user.date_of_birth,
        referral_code: user.referral_code,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟢 Get user profile (JWT protected)
export const profile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [[user]] = await db.execute(
      `SELECT id, full_name, country_code, mobile_number, email, preferred_restaurant, date_of_birth, referral_code, gender 
       FROM customers 
       WHERE id = ?`,
      [userId]
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟢 Update user profile (JWT protected)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      full_name,
      gender,
      date_of_birth,
      preferred_restaurant,
    } = req.body;

    // 🔹 Validation
    if (!full_name || full_name.trim() === "") {
      return res.status(400).json({ message: "Full name is required" });
    }

    // 🔒 Email & mobile are NOT allowed to update (extra safety)
    await db.execute(
      `UPDATE customers SET
        full_name = ?,
        gender = ?,
        date_of_birth = ?,
        preferred_restaurant = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        full_name.trim(),
        gender || null,
        date_of_birth || null,
        preferred_restaurant || null,
        userId,
      ]
    );

    return res.json({
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
