import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT id, category_name AS name, category_image AS image, IFNULL(status, 1) AS status
       FROM categories WHERE user_id = ? ORDER BY id DESC`,
      [userId]
    );  

    res.json(rows);
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add a category
export const addCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!name || !image)
      return res.status(400).json({ message: "Name and Image required" });

    // Check duplicate
    const [[exists]] = await pool.query(
      "SELECT id FROM categories WHERE user_id = ? AND LOWER(category_name) = LOWER(?)",
      [userId, name]
    );
    if (exists) return res.status(409).json({ message: "Category name already exists" });

    const [result] = await pool.query(
      "INSERT INTO categories (category_name, category_image, user_id, status) VALUES (?, ?, ?, 1)",
      [name, image, userId]
    );

    res.json({ id: result.insertId, name, image, status: 1 });
  } catch (err) {
    console.error("addCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a category
export const removeCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [[cat]] = await pool.query(
      "SELECT category_image FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!cat) return res.status(404).json({ message: "Not found" });

    if (cat.category_image) {
      const img = path.join("public/uploads", cat.category_image);
      if (fs.existsSync(img)) fs.unlinkSync(img);
    }

    await pool.query("DELETE FROM categories WHERE id = ? AND user_id = ?", [id, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("removeCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update category (name, image, or status)
export const updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, status } = req.body;
    const image = req.file ? req.file.filename : null;

    const [[existing]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!existing) return res.status(404).json({ message: "Not found" });

    // Only delete old image if a new one is uploaded
    if (image && existing.category_image) {
      const oldPath = path.join("public/uploads", existing.category_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const fields = [];
    const params = [];

    if (name) {
      fields.push("category_name = ?");
      params.push(name);
    }
    if (image) {
      fields.push("category_image = ?");
      params.push(image);
    }
    if (typeof status !== "undefined") {
      fields.push("status = ?");
      params.push(status);
    }

    if (!fields.length)
      return res.status(400).json({ message: "Nothing to update" });

    params.push(id, userId);

    const sql = `UPDATE categories SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`;
    await pool.query(sql, params);

    const [[updated]] = await pool.query(
      "SELECT id, category_name AS name, category_image AS image, status FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json(updated);
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
