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
      `SELECT id, day, opening_time, closing_time
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
        restaurant_email, restaurant_facebook, restaurant_twitter, restaurant_instagram, restaurant_linkedin, restaurant_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        payload.restaurant_photo ?? null,
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
        restaurant_photo = ?,
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
        payload.restaurant_photo ?? null,
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

    if (opening_time_raw === null && closing_time_raw === null) {
      // skip -> will delete DB row if exists
      continue;
    }

    const opening_time = opening_time_raw === null ? "00:00:00" : opening_time_raw;
    const closing_time = closing_time_raw === null ? "00:00:00" : closing_time_raw;

    byDay[day] = { opening_time, closing_time };
  }

  try {
    const [existing] = await conn.query(
      `SELECT id, day FROM restaurant_timings WHERE restaurant_id = ?`,
      [restaurantId]
    );

    const existingByDay = {};
    for (const r of existing) existingByDay[r.day] = r.id;

    const daysToDelete = existing.map((r) => r.day).filter((d) => !(d in byDay));
    if (daysToDelete.length) {
      const placeholders = daysToDelete.map(() => "?").join(",");
      await conn.query(
        `DELETE FROM restaurant_timings WHERE restaurant_id = ? AND day IN (${placeholders})`,
        [restaurantId, ...daysToDelete]
      );
    }

    for (const day of Object.keys(byDay)) {
      const t = byDay[day];
      if (existingByDay[day]) {
        await conn.query(
          `UPDATE restaurant_timings
           SET opening_time = ?, closing_time = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [t.opening_time, t.closing_time, existingByDay[day]]
        );
      } else {
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
