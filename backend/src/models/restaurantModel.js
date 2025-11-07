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
  const [res] = await conn.query(
    `INSERT INTO restaurant_details
     (user_id, restaurant_photo, restaurant_name, restaurant_address, restaurant_phonenumber,
      restaurant_email, restaurant_facebook, restaurant_twitter, restaurant_instagram, restaurant_linkedin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      payload.restaurant_photo ?? null,
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
}

/**
 * Update restaurant row
 */
async function updateRestaurant(conn, restaurantId, payload) {
  await conn.query(
    `UPDATE restaurant_details SET
      restaurant_photo = ?,
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
      payload.restaurant_photo ?? null,
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
  // Normalize payload by day (last wins)
  const byDay = {};
  for (const t of payloadTimings) {
    if (!t || !t.day) continue;
    byDay[t.day] = {
      opening_time: t.opening_time ?? null,
      closing_time: t.closing_time ?? null,
    };
  }

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
