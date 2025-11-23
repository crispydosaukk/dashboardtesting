import db from "../../config/db.js";

export const addToCart = async (req, res) => {
  const {
    customer_id,
    user_id,
    product_id,
    product_name,
    product_price,
    product_tax = 0,
    product_quantity = 1,
    textfield = ""
  } = req.body;

  // Validate required fields
  if (!customer_id || !user_id || !product_id || !product_name || !product_price) {
    return res.status(400).json({ status: 0, message: "Missing required fields" });
  }

  try {
    // Check if this product already exists in the cart for this customer
    const [existingRows] = await db.query(
      "SELECT * FROM cart WHERE customer_id = ? AND product_id = ?",
      [customer_id, product_id]
    );

    if (existingRows.length > 0) {
      // Product already in cart, update the quantity
      const existingCartId = existingRows[0].id;
      const newQuantity = existingRows[0].product_quantity + product_quantity;

      await db.query(
        "UPDATE cart SET product_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [newQuantity, existingCartId]
      );

      return res.json({ status: 1, message: "Cart updated successfully", product_quantity: newQuantity });
    }

    await db.query(
      `INSERT INTO cart 
       (customer_id, user_id, product_id, product_name, product_price, product_tax, product_quantity, textfield)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, user_id, product_id, product_name, product_price, product_tax, product_quantity, textfield]
    );

    res.json({ status: 1, message: "Added to cart successfully" });
  } catch (err) {
    console.error("Cart API Error:", err);
    res.status(500).json({ status: 0, message: "Database error" });
  }
};
