// backend/models/restaurantModel.js
import pool from "../config/db.js";

/**
 * Get restaurant (and timings) by user id
 * returns null if none
 */
export async function getRestaurantByUserId(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT rd.* FROM restaurant_details rd WHERE rd.user_id = ? LIMIT 1`,
      [userId]
    );

    if (!rows.length) return null;
    const restaurant = rows[0];

    const [timings] = await conn.query(
      `SELECT id, day, opening_time, closing_time, is_active
       FROM restaurant_timings
       WHERE restaurant_id = ?
       ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`,
      [restaurant.id]
    );

    restaurant.timings = Array.isArray(timings) ? timings : [];
    return restaurant;
  } finally {
    conn.release();
  }
}

/**
 * Insert a restaurant row and return inserted id
 */
async function insertRestaurant(conn, userId, payload) {
  try {
    const [res] = await conn.query(
      `INSERT INTO restaurant_details
        (user_id, restaurant_name, restaurant_address, restaurant_phonenumber,
        restaurant_email, restaurant_facebook, restaurant_twitter, restaurant_instagram,
        restaurant_linkedin, parking_info, instore,kerbside,restaurant_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.restaurant_name ?? null,
        payload.restaurant_address ?? null,
        payload.restaurant_phonenumber ?? null,
        payload.restaurant_email ?? null,
        payload.restaurant_facebook ?? null,
        payload.restaurant_twitter ?? null,
        payload.restaurant_instagram ?? null,
        payload.restaurant_linkedin ?? null,
        payload.parking_info ?? null,
        payload.instore ?? 0,
        payload.kerbside ?? 0,
        payload.restaurant_photo ?? null,
      ]
    );
    return res.insertId;
  } catch (err) {
    console.error("insertRestaurant error:", err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : err);
    throw err;
  }
}

async function updateRestaurant(conn, restaurantId, payload) {
  try {
    // base fields
    const fields = [
      "restaurant_name",
      "restaurant_address",
      "restaurant_phonenumber",
      "restaurant_email",
      "restaurant_facebook",
      "restaurant_twitter",
      "restaurant_instagram",
      "restaurant_linkedin",
      "parking_info",
      "instore",
      "kerbside"
    ];

    const values = [
      payload.restaurant_name ?? null,
      payload.restaurant_address ?? null,
      payload.restaurant_phonenumber ?? null,
      payload.restaurant_email ?? null,
      payload.restaurant_facebook ?? null,
      payload.restaurant_twitter ?? null,
      payload.restaurant_instagram ?? null,
      payload.restaurant_linkedin ?? null,
      payload.parking_info ?? null,
      payload.instore ?? 0,
      payload.kerbside ?? 0,
    ];

    // 👇 Only update restaurant_photo if it exists in payload
    if (Object.prototype.hasOwnProperty.call(payload, "restaurant_photo")) {
      fields.splice(8, 0, "restaurant_photo"); // before parking_info
      values.splice(8, 0, payload.restaurant_photo ?? null);
    }

    const setClause = fields.map((f) => `${f} = ?`).join(", ");

    await conn.query(
      `UPDATE restaurant_details
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [...values, restaurantId]
    );
  } catch (err) {
    console.error(
      "updateRestaurant error:",
      err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : err
    );
    throw err;
  }
}


/**
 * Synchronize timings for a restaurant:
 * - payloadTimings: [{ day, opening_time, closing_time, is_active }, ...]
 *
 * Behavior:
 * - If a day is present in payloadTimings -> upsert (insert or update) with provided is_active and times.
 * - If a day is NOT present in payloadTimings but exists in DB -> delete that DB row.
 */
async function syncTimings(conn, restaurantId, payloadTimings = []) {
  const validDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  function normalizeTimeForSql(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === "") return null;
    if (/^\d{1,2}:\d{2}$/.test(s)) return s.length === 5 ? s + ":00" : s;
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
    console.warn("syncTimings: invalid time format, treating as null:", v);
    return null;
  }

  // Build a map day -> { opening_time, closing_time, is_active }
  const byDay = {};
  for (const t of payloadTimings) {
    if (!t || !t.day) continue;
    const raw = String(t.day).trim();
    const day = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (!validDays.includes(day)) {
      console.warn("syncTimings: skipping invalid day value:", t.day);
      continue;
    }

    const opening_time_raw = normalizeTimeForSql(t.opening_time);
    const closing_time_raw = normalizeTimeForSql(t.closing_time);

    // If times are null, we will store "00:00:00" as placeholder (or keep null if you prefer).
    // Here we store "00:00:00" to avoid timezone/time issues; is_active controls if day is on/off.
    const opening_time = opening_time_raw === null ? "00:00:00" : opening_time_raw;
    const closing_time = closing_time_raw === null ? "00:00:00" : closing_time_raw;

    const is_active = (typeof t.is_active === "boolean") ? (t.is_active ? 1 : 0)
      : (t.is_active === 1 || t.is_active === "1" || t.is_active === "true") ? 1 : 0;

    byDay[day] = { opening_time, closing_time, is_active };
  }

  try {
    const [existing] = await conn.query(
      `SELECT id, day FROM restaurant_timings WHERE restaurant_id = ?`,
      [restaurantId]
    );

    const existingByDay = {};
    for (const r of existing) existingByDay[r.day] = r.id;

    // Delete DB rows for days absent in payload
    const daysToDelete = existing.map((r) => r.day).filter((d) => !(d in byDay));
    if (daysToDelete.length) {
      const placeholders = daysToDelete.map(() => "?").join(",");
      await conn.query(
        `DELETE FROM restaurant_timings WHERE restaurant_id = ? AND day IN (${placeholders})`,
        [restaurantId, ...daysToDelete]
      );
    }

    // Upsert all supplied days
    for (const day of Object.keys(byDay)) {
      const t = byDay[day];
      if (existingByDay[day]) {
        await conn.query(
          `UPDATE restaurant_timings
           SET opening_time = ?, closing_time = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [t.opening_time, t.closing_time, t.is_active, existingByDay[day]]
        );
      } else {
        await conn.query(
          `INSERT INTO restaurant_timings (restaurant_id, day, opening_time, closing_time, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [restaurantId, day, t.opening_time, t.closing_time, t.is_active]
        );
      }
    }
  } catch (err) {
    console.error("syncTimings error:", err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : err);
    throw err;
  }
}

/**
 * Upsert (create or update) restaurant and timings for a user
 * Returns the restaurant object (with timings) after changes
 */
export async function upsertRestaurantForUser(userId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id FROM restaurant_details WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    let restaurantId;
    if (rows.length) {
      restaurantId = rows[0].id;
      await updateRestaurant(conn, restaurantId, payload);
    } else {
      restaurantId = await insertRestaurant(conn, userId, payload);
    }

    if (Array.isArray(payload.timings)) {
      await syncTimings(conn, restaurantId, payload.timings);
    }

    await conn.commit();

    return await getRestaurantByUserId(userId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
