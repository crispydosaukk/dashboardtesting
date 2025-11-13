import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../config/db.js";

// 🟢 Register (Signup)
export const register = async (req, res) => {
  try {
    const { full_name, country_code, mobile_number, email, password } = req.body;

    if (!full_name || !country_code || !mobile_number || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [[exists]] = await db.execute(
      "SELECT id FROM customers WHERE mobile_number = ? OR email = ?",
      [mobile_number, email]
    );

    if (exists) return res.status(409).json({ message: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO customers 
       (full_name, country_code, mobile_number, email, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [full_name, country_code, mobile_number, email, hash]
    );

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET || "devsecret", {
      expiresIn: "7d",
    });

    res.json({
      message: "Registration successful",
      token,
      user: { id: result.insertId, full_name, country_code, mobile_number, email },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟢 Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [[user]] = await db.execute("SELECT * FROM customers WHERE email = ?", [email]);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "devsecret", {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        country_code: user.country_code,
        mobile_number: user.mobile_number,
        email: user.email,
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
      "SELECT id, full_name, country_code, mobile_number, email FROM customers WHERE id = ?",
      [userId]
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
