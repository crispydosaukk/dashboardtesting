// backend/models/SettingsModel.js
import db from "../config/db.js";

export async function getSettingsModel() {
  const [rows] = await db.query(
    `SELECT 
       id,
       signup_flat_amount,
       referral_flat_amount,
       minimum_order,
       minimum_cart_total,
       loyalty_points_per_gbp,
       loyalty_redeem_points,
       loyalty_redeem_value,
       loyalty_available_after_hours,
       loyalty_expiry_days
     FROM settings
     ORDER BY id ASC
     LIMIT 1`
  );

  if (rows.length === 0) {
    return {
      id: null,
      signup_flat_amount: 0.0,
      referral_flat_amount: 0.0,
      minimum_order: 0.0,
      minimum_cart_total: 0.0,

      loyalty_points_per_gbp: 1,
      loyalty_redeem_points: 10,
      loyalty_redeem_value: 1.0,
      loyalty_available_after_hours: 24,
      loyalty_expiry_days: 30,
    };
  }

  return rows[0];
}

export async function upsertSettingsModel({
  signup_flat_amount,
  referral_flat_amount,
  minimum_order,
  minimum_cart_total,
  loyalty_points_per_gbp,
  loyalty_redeem_points,
  loyalty_redeem_value,
  loyalty_available_after_hours,
  loyalty_expiry_days,
}) {
  const signup =
    signup_flat_amount !== undefined && signup_flat_amount !== ""
      ? Number(signup_flat_amount)
      : 0;

  const referral =
    referral_flat_amount !== undefined && referral_flat_amount !== ""
      ? Number(referral_flat_amount)
      : 0;

  const minOrder =
    minimum_order !== undefined && minimum_order !== ""
      ? Number(minimum_order)
      : 0;

  const minCartTotal =
    minimum_cart_total !== undefined && minimum_cart_total !== ""
      ? Number(minimum_cart_total)
      : 0;

  // ✅ loyalty dynamic conversions (existing logic untouched)
  const pointsPerGbp =
    loyalty_points_per_gbp !== undefined && loyalty_points_per_gbp !== ""
      ? Number(loyalty_points_per_gbp)
      : 1;

  const redeemPoints =
    loyalty_redeem_points !== undefined && loyalty_redeem_points !== ""
      ? Number(loyalty_redeem_points)
      : 10;

  const redeemValue =
    loyalty_redeem_value !== undefined && loyalty_redeem_value !== ""
      ? Number(loyalty_redeem_value)
      : 1;

  const availableHours =
    loyalty_available_after_hours !== undefined &&
    loyalty_available_after_hours !== ""
      ? Number(loyalty_available_after_hours)
      : 24;

  const expiryDays =
    loyalty_expiry_days !== undefined && loyalty_expiry_days !== ""
      ? Number(loyalty_expiry_days)
      : 30;

  // Check if row exists
  const [existing] = await db.query("SELECT id FROM settings LIMIT 1");

  if (existing.length > 0) {
    const id = existing[0].id;

    await db.query(
      `UPDATE settings
       SET signup_flat_amount = ?,
           referral_flat_amount = ?,
           minimum_order = ?,
           minimum_cart_total = ?,
           loyalty_points_per_gbp = ?,
           loyalty_redeem_points = ?,
           loyalty_redeem_value = ?,
           loyalty_available_after_hours = ?,
           loyalty_expiry_days = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        signup,
        referral,
        minOrder,
        minCartTotal,
        pointsPerGbp,
        redeemPoints,
        redeemValue,
        availableHours,
        expiryDays,
        id,
      ]
    );

    const [rows] = await db.query(
      `SELECT 
         id,
         signup_flat_amount,
         referral_flat_amount,
         minimum_order,
         minimum_cart_total,
         loyalty_points_per_gbp,
         loyalty_redeem_points,
         loyalty_redeem_value,
         loyalty_available_after_hours,
         loyalty_expiry_days
       FROM settings
       WHERE id = ?`,
      [id]
    );

    return rows[0];
  } else {
    const [result] = await db.query(
      `INSERT INTO settings
       (signup_flat_amount,
        referral_flat_amount,
        minimum_order,
        minimum_cart_total,
        loyalty_points_per_gbp,
        loyalty_redeem_points,
        loyalty_redeem_value,
        loyalty_available_after_hours,
        loyalty_expiry_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        signup,
        referral,
        minOrder,
        minCartTotal,
        pointsPerGbp,
        redeemPoints,
        redeemValue,
        availableHours,
        expiryDays,
      ]
    );

    const [rows] = await db.query(
      `SELECT 
         id,
         signup_flat_amount,
         referral_flat_amount,
         minimum_order,
         minimum_cart_total,
         loyalty_points_per_gbp,
         loyalty_redeem_points,
         loyalty_redeem_value,
         loyalty_available_after_hours,
         loyalty_expiry_days
       FROM settings
       WHERE id = ?`,
      [result.insertId]
    );

    return rows[0];
  }
}
