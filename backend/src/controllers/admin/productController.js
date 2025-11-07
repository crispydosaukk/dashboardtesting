import path from "path";
import fs from "fs";
import pool from "../../config/db.js"; // database connection

// GET ALL PRODUCTS
export const getProducts = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.user_id, p.cat_id, p.product_name, p.product_image, p.product_desc,
            p.product_price, p.product_discount_price, p.product_status, p.status
     FROM products p
     ORDER BY p.id DESC`
  );
  res.json(rows);
};

// ADD PRODUCT
export const addProduct = async (req, res) => {
  const { name, description, price, discountPrice, cat_id } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !price || !cat_id || !image) {
    return res.status(400).json({ message: "All required fields missing" });
  }

  const [[user]] = await pool.query("SELECT id FROM users LIMIT 1"); // temporary user or JWT user

  const [result] = await pool.query(
    `INSERT INTO products (user_id, cat_id, product_name, product_image, product_desc, product_price, product_discount_price)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user.id, cat_id, name, image, description, price, discountPrice]
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
};

// DELETE PRODUCT
export const removeProduct = async (req, res) => {
  const { id } = req.params;

  const [[product]] = await pool.query("SELECT product_image FROM products WHERE id = ?", [id]);

  if (product?.product_image) {
    const imgPath = path.join("public/uploads", product.product_image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  await pool.query("DELETE FROM products WHERE id = ?", [id]);
  res.json({ success: true });
};
