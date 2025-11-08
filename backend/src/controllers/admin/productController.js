import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

// GET ALL PRODUCTS (return fields matching frontend)
export const getProducts = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
        p.id,
        p.cat_id,
        p.product_name AS name,
        p.product_image AS image,
        p.product_desc AS description,
        p.product_price AS price,
        p.product_discount_price AS discountPrice
     FROM products p
     WHERE p.user_id = ?
     ORDER BY p.id DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADD PRODUCT
export const addProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, price, discountPrice, cat_id } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!name || !price || !cat_id || !image) {
      return res.status(400).json({ message: "All required fields missing" });
    }

    // duplicate check (case-insensitive) for same user
    const [[exists]] = await pool.query(
      "SELECT id FROM products WHERE user_id = ? AND LOWER(product_name) = LOWER(?)",
      [userId, name]
    );
    if (exists) return res.status(409).json({ message: "Product name already exists" });

    const [result] = await pool.query(
      `INSERT INTO products (user_id, cat_id, product_name, product_image, product_desc, product_price, product_discount_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, cat_id, name, image, description, price, discountPrice]
    );

    res.json({
      id: result.insertId,
      name,
      image,
      description,
      price,
      discountPrice,
      cat_id
    });
  } catch (err) {
    console.error("addProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE PRODUCT
export const removeProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [[product]] = await pool.query(
      "SELECT product_image FROM products WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!product) return res.status(404).json({ message: "Not found or Not allowed" });

    if (product.product_image) {
      const imgPath = path.join("public/uploads", product.product_image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await pool.query("DELETE FROM products WHERE id = ? AND user_id = ?", [id, userId]);

    res.json({ success: true });
  } catch (err) {
    console.error("removeProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, price, discountPrice, cat_id } = req.body;
    const newImage = req.file ? req.file.filename : null;

    // Get old image
    const [[existing]] = await pool.query(
      "SELECT product_image FROM products WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (!existing) return res.status(404).json({ message: "Not found" });

    // duplicate check excluding current record (case-insensitive)
    const [[conflict]] = await pool.query(
      "SELECT id FROM products WHERE user_id = ? AND LOWER(product_name) = LOWER(?) AND id <> ?",
      [userId, name, id]
    );
    if (conflict) return res.status(409).json({ message: "Product name already exists" });

    // Delete old image if new one uploaded
    if (newImage && existing.product_image) {
      const oldPath = path.join("public/uploads", existing.product_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await pool.query(
      `UPDATE products SET 
        product_name=?, 
        product_desc=?, 
        product_price=?, 
        product_discount_price=?, 
        cat_id=?, 
        product_image = IFNULL(?, product_image)
       WHERE id=? AND user_id=?`,
      [name, description, price, discountPrice, cat_id, newImage, id, userId]
    );

    res.json({
      id: Number(id),
      name,
      description,
      price,
      discountPrice,
      cat_id,
      image: newImage || existing.product_image
    });
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
