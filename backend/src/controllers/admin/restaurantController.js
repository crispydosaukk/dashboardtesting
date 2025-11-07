// backend/src/controllers/admin/restaurantController.js
import { getRestaurantByUserId, upsertRestaurantForUser } from "../../models/restaurantModel.js";

/**
 * Helper to resolve user id:
 * - prefer req.user.id (real auth)
 * - fall back to req.body.user_id for quick local/dev testing (use only locally)
 */
function resolveUserId(req) {
  if (req.user && req.user.id) return Number(req.user.id);
  if (req.body && req.body.user_id) return Number(req.body.user_id);
  return null;
}

/**
 * GET /api/restaurant
 */
export async function show(req, res) {
  try {
    const userId = resolveUserId(req);
    // if (!userId) {
    //   return res.status(401).json({ success: false, message: "Unauthorized (missing user)" });
    // }

    const restaurant = await getRestaurantByUserId(userId);
    return res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    console.error("restaurantController.show error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/restaurant
 * Creates or updates restaurant + timings
 */
export async function upsert(req, res) {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized (missing user)" });
    }

    // Build payload defensively
    const payload = {
      restaurant_photo: req.body.restaurant_photo ?? null,
      restaurant_name: req.body.restaurant_name ?? null,
      restaurant_address: req.body.restaurant_address ?? null,
      restaurant_phonenumber: req.body.restaurant_phonenumber ?? null,
      restaurant_email: req.body.restaurant_email ?? null,
      restaurant_facebook: req.body.restaurant_facebook ?? null,
      restaurant_twitter: req.body.restaurant_twitter ?? null,
      restaurant_instagram: req.body.restaurant_instagram ?? null,
      restaurant_linkedin: req.body.restaurant_linkedin ?? null,
      timings: Array.isArray(req.body.timings)
        ? req.body.timings.map((t) => ({
            day: t.day,
            opening_time: t.opening_time ?? null,
            closing_time: t.closing_time ?? null,
          }))
        : [],
    };

    // Validate timings days
    const validDays = new Set([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);

    const seen = new Set();
    for (const t of payload.timings) {
      if (!t || !t.day || !validDays.has(t.day)) {
        return res.status(400).json({ success: false, message: `Invalid day in timings: ${t && t.day}` });
      }
      if (seen.has(t.day)) {
        return res.status(400).json({ success: false, message: `Duplicate day in timings: ${t.day}` });
      }
      seen.add(t.day);
    }

    const restaurant = await upsertRestaurantForUser(userId, payload);
    return res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    console.error("restaurantController.upsert error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
}
