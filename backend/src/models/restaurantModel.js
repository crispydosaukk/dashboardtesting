// backend/src/models/restaurantModel.js
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
      `SELECT id, day, opening_time, closing_time
       FROM restaurant_timings
       WHERE restaurant_id = ?
       ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`,
      [restaurant.id]
    );

    // ensure timings exists always as array
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
        restaurant_email, restaurant_facebook, restaurant_twitter, restaurant_instagram, restaurant_linkedin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    );
    return res.insertId;
  } catch (err) {
    console.error("insertRestaurant error:", err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : err);
    throw err;
  }
}

/**
 * Update restaurant row
 */
async function updateRestaurant(conn, restaurantId, payload) {
  try {
    await conn.query(
      `UPDATE restaurant_details SET
        restaurant_name = ?,
        restaurant_address = ?,
        restaurant_phonenumber = ?,
        restaurant_email = ?,
        restaurant_facebook = ?,
        restaurant_twitter = ?,
        restaurant_instagram = ?,
        restaurant_linkedin = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        payload.restaurant_name ?? null,
        payload.restaurant_address ?? null,
        payload.restaurant_phonenumber ?? null,
        payload.restaurant_email ?? null,
        payload.restaurant_facebook ?? null,
        payload.restaurant_twitter ?? null,
        payload.restaurant_instagram ?? null,
        payload.restaurant_linkedin ?? null,
        restaurantId,
      ]
    );
  } catch (err) {
    console.error("updateRestaurant error:", err && (err.sqlMessage || err.message) ? (err.sqlMessage || err.message) : err);
    throw err;
  }
}

/**
 * Synchronize timings for a restaurant:
 * - payloadTimings: [{ day, opening_time, closing_time }, ...]
 * Behavior:
 * - Update existing rows (match by day)
 * - Insert missing days
 * - Delete DB rows missing in payload
 */
async function syncTimings(conn, restaurantId, payloadTimings = []) {
  // allowed canonical day names
  const validDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  // helper: normalize a time value to HH:MM:SS or null
  function normalizeTimeForSql(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === "") return null;
    // accept HH:MM or HH:MM:SS (basic validation)
    if (/^\d{1,2}:\d{2}$/.test(s)) return s.length === 5 ? s + ":00" : s;
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
    // unknown format
    console.warn("syncTimings: invalid time format, treating as null:", v);
    return null;
  }

  // Normalize payload by day (last wins) and validate day names
  const byDay = {};
  for (const t of payloadTimings) {
    if (!t || !t.day) continue;
    const raw = String(t.day).trim();
    const day = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (!validDays.includes(day)) {
      console.warn("syncTimings: skipping invalid day value:", t.day);
      continue;
    }

    // Normalize times
    const opening_time_raw = normalizeTimeForSql(t.opening_time);
    const closing_time_raw = normalizeTimeForSql(t.closing_time);

    // If both times are empty/null, treat as instruction to remove this day (skip adding)
    if (opening_time_raw === null && closing_time_raw === null) {
      console.info(`syncTimings: skipping day ${day} because both times empty -> will be deleted if exists`);
      continue;
    }

    // For NOT NULL columns: if one side is missing, default to "00:00:00"
    const opening_time = opening_time_raw === null ? "00:00:00" : opening_time_raw;
    const closing_time = closing_time_raw === null ? "00:00:00" : closing_time_raw;

    byDay[day] = { opening_time, closing_time };
  }

  try {
    // fetch existing timings for restaurant
    const [existing] = await conn.query(
      `SELECT id, day FROM restaurant_timings WHERE restaurant_id = ?`,
      [restaurantId]
    );

    const existingByDay = {};
    for (const r of existing) existingByDay[r.day] = r.id;

    // Delete days present in DB but not in payload
    const daysToDelete = existing.map((r) => r.day).filter((d) => !(d in byDay));
    if (daysToDelete.length) {
      const placeholders = daysToDelete.map(() => "?").join(",");
      await conn.query(
        `DELETE FROM restaurant_timings WHERE restaurant_id = ? AND day IN (${placeholders})`,
        [restaurantId, ...daysToDelete]
      );
    }

    // Insert or update payload days
    for (const day of Object.keys(byDay)) {
      const t = byDay[day];
      if (existingByDay[day]) {
        // update existing row
        await conn.query(
          `UPDATE restaurant_timings
           SET opening_time = ?, closing_time = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [t.opening_time, t.closing_time, existingByDay[day]]
        );
      } else {
        // insert new row
        await conn.query(
          `INSERT INTO restaurant_timings (restaurant_id, day, opening_time, closing_time)
           VALUES (?, ?, ?, ?)`,
          [restaurantId, day, t.opening_time, t.closing_time]
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

    // find existing restaurant
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

    // sync timings if provided
    if (Array.isArray(payload.timings)) {
      await syncTimings(conn, restaurantId, payload.timings);
    }

    await conn.commit();

    // return fresh object
    return await getRestaurantByUserId(userId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
