// backend/controllers/admin/restaurantController.js
import jwt from "jsonwebtoken";
import {
  getRestaurantByUserId,
  upsertRestaurantForUser,
} from "../../models/RestaurantModel.js";

function extractUserId(req) {
  const header =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) ||
    (req.cookies && (req.cookies.token || req.cookies.auth));
  if (!header) return null;

  const token = typeof header === "string" && header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : String(header).trim();

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    return decoded?.id || decoded?.userId || decoded?.sub || null;
  } catch (err) {
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

  // req.body may contain strings if multipart/form-data is used.
  // Parse timings if it's a JSON string.
  let body = req.body || {};
  try {
    if (body.timings && typeof body.timings === "string") {
      body.timings = JSON.parse(body.timings);
    }
  } catch (err) {
    console.warn("Could not parse timings from request body:", err);
    return res.status(400).json({ success: false, message: "Invalid timings format" });
  }

  // If a file is uploaded via upload.single('photo'), multer populates req.file
  if (req.file && req.file.filename) {
    // store the public path for frontend
    body.restaurant_photo = `/uploads/${req.file.filename}`;
  }

  // Basic payload validation
  if (!body || typeof body !== "object") {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }

  try {
    const updated = await upsertRestaurantForUser(userId, body);
    return res.json({ success: true, message: "Saved successfully", data: updated });
  } catch (err) {
    console.error("Error upserting restaurant:", err);
    console.error("Request body (truncated):", JSON.stringify(body).slice(0, 2000));
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}
