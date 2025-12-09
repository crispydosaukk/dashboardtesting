import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../config/db.js";

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
      referral_code,
      gender,
    } = req.body;

    // 🔹 Basic field validation
    if (!full_name || !country_code || !mobile_number || !email || !password) {
      return res.status(400).json({ message: "Full name, country code, mobile number, email, and password are required" });
    }

    // 🔹 Check for duplicates (email or phone)
    const [existingUsers] = await db.execute(
      "SELECT id, email, mobile_number FROM customers WHERE email = ? OR mobile_number = ?",
      [email, mobile_number]
    );

    if (existingUsers.length > 0) {
      const duplicate = existingUsers[0];
      if (duplicate.email === email && duplicate.mobile_number === mobile_number) {
        return res.status(409).json({ message: "Email and mobile number already registered" });
      } else if (duplicate.email === email) {
        return res.status(409).json({ message: "Email already registered" });
      } else {
        return res.status(409).json({ message: "Mobile number already registered" });
      }
    }

    // 🔹 Hash password
    const hash = await bcrypt.hash(password, 10);

    // 🔹 Insert new user
    const [result] = await db.execute(
      `INSERT INTO customers 
       (full_name, country_code, mobile_number, email, preferred_restaurant, date_of_birth, referral_code, gender, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        full_name,
        country_code,
        mobile_number,
        email,
        preferred_restaurant || null,
        date_of_birth || null,
        referral_code || null,
        gender || null,
        hash,
      ]
    );

    // 🔹 Create token
    const token = jwt.sign(
      { id: result.insertId },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );

    // 🔹 Success response
    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: result.insertId,
        full_name,
        country_code,
        mobile_number,
        email,
        preferred_restaurant: preferred_restaurant || null,
        date_of_birth: date_of_birth || null,
        referral_code: referral_code || null,
        gender: gender || null,
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
      return res.status(400).json({ message: "Email / Mobile and password required" });
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
