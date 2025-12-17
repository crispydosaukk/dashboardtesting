import db from "../../config/db.js";

export const getProfile = async (req, res) => {
  try {
    const customerId = req.user.id; // from auth middleware

    const [[customer]] = await db.execute(
      `
      SELECT 
        c.id,
        c.full_name,
        c.country_code,
        c.mobile_number,
        c.email,
        c.referral_code,
        COALESCE(w.balance, 0) AS wallet_balance
      FROM customers c
      LEFT JOIN customer_wallets w
        ON w.customer_id = c.id
      WHERE c.id = ?
      `,
      [customerId]
    );

    if (!customer) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
