// backend/src/models/permissionModel.js
import pool from "../config/db.js";

export async function createPermission(title) {
  const [result] = await pool.query(
    "INSERT INTO permissions (title, created_at, updated_at) VALUES (?, NOW(), NOW())",
    [title]
  );
  return result.insertId;
}

export async function listPermissions() {
  const [rows] = await pool.query(
    "SELECT id, title, created_at, updated_at FROM permissions WHERE deleted_at IS NULL ORDER BY id DESC"
  );
  return rows;
}

export async function updatePermission(id, title) {
  const [res] = await pool.query(
    "UPDATE permissions SET title = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [title, id]
  );
  return res.affectedRows; // 0 if not found
}

export async function softDeletePermission(id) {
  const [res] = await pool.query(
    "UPDATE permissions SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  return res.affectedRows; // 0 if not found
}
