import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

// ===========================================
// GET ALL CATEGORIES (SORTED BY sort_order)
// ===========================================
export const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
     id,
     category_name AS name,
     category_image AS image,
     IFNULL(status, 1) AS status,
     IFNULL(sort_order, 9999) AS sort_order
   FROM categories 
   WHERE user_id = ?
   ORDER BY sort_order ASC, id ASC`,
      [userId]
    );


    res.json(rows);
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// ADD CATEGORY
// ===========================================
export const addCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const image = req.file ? req.file.filename : (req.body.existingImage || null);

    if (!name || !image)
      return res.status(400).json({ message: "Name and Image required" });

    // Check duplicate
    const [[exists]] = await pool.query(
      "SELECT id FROM categories WHERE user_id = ? AND LOWER(category_name) = LOWER(?)",
      [userId, name]
    );
    if (exists)
      return res.status(409).json({ message: "Category name already exists" });

    // Insert with default sort_order = last
    const [[maxOrder]] = await pool.query(
      "SELECT IFNULL(MAX(sort_order), 0) AS maxOrder FROM categories WHERE user_id = ?",
      [userId]
    );

    const newOrder = maxOrder.maxOrder + 1;

    const [result] = await pool.query(
      `INSERT INTO categories 
         (category_name, category_image, user_id, status, sort_order) 
       VALUES (?, ?, ?, 1, ?)`,
      [name, image, userId, newOrder]
    );

    res.json({
      id: result.insertId,
      name,
      image,
      status: 1,
      sort_order: newOrder,
    });
  } catch (err) {
    console.error("addCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// REMOVE CATEGORY (DELETE + IMAGE DELETE)
// ===========================================
export const removeCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [[cat]] = await pool.query(
      "SELECT category_image FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!cat) return res.status(404).json({ message: "Not found" });

    // Delete image
    if (cat.category_image) {
      const img = path.join("public/uploads", cat.category_image);
      if (fs.existsSync(img)) fs.unlinkSync(img);
    }

    await pool.query("DELETE FROM categories WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("removeCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// UPDATE CATEGORY (name, image OR status)
// ===========================================
export const updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, status } = req.body;
    const newImage = req.file ? req.file.filename : null;

    const [[existing]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!existing) return res.status(404).json({ message: "Not found" });

    const fields = [];
    const params = [];

    if (name) {
      fields.push("category_name = ?");
      params.push(name);
    }

    if (newImage) {
      // Delete old image
      if (existing.category_image) {
        const oldPath = path.join("public/uploads", existing.category_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      fields.push("category_image = ?");
      params.push(newImage);
    }

    if (typeof status !== "undefined") {
      fields.push("status = ?");
      params.push(status);
    }

    if (!fields.length)
      return res.status(400).json({ message: "Nothing to update" });

    params.push(id, userId);

    const sql = `UPDATE categories SET ${fields.join(
      ", "
    )} WHERE id = ? AND user_id = ?`;
    await pool.query(sql, params);

    const [[updated]] = await pool.query(
      "SELECT id, category_name AS name, category_image AS image, status, sort_order FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json(updated);
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// DRAG & DROP REORDER
// ===========================================
export const reorderCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order } = req.body; // array of { id, sort_order }

    if (!Array.isArray(order))
      return res.status(400).json({ message: "Invalid order format" });

    const updates = order.map((item) =>
      pool.query(
        "UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?",
        [item.sort_order, item.id, userId]
      )
    );

    await Promise.all(updates);

    res.json({ success: true, message: "Order updated successfully" });
  } catch (err) {
    console.error("reorderCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// SEARCH GLOBAL CATEGORIES
// ===========================================
export const searchGlobalCategories = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Select distinct category names (unique) from the entire database (global)
    // We use ANY_VALUE or MAX to pick one image/status for the unique name
    const [rows] = await pool.query(
      `SELECT 
         category_name AS name,
         MAX(category_image) AS image,
         1 AS status 
       FROM categories 
       WHERE category_name LIKE ?
       GROUP BY category_name
       LIMIT 20`,
      [`%${q}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error("searchGlobalCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
