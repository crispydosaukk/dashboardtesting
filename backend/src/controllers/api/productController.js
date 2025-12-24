import db from "../../config/db.js";

export const getProducts = async (req, res) => {
  const userId = req.query.user_id;
  const catId = req.query.cat_id;

  if (!userId || !catId) {
    return res.status(400).json({
      status: 0,
      message: "user_id and cat_id are required",
      data: []
    });
  }

  const query = `
    SELECT 
      id, 
      user_id, 
      product_name AS name, 
      product_image AS image, 
      product_desc AS description, 
      product_price, 
      product_discount_price,
      contains,
      sort_order
    FROM products
    WHERE user_id = ?
      AND cat_id = ?
      AND product_status = 1
      AND status = 1
    ORDER BY sort_order ASC, id ASC
  `;

  try {
    const [results] = await db.query(query, [userId, catId]);

    const data = results.map(p => {
      let cleanImage = p.image ? p.image.replace(/^\/?uploads\//, "") : null;

      return {
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        description: p.description,
        price: p.product_price,
        discount_price: p.product_discount_price,
        contains: p.contains ? JSON.parse(p.contains) : [],
        sort_order: p.sort_order,
        image: cleanImage
          ? `${req.protocol}://${req.get("host")}/uploads/${cleanImage}`
          : `${req.protocol}://${req.get("host")}/uploads/default_product.png`
      };
    });

    res.json({ status: 1, data });
  } catch (err) {
    console.error("Product API Error:", err);
    res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};
