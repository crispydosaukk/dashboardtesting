import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

export const getCategories = async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, category_name AS name, category_image AS image FROM categories ORDER BY id DESC"
  );
  res.json(rows);
};

export const addCategory = async (req, res) => {
  const { name } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!name || !image)
    return res.status(400).json({ message: "Name and Image required" });

  const [result] = await pool.query(
    "INSERT INTO categories (category_name, category_image) VALUES (?, ?)",
    [name, image]
  );

  res.json({ id: result.insertId, name, image });
};

export const removeCategory = async (req, res) => {
  const { id } = req.params;

  const [[cat]] = await pool.query(
    "SELECT category_image FROM categories WHERE id = ?",
    [id]
  );

  if (cat?.category_image) {
    const img = path.join("public/uploads", cat.category_image);
    if (fs.existsSync(img)) fs.unlinkSync(img);
  }

  await pool.query("DELETE FROM categories WHERE id = ?", [id]);
  res.json({ success: true });
};
