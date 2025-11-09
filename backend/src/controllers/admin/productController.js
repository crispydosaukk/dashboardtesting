import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

// GET ALL PRODUCTS (return fields matching frontend, include status)
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
        p.product_discount_price AS discountPrice,
        IFNULL(p.status,1) AS status
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

// ADD PRODUCT (sets status = 1 by default)
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
      `INSERT INTO products (user_id, cat_id, product_name, product_image, product_desc, product_price, product_discount_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, cat_id, name, image, description, price, discountPrice]
    );

    res.json({
      id: result.insertId,
      name,
      image,
      description,
      price,
      discountPrice,
      cat_id,
      status: 1,
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

// UPDATE PRODUCT — now supports updating name/desc/price/discount/cat_id/image AND status
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Accept name/status from req.body (status may be string/number)
    const { name, description, price, discountPrice, cat_id } = req.body;
    const statusRaw = req.body.status;
    const status = typeof statusRaw !== "undefined" && statusRaw !== null
      ? (statusRaw === "1" || statusRaw === 1 || statusRaw === "true" ? 1 : 0)
      : null;

    const newImage = req.file ? req.file.filename : null;

    // Get old image
    const [[existing]] = await pool.query(
      "SELECT product_image FROM products WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (!existing) return res.status(404).json({ message: "Not found" });

    // duplicate check excluding current record (case-insensitive) — only if name provided
    if (name) {
      const [[conflict]] = await pool.query(
        "SELECT id FROM products WHERE user_id = ? AND LOWER(product_name) = LOWER(?) AND id <> ?",
        [userId, name, id]
      );
      if (conflict) return res.status(409).json({ message: "Product name already exists" });
    }

    // Delete old image if new one uploaded
    if (newImage && existing.product_image) {
      const oldPath = path.join("public/uploads", existing.product_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    // Build dynamic updates
    const fields = [];
    const params = [];

    if (typeof name !== "undefined") {
      fields.push("product_name = ?");
      params.push(name);
    }
    if (typeof description !== "undefined") {
      fields.push("product_desc = ?");
      params.push(description);
    }
    if (typeof price !== "undefined") {
      fields.push("product_price = ?");
      params.push(price);
    }
    if (typeof discountPrice !== "undefined") {
      fields.push("product_discount_price = ?");
      params.push(discountPrice);
    }
    if (typeof cat_id !== "undefined") {
      fields.push("cat_id = ?");
      params.push(cat_id);
    }
    if (newImage) {
      fields.push("product_image = ?");
      params.push(newImage);
    }
    if (status !== null) {
      fields.push("status = ?");
      params.push(status);
    }

    if (fields.length === 0) {
      // nothing to update, return current
      const [[current]] = await pool.query(
        `SELECT id, product_name AS name, product_image AS image, product_desc AS description,
                product_price AS price, product_discount_price AS discountPrice, cat_id, IFNULL(status,1) AS status
         FROM products WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return res.json(current);
    }

    params.push(id, userId);
    const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`;
    await pool.query(sql, params);

    const [[updated]] = await pool.query(
      `SELECT id, product_name AS name, product_image AS image, product_desc AS description,
              product_price AS price, product_discount_price AS discountPrice, cat_id, IFNULL(status,1) AS status
       FROM products WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json(updated);
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
