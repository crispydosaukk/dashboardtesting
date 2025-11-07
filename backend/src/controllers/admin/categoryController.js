import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

export const getCategories = async (req, res) => {
  const userId = req.user.id; // get logged-in user

  const [rows] = await pool.query(
    "SELECT id, category_name AS name, category_image AS image FROM categories WHERE user_id = ? ORDER BY id DESC",
    [userId]
  );

  res.json(rows);
};

export const addCategory = async (req, res) => {
  const userId = req.user.id; // get logged-in user
  const { name } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !image)
    return res.status(400).json({ message: "Name and Image required" });

  const [result] = await pool.query(
    "INSERT INTO categories (category_name, category_image, user_id) VALUES (?, ?, ?)",
    [name, image, userId]
  );

  res.json({ id: result.insertId, name, image });
};

export const removeCategory = async (req, res) => {
  const userId = req.user.id; 
  const { id } = req.params;

  const [[cat]] = await pool.query(
    "SELECT category_image FROM categories WHERE id = ? AND user_id = ?",
    [id, userId]
  );

  if (!cat) return res.status(404).json({ message: "Not found or Not allowed" });

  if (cat?.category_image) {
    const img = path.join("public/uploads", cat.category_image);
    if (fs.existsSync(img)) fs.unlinkSync(img);
  }

  await pool.query("DELETE FROM categories WHERE id = ? AND user_id = ?", [id, userId]);

  res.json({ success: true });
};


export const updateCategory = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name } = req.body;
  const image = req.file ? req.file.filename : null;

  const [[existing]] = await pool.query(
    "SELECT category_image FROM categories WHERE id = ? AND user_id = ?",
    [id, userId]
  );

  if (!existing) return res.status(404).json({ message: "Not found" });

  // Only delete old image if a new one is uploaded
  if (image && existing.category_image) {
    const oldPath = path.join("public/uploads", existing.category_image);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await pool.query(
    "UPDATE categories SET category_name = ?, category_image = IFNULL(?, category_image) WHERE id = ? AND user_id = ?",
    [name, image, id, userId]
  );

  res.json({
    id: Number(id),
    name,
    image: image || existing.category_image,
  });
};
