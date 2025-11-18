import db from "../../config/db.js";

// Get all restaurants
export const getRestaurants = async (req, res) => {
  const query = `
    SELECT user_id, restaurant_name AS name, restaurant_photo AS photo, restaurant_address AS address
    FROM restaurant_details
    ORDER BY id DESC
  `;

  try {
    const [results] = await db.query(query); // <-- await & destructure
    // If no photo, set default placeholder
    const data = results.map(r => ({
      userid: r.user_id,
      name: r.name,
      address: r.address,
      photo: r.photo || "default_restaurant.png"
    }));

    res.json({ status: 1, data });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};
