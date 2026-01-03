import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

/* ===========================================
   GET ALL PRODUCTS (SORTED BY sort_order)
=========================================== */
export const getProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    // Debug logging
    try {
      const logPath = path.resolve("debug_log.txt");
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] getProducts: userId=${userId}\n`);
    } catch (e) { }

    const [rows] = await pool.query(
      `SELECT 
        p.id,
        p.cat_id,
        p.product_name AS name,
        p.product_image AS image,
        p.product_desc AS description,
        p.contains,
        p.product_price AS price,
        p.product_discount_price AS discountPrice,
        IFNULL(p.status,1) AS status,
        IFNULL(p.sort_order,9999) AS sort_order
      FROM products p
      WHERE p.user_id = ?
      ORDER BY p.sort_order ASC`,
      [userId]
    );

    const data = rows.map((r) => ({
      ...r,
      contains: r.contains ? JSON.parse(r.contains) : [],
    }));

    res.json(data);
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
    let { name, description, price, discountPrice, cat_id, contains } = req.body;
    // Debug logging
    try {
      const logPath = path.resolve("debug_log.txt");
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] addProduct: userId=${userId}, name=${name}\n`);
    } catch (e) { }
    const image = req.file ? req.file.filename : (req.body.existingImage || null);

    // Fix for FormData sending contains as stringified JSON
    if (typeof contains === "string") {
      try {
        contains = JSON.parse(contains);
      } catch (e) {
        contains = [];
      }
    }

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
       (user_id, cat_id, product_name, product_image, product_desc, contains,
        product_price, product_discount_price, status, sort_order)
       VALUES (?,?,?,?,?,?,?,?,1,?)`,
      [
        userId,
        cat_id,
        name,
        image,
        description,
        contains ? JSON.stringify(contains) : null,
        price,
        discountPrice,
        newOrder
      ]
    );

    res.json({
      id: result.insertId,
      name,
      description,
      price,
      discountPrice,
      image,
      cat_id,
      contains: contains || [],
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

    let { name, description, price, discountPrice, cat_id, contains } = req.body;
    const newImage = req.file ? req.file.filename : null;

    // Fix for FormData sending contains as stringified JSON
    if (typeof contains === "string") {
      try {
        contains = JSON.parse(contains);
      } catch (e) {
        contains = [];
      }
    }

    const statusRaw = req.body.status;
    const status =
      statusRaw === "1" || statusRaw === 1 || statusRaw === "true" ? 1 : 0;

    const [[existing]] = await pool.query(
      "SELECT * FROM products WHERE id=? AND user_id=?",
      [id, userId]
    );
    if (!existing) return res.status(404).json({ message: "Not found" });

    if (newImage && existing.product_image) {
      const oldPath = path.join("public/uploads", existing.product_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const fields = [];
    const params = [];

    if (name) { fields.push("product_name = ?"); params.push(name); }
    if (description !== undefined) { fields.push("product_desc = ?"); params.push(description); }
    if (price) { fields.push("product_price = ?"); params.push(price); }
    if (discountPrice) { fields.push("product_discount_price = ?"); params.push(discountPrice); }
    if (cat_id) { fields.push("cat_id = ?"); params.push(cat_id); }
    if (contains !== undefined) {
      fields.push("contains = ?");
      params.push(JSON.stringify(contains));
    }
    if (newImage) { fields.push("product_image = ?"); params.push(newImage); }
    if (statusRaw !== undefined) { fields.push("status = ?"); params.push(status); }

    params.push(id, userId);

    await pool.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id=? AND user_id=?`,
      params
    );

    const [[updated]] = await pool.query(
      `SELECT 
        id,
        product_name AS name,
        product_image AS image,
        product_desc AS description,
        product_price AS price,
        product_discount_price AS discountPrice,
        cat_id,
        contains,
        status,
        sort_order
       FROM products WHERE id=? AND user_id=?`,
      [id, userId]
    );

    updated.contains = updated.contains ? JSON.parse(updated.contains) : [];

    res.json(updated);
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// REORDER PRODUCTS
// ===========================================
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

// ===========================================
// SEARCH GLOBAL PRODUCTS
// ===========================================
export const searchGlobalProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Select distinct product names
    const [rows] = await pool.query(
      `SELECT 
        p.product_name AS name,
        MAX(p.product_image) AS image,
        MAX(p.product_desc) AS description,
        MAX(p.product_price) AS price,
        MAX(p.product_discount_price) AS discountPrice,
        MAX(p.contains) AS contains,
        MAX(c.category_name) AS category_name,
        MAX(c.category_image) AS category_image,
        1 AS status
      FROM products p
      LEFT JOIN categories c ON p.cat_id = c.id
      WHERE p.product_name LIKE ?
      GROUP BY p.product_name
      LIMIT 20`,
      [`%${q}%`]
    );

    const data = rows.map((r) => ({
      ...r,
      contains: r.contains ? JSON.parse(r.contains) : [],
    }));

    res.json(data);
  } catch (err) {
    console.error("searchGlobalProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
