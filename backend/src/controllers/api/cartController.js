// controllers/api/cartController.js
import db from "../../config/db.js";

// Add or update cart item
export const addToCart = async (req, res) => {
  const {
    customer_id,
    user_id,
    product_id,
    product_name,
    product_price,
    product_tax = 0,
    product_quantity = 1,
    textfield = "",
  } = req.body;

  if (!customer_id || !user_id || !product_id || !product_name || product_price == null) {
    return res.status(400).json({ status: 0, message: "Missing required fields" });
  }

  try {
    const [existingRows] = await db.query(
      "SELECT * FROM cart WHERE customer_id = ? AND product_id = ?",
      [customer_id, product_id]
    );

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const newQuantity = Number(existing.product_quantity) + Number(product_quantity);
      const updatedText = textfield?.trim() === "" ? existing.textfield : textfield;

      await db.query(
        `UPDATE cart SET product_quantity = ?, textfield = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newQuantity, updatedText, existing.id]
      );

      return res.json({
        status: 1,
        message: "Cart updated successfully",
        data: { id: existing.id, product_quantity: newQuantity, textfield: updatedText },
      });
    }

    const [result] = await db.query(
      `INSERT INTO cart 
        (customer_id, user_id, product_id, product_name, product_price, product_tax, product_quantity, textfield)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, user_id, product_id, product_name, product_price, product_tax, product_quantity, textfield]
    );

    res.json({
      status: 1,
      message: "Added to cart successfully",
      data: { id: result.insertId, product_quantity, textfield, product_name, product_price },
    });
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ status: 0, message: "Database error" });
  }
};

// Get cart items for a customer
export const getCart = async (req, res) => {
  const { customer_id } = req.query;

  if (!customer_id) {
    return res.status(400).json({ status: 0, message: "customer_id is required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM cart WHERE customer_id = ? ORDER BY id DESC",
      [customer_id]
    );

    res.json({ status: 1, data: rows });
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ status: 0, message: "Database error" });
  }
};

// Remove a cart item
export const removeFromCart = async (req, res) => {
  const id = req.body.id ?? req.body.cart_id ?? req.body.cartId;

  if (!id) {
    return res.status(400).json({ status: 0, message: "Cart item id is required" });
  }

  try {
    await db.query("DELETE FROM cart WHERE id = ?", [id]);
    res.json({ status: 1, message: "Item removed successfully" });
  } catch (err) {
    console.error("removeFromCart error:", err);
    res.status(500).json({ status: 0, message: "Database error" });
  }
};
