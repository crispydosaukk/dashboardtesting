// controllers/api/walletController.js
import db from "../../config/db.js";

// 🔹 Get loyalty redeem rules from settings (dynamic)
async function getLoyaltyRedeemSettings() {
  const [[row]] = await db.execute(
    `SELECT 
       loyalty_redeem_points,
       loyalty_redeem_value,
       loyalty_available_after_hours
     FROM settings
     ORDER BY id DESC
     LIMIT 1`
  );

  return {
    loyalty_redeem_points: Number(row?.loyalty_redeem_points || 10),
    loyalty_redeem_value: Number(row?.loyalty_redeem_value || 1),
    loyalty_available_after_hours: Number(row?.loyalty_available_after_hours || 24),
  };
}

export const getWalletSummary = async (req, res) => {
  try {
    const customerId = req.user.id;

    // 1) Wallet balance
    const [[walletRow]] = await db.execute(
      "SELECT balance FROM customer_wallets WHERE customer_id = ?",
      [customerId]
    );
    const wallet_balance = Number(walletRow?.balance || 0);

    // 2) Referral credits (INFO: total earned via referral credits)
    const [[refRow]] = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM wallet_transactions
       WHERE customer_id = ?
         AND transaction_type = 'CREDIT'
         AND source = 'REFERRAL_BONUS'`,
      [customerId]
    );
    const referral_credits = Number(refRow?.total || 0);

        // 🔹 Referred users count
    const [[refCountRow]] = await db.execute(
      `SELECT COUNT(*) AS total
      FROM customers
      WHERE referred_by_customer_id = ?`,
      [customerId]
    );

    const referred_users_count = Number(refCountRow?.total || 0);


    // 3) Loyalty points (AVAILABLE + not expired)
    const [[lpRow]] = await db.execute(
      `SELECT COALESCE(SUM(points_remaining), 0) AS total
       FROM loyalty_earnings
       WHERE customer_id = ?
         AND available_from <= NOW()
         AND expires_at >= NOW()
         AND points_remaining > 0`,
      [customerId]
    );
    const loyalty_points = Number(lpRow?.total || 0);

    // ✅ 3B) Pending loyalty points (earned but NOT available yet)
    const [[pendingRow]] = await db.execute(
      `SELECT COALESCE(SUM(points_remaining), 0) AS total
       FROM loyalty_earnings
       WHERE customer_id = ?
         AND available_from > NOW()
         AND expires_at >= NOW()
         AND points_remaining > 0`,
      [customerId]
    );

    // 3C) Pending loyalty list (per order / per time)
const [pendingListRows] = await db.execute(
  `SELECT 
     id,
     order_id,
     points_remaining,
     available_from
   FROM loyalty_earnings
   WHERE customer_id = ?
     AND available_from > NOW()
     AND expires_at >= NOW()
     AND points_remaining > 0
   ORDER BY available_from ASC`,
  [customerId]
);

    const loyalty_pending_points = Number(pendingRow?.total || 0);

    // 4) Loyalty redeem rules + dynamic hours (for UI)
    const redeemCfg = await getLoyaltyRedeemSettings();

    // 5) How much user can redeem right now (helper)
    const redeemable_units = Math.floor(
      loyalty_points / redeemCfg.loyalty_redeem_points
    );
    const redeemable_value = Number(
      (redeemable_units * redeemCfg.loyalty_redeem_value).toFixed(2)
    );

    // 6) History (last 10)
    const [rows] = await db.execute(
      `SELECT id, transaction_type, amount, source, description, created_at
       FROM wallet_transactions
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [customerId]
    );

    const history = rows.map((r) => {
      const isDebit = String(r.transaction_type).toUpperCase() === "DEBIT";
      const sign = isDebit ? "-" : "+";
      const amt = Number(r.amount || 0).toFixed(2);

      return {
        id: r.id,
        title: `${isDebit ? "Debit" : "Credit"} : ${r.source}`,
        desc: r.description || "",
        date: new Date(r.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        amount: `${sign}£${amt}`,
      };
    });

    return res.json({
      wallet_balance,
      loyalty_points,
      loyalty_pending_points, // ✅ NEW
      referral_credits,
      referred_users_count,
      loyalty_pending_list: pendingListRows,
      loyalty_redeem_points: redeemCfg.loyalty_redeem_points,
      loyalty_redeem_value: redeemCfg.loyalty_redeem_value,
      loyalty_available_after_hours: redeemCfg.loyalty_available_after_hours, // ✅ NEW

      loyalty_redeemable_value: redeemable_value,
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

