// src/models/categoryModel.js
import db from "../config/db.js";

/* ===========================================
   GET ALL CATEGORIES (MUST RETURN sort_order)
=========================================== */
export async function getAllCategories(userId) {
  const [rows] = await db.execute(
    `SELECT 
        id,
        category_name AS name,
        category_image AS image,
        status,
        sort_order
     FROM categories
     WHERE user_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [userId]
  );
  return rows;
}

/* ===========================================
   CREATE CATEGORY
=========================================== */
export async function createCategory(userId, name, imagePath) {
  const [[maxOrder]] = await db.execute(
    "SELECT IFNULL(MAX(sort_order), 0) AS maxOrder FROM categories WHERE user_id = ?",
    [userId]
  );

  const newOrder = maxOrder.maxOrder + 1;

  const [result] = await db.execute(
    `INSERT INTO categories 
     (user_id, category_name, category_image, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, NOW(), NOW())`,
    [userId, name, imagePath, newOrder]
  );

  return {
    id: result.insertId,
    name,
    image: imagePath,
    status: 1,
    sort_order: newOrder,
  };
}

/* ===========================================
   DELETE CATEGORY (Soft Delete Optional)
=========================================== */
export async function deleteCategory(id, userId) {
  await db.execute(
    "DELETE FROM categories WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return true;
}
