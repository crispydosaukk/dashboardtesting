import db from "../../config/db.js";

// Get all restaurants
export const getRestaurants = async (req, res) => {
  const query = `
    SELECT user_id, restaurant_name AS name, restaurant_photo AS photo, restaurant_address AS address
    FROM restaurant_details
    ORDER BY id DESC
  `;

  try {
    const [results] = await db.query(query);

    const data = results.map(r => {
      let cleanPhoto = r.photo ? r.photo.replace(/^\/?uploads\//, "") : null;

      return {
        userid: r.user_id,
        name: r.name,
        address: r.address,
        photo: cleanPhoto || "default_restaurant.png",
      };
    });

    res.json({ status: 1, data });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};

