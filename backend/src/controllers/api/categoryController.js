import db from "../../config/db.js";

export const getCategories = async (req, res) => {
  const userId = req.query.user_id;

  const query = `
    SELECT id, user_id, category_name AS name, category_image AS image
    FROM categories
    WHERE user_id = ? AND category_status = 1 AND status = 1
    ORDER BY id DESC
  `;

  try {
    const [results] = await db.query(query, [userId]);

    const data = results.map(cat => ({
      id: cat.id,
      user_id: cat.user_id,
      name: cat.name,
      image: cat.image || null,   // NO CLEANING (DB ALREADY HAS CORRECT NAME)
    }));

    res.json({ status: 1, data });
  } catch (err) {
    console.error("Category API Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};
