import bcrypt from "bcryptjs";
import db from "../../config/db.js";

// Get all customers
export const getCustomers = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, full_name, country_code, mobile_number, email, created_at
      FROM customers
      ORDER BY id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("getCustomers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single customer
export const getCustomerByIdCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const [[customer]] = await db.execute(
      `SELECT id, full_name, country_code, mobile_number, email, created_at 
       FROM customers WHERE id = ?`,
      [id]
    );

    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    res.json(customer);
  } catch (err) {
    console.error("getCustomerById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a new customer
export const addCustomer = async (req, res) => {
  try {
    const { full_name, country_code, mobile_number, email, password } = req.body;

    if (!full_name || !country_code || !mobile_number || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const [[exists]] = await db.query(
      "SELECT id FROM customers WHERE mobile_number = ? OR email = ?",
      [mobile_number, email]
    );

    if (exists)
      return res.status(409).json({ message: "Mobile number or Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO customers 
       (full_name, country_code, mobile_number, email, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [full_name, country_code, mobile_number, email, hash]
    );

    res.json({ id: result.insertId, full_name, country_code, mobile_number, email });
  } catch (err) {
    console.error("addCustomer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update customer info
export const editCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, country_code, mobile_number, email, password } = req.body;

    const fields = [];
    const params = [];

    if (full_name) { fields.push("full_name = ?"); params.push(full_name); }
    if (country_code) { fields.push("country_code = ?"); params.push(country_code); }
    if (mobile_number) { fields.push("mobile_number = ?"); params.push(mobile_number); }
    if (email) { fields.push("email = ?"); params.push(email); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push("password = ?");
      params.push(hash);
    }

    if (!fields.length)
      return res.status(400).json({ message: "No fields provided for update" });

    params.push(id);
    const sql = `
      UPDATE customers 
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = ?`;
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
