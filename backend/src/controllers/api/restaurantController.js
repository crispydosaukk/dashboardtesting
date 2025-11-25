// restaurantController.js
import db from "../../config/db.js";

// Fetch all restaurants
export const getRestaurants = async (req, res) => {
  const query = `
    SELECT user_id, restaurant_name AS name, restaurant_photo AS photo, restaurant_address AS address
    FROM restaurant_details
    ORDER BY id DESC
  `;

  try {
    const [results] = await db.query(query);

    const data = results.map(r => {
      const cleanPhoto = r.photo ? r.photo.replace(/^\/?uploads\//, "") : null;
      return {
        userid: r.user_id,
        name: r.name,
        address: r.address,
        photo: cleanPhoto
          ? `${req.protocol}://${req.get("host")}/uploads/${cleanPhoto}`
          : `${req.protocol}://${req.get("host")}/uploads/default_restaurant.png`
      };
    });

    res.json({ status: 1, data });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};

// Fetch single restaurant by user_id
export const getRestaurantById = async (req, res) => {
  const { id } = req.params; // user_id
  const query = `SELECT * FROM restaurant_details WHERE user_id = ?`;

  try {
    const [results] = await db.query(query, [id]);
    if (!results.length) {
      return res.json({ status: 0, message: "Restaurant not found", data: [] });
    }

    const r = results[0];
    const cleanPhoto = r.restaurant_photo ? r.restaurant_photo.replace(/^\/?uploads\//, "") : null;

    const restaurant = {
      id: r.id,
      userid: r.user_id,
      restaurant_name: r.restaurant_name,
      restaurant_address: r.restaurant_address,
      restaurant_phonenumber: r.restaurant_phonenumber,
      restaurant_photo: cleanPhoto
        ? `${req.protocol}://${req.get("host")}/uploads/${cleanPhoto}`
        : `${req.protocol}://${req.get("host")}/uploads/default_restaurant.png`,
    };

    res.json({ status: 1, data: [restaurant] });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};

// Get restaurant timings by restaurant_id
export const getRestaurantTimings = async (req, res) => {
  const { restaurant_id } = req.params;

  const query = `
    SELECT day, opening_time, closing_time, is_active
    FROM restaurant_timings
    WHERE restaurant_id = ?
    ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  `;

  try {
    const [results] = await db.query(query, [restaurant_id]);

    if (!results.length) {
      return res.json({ status: 0, message: "No timings found", data: [] });
    }

    res.json({ status: 1, data: results });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};

