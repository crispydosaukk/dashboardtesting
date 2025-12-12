// controllers/api/walletController.js
import db from "../../config/db.js";

export const getWalletSummary = async (req, res) => {
  try {
    const customerId = req.user.id;

    // 🔹 Wallet balance
    const [[walletRow]] = await db.execute(
      "SELECT balance FROM customer_wallets WHERE customer_id = ?",
      [customerId]
    );
    const walletBalance = Number(walletRow?.balance || 0);

    // 🔹 TODO: you can later compute these from loyalty_earnings / referrals
    const loyaltyPoints = 0;
    const referralCredits = 0;

    // 🔹 Last 10 wallet transactions as history
    const [rows] = await db.execute(
      `SELECT id, transaction_type, amount, balance_after, source, description, created_at
       FROM wallet_transactions
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customerId]
    );

    const history = rows.map((r) => {
      const isDebit = String(r.transaction_type).toUpperCase() === "DEBIT";
      const sign = isDebit ? "-" : "+";
      const amount = Number(r.amount || 0);

      const date = r.created_at
        ? new Date(r.created_at).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      let title = isDebit ? "Debit" : "Credit";
      if (r.source) title = `${title} • ${r.source}`;

      return {
        id: r.id,
        title,
        desc: r.description || "",
        amount: `${sign}£${amount.toFixed(2)}`,
        date,
      };
    });

    return res.json({
      wallet_balance: walletBalance,
      loyalty_points: loyaltyPoints,
      referral_credits: referralCredits,
      history,
    });
  } catch (err) {
    console.error("getWalletSummary error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getWalletBalance = async (req, res) => {
  try {
    const customerId = req.user.id;

    const [[row]] = await db.execute(
      "SELECT balance FROM customer_wallets WHERE customer_id = ?",
      [customerId]
    );

    return res.json({ status: 1, balance: Number(row?.balance || 0) });
  } catch (e) {
    console.error("getWalletBalance error:", e);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};
