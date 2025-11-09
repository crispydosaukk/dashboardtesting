import db from "../config/db.js";

export async function getAllCategories(userId) {
  const [rows] = await db.execute(
    "SELECT * FROM categories WHERE user_id = ? AND status = 1 ORDER BY id DESC",
    [userId]
  );
  return rows;
}

export async function createCategory(userId, name, imagePath) {
  const [result] = await db.execute(
    `INSERT INTO categories (user_id, category_name, category_image, category_status, status, created_at, updated_at)
     VALUES (?, ?, ?, 1, 1, NOW(), NOW())`,
    [userId, name, imagePath]
  );
  return result.insertId;
}

export async function deleteCategory(id, userId) {
  await db.execute(
    "UPDATE categories SET status = 0 WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return true;
}
