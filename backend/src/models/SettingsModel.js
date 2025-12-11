// backend/models/SettingsModel.js
import db from "../config/db.js";

export async function getSettingsModel() {
  const [rows] = await db.query(
    "SELECT id, signup_flat_amount, referral_flat_amount, minimum_order FROM settings ORDER BY id ASC LIMIT 1"
  );

  if (rows.length === 0) {
    return {
      id: null,
      signup_flat_amount: 0.0,
      referral_flat_amount: 0.0,
      minimum_order: 0.0,
    };
  }

  return rows[0];
}


export async function upsertSettingsModel({
  signup_flat_amount,
  referral_flat_amount,
  minimum_order,
}) {
  const signup = signup_flat_amount !== undefined && signup_flat_amount !== ""
    ? Number(signup_flat_amount)
    : 0;
  const referral = referral_flat_amount !== undefined && referral_flat_amount !== ""
    ? Number(referral_flat_amount)
    : 0;
  const minOrder = minimum_order !== undefined && minimum_order !== ""
    ? Number(minimum_order)
    : 0;

  // Check if row exists
  const [existing] = await db.query("SELECT id FROM settings LIMIT 1");

  if (existing.length > 0) {
    const id = existing[0].id;

    await db.query(
      `UPDATE settings
       SET signup_flat_amount = ?,
           referral_flat_amount = ?,
           minimum_order = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [signup, referral, minOrder, id]
    );

    const [rows] = await db.query(
      "SELECT id, signup_flat_amount, referral_flat_amount, minimum_order FROM settings WHERE id = ?",
      [id]
    );
    return rows[0];
  } else {
    const [result] = await db.query(
      `INSERT INTO settings (signup_flat_amount, referral_flat_amount, minimum_order)
       VALUES (?, ?, ?)`,
      [signup, referral, minOrder]
    );

    const [rows] = await db.query(
      "SELECT id, signup_flat_amount, referral_flat_amount, minimum_order FROM settings WHERE id = ?",
      [result.insertId]
    );
    return rows[0];
  }
}
