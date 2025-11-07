import jwt from "jsonwebtoken";
import {
  getRestaurantByUserId,
  upsertRestaurantForUser,
} from "../../models/restaurantModel.js";

function extractUserId(req) {
  const header =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) ||
    (req.cookies && (req.cookies.token || req.cookies.auth)); // optional cookie fallback
  if (!header) return null;

  // Accept "Bearer <token>" or raw token string
  const token = typeof header === "string" && header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : String(header).trim();

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    // support common id claim names
    return decoded?.id || decoded?.userId || decoded?.sub || null;
  } catch (err) {
    // log to help debugging invalid token issues
    console.error("JWT verify error:", err && err.message ? err.message : err);
    return null;
  }
}

export async function show(req, res) {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized: invalid or missing token" });

  try {
    const restaurant = await getRestaurantByUserId(userId);
    return res.json({ success: true, data: restaurant || null });
  } catch (err) {
    console.error("Error fetching restaurant:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function upsert(req, res) {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized: invalid or missing token" });

  // Basic payload validation
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }

  try {
    const updated = await upsertRestaurantForUser(userId, req.body);
    return res.json({ success: true, message: "Saved successfully", data: updated });
  } catch (err) {
    console.error("Error upserting restaurant:", err);
    // log incoming body to help reproduce DB error (do not send internals to client)
    console.error("Request body:", JSON.stringify(req.body).slice(0, 2000));
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}
