import db from "../../config/db.js";

export const getCategories = async (req, res) => {
  const userId = req.query.user_id;

  const query = `
    SELECT 
      id, 
      user_id, 
      category_name AS name, 
      category_image AS image,
      sort_order
    FROM categories
    WHERE user_id = ? AND category_status = 1 AND status = 1
    ORDER BY sort_order ASC, id ASC
  `;

  try {
    const [results] = await db.query(query, [userId]);

    const data = results.map(cat => {
      let cleanImage = cat.image ? cat.image.replace(/^\/?uploads\//, "") : null;

      return {
        id: cat.id,
        user_id: cat.user_id,
        name: cat.name,
        image:
          cleanImage
            ? `${req.protocol}://${req.get("host")}/uploads/${cleanImage}`
            : `${req.protocol}://${req.get("host")}/uploads/default_category.png`,
        sort_order: cat.sort_order
      };
    });

    res.json({ status: 1, data });
  } catch (err) {
    console.error("Category API Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};
