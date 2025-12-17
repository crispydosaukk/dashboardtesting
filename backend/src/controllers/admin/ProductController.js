import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

/* ===========================================
   GET ALL PRODUCTS (SORTED BY sort_order)
=========================================== */
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
        IFNULL(p.status,1) AS status,
        IFNULL(p.sort_order,9999) AS sort_order
      FROM products p
      WHERE p.user_id = ?
      ORDER BY p.sort_order ASC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================================
   ADD PRODUCT
=========================================== */
export const addProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, price, discountPrice, cat_id } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!name || !price || !cat_id || !image)
      return res.status(400).json({ message: "All required fields missing" });

    // duplicate name check
    const [[exists]] = await pool.query(
      "SELECT id FROM products WHERE user_id = ? AND LOWER(product_name)=LOWER(?)",
      [userId, name]
    );
    if (exists)
      return res.status(409).json({ message: "Product name already exists" });

    // set next sort order
    const [[maxOrder]] = await pool.query(
      "SELECT IFNULL(MAX(sort_order),0) AS maxOrder FROM products WHERE user_id=?",
      [userId]
    );
    const newOrder = maxOrder.maxOrder + 1;

    const [result] = await pool.query(
      `INSERT INTO products 
       (user_id, cat_id, product_name, product_image, product_desc, product_price, product_discount_price, status, sort_order)
       VALUES (?,?,?,?,?,?,?,1,?)`,
      [userId, cat_id, name, image, description, price, discountPrice, newOrder]
    );

    res.json({
      id: result.insertId,
      name,
      description,
      price,
      discountPrice,
      image,
      cat_id,
      status: 1,
      sort_order: newOrder,
    });
  } catch (err) {
    console.error("addProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================================
   DELETE PRODUCT
=========================================== */
export const removeProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [[product]] = await pool.query(
      "SELECT product_image FROM products WHERE id=? AND user_id=?",
      [id, userId]
    );

    if (!product) return res.status(404).json({ message: "Not found" });

    if (product.product_image) {
      const imgPath = path.join("public/uploads", product.product_image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await pool.query(
      "DELETE FROM products WHERE id=? AND user_id=?",
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("removeProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================================
   UPDATE PRODUCT
=========================================== */
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { name, description, price, discountPrice, cat_id } = req.body;
    const newImage = req.file ? req.file.filename : null;

    const statusRaw = req.body.status;
    const status =
      statusRaw === "1" || statusRaw === 1 || statusRaw === "true" ? 1 : 0;

    const [[existing]] = await pool.query(
      "SELECT * FROM products WHERE id=? AND user_id=?",
      [id, userId]
    );
    if (!existing) return res.status(404).json({ message: "Not found" });

    // delete old image
    if (newImage && existing.product_image) {
      const oldPath = path.join("public/uploads", existing.product_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const fields = [];
    const params = [];

    if (name) {
      fields.push("product_name = ?");
      params.push(name);
    }
    if (description !== undefined) {
      fields.push("product_desc = ?");
      params.push(description);
    }
    if (price) {
      fields.push("product_price = ?");
      params.push(price);
    }
    if (discountPrice) {
      fields.push("product_discount_price = ?");
      params.push(discountPrice);
    }
    if (cat_id) {
      fields.push("cat_id = ?");
      params.push(cat_id);
    }
    if (newImage) {
      fields.push("product_image = ?");
      params.push(newImage);
    }
    if (statusRaw !== undefined) {
      fields.push("status = ?");
      params.push(status);
    }

    params.push(id, userId);

    await pool.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id=? AND user_id=?`,
      params
    );

    const [[updated]] = await pool.query(
      `SELECT id, product_name AS name, product_image AS image,
              product_desc AS description, product_price AS price,
              product_discount_price AS discountPrice, cat_id, status, sort_order
       FROM products WHERE id=? AND user_id=?`,
      [id, userId]
    );

    res.json(updated);
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const reorderProducts = async (req, res) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order))
      return res.status(400).json({ message: "Invalid order array" });

    const updates = order.map((item) =>
      pool.query(
        "UPDATE products SET sort_order=? WHERE id=?",
        [item.sort_order, item.id]
      )
    );

    await Promise.all(updates);

    res.json({ success: true, message: "Product order updated" });
  } catch (err) {
    console.error("reorderProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
