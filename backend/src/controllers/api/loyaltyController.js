import db from "../../config/db.js";

async function getRedeemSettings(conn) {
  const [[row]] = await conn.query(
    `SELECT loyalty_redeem_points, loyalty_redeem_value
     FROM settings
     ORDER BY id DESC
     LIMIT 1`
  );

  return {
    redeem_points: Number(row?.loyalty_redeem_points || 10),
    redeem_value: Number(row?.loyalty_redeem_value || 1),
  };
}

// POST /loyalty/redeem
// Redeems MAX possible units (simple + clean)
export const redeemLoyaltyToWallet = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const customerId = req.user.id;

    await conn.beginTransaction();

    const cfg = await getRedeemSettings(conn);

    // 1) Calculate total available points (lock rows to safely deduct)
    const [earnRows] = await conn.query(
      `SELECT id, points_remaining
       FROM loyalty_earnings
       WHERE customer_id = ?
         AND available_from <= NOW()
         AND expires_at >= NOW()
         AND points_remaining > 0
       ORDER BY expires_at ASC
       FOR UPDATE`,
      [customerId]
    );

    const totalPoints = earnRows.reduce(
      (sum, r) => sum + Number(r.points_remaining || 0),
      0
    );

    const units = Math.floor(totalPoints / cfg.redeem_points);
    if (units <= 0) {
      await conn.rollback();
      return res.status(400).json({
        status: 0,
        message: `Not enough loyalty points to redeem. Need at least ${cfg.redeem_points} points.`,
      });
    }

    const pointsToRedeem = units * cfg.redeem_points;
    const walletAmount = Number((units * cfg.redeem_value).toFixed(2));

    // 2) Deduct points from earnings FIFO (earliest expiry first)
    let remainingToDeduct = pointsToRedeem;

    for (const row of earnRows) {
      if (remainingToDeduct <= 0) break;

      const canTake = Math.min(
        Number(row.points_remaining || 0),
        remainingToDeduct
      );

      await conn.query(
        `UPDATE loyalty_earnings
         SET points_remaining = points_remaining - ?
         WHERE id = ?`,
        [canTake, row.id]
      );

      remainingToDeduct -= canTake;
    }

    // 3) Credit wallet (upsert)
    await conn.query(
      `INSERT INTO customer_wallets (customer_id, balance, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         balance = balance + VALUES(balance),
         updated_at = NOW()`,
      [customerId, walletAmount]
    );

    // 4) Fetch new wallet balance
    const [[walletRow]] = await conn.query(
      "SELECT balance FROM customer_wallets WHERE customer_id = ?",
      [customerId]
    );
    const newBalance = Number(walletRow?.balance || 0);

    // 5) Insert wallet transaction
    const [txRes] = await conn.query(
      `INSERT INTO wallet_transactions
       (customer_id, transaction_type, amount, balance_after, source, payment_id, order_id, description, created_at)
       VALUES (?, 'CREDIT', ?, ?, 'LOYALTY_REDEEM', NULL, NULL, ?, NOW())`,
      [
        customerId,
        walletAmount,
        newBalance,
        `Redeemed ${pointsToRedeem} points to wallet`,
      ]
    );

    // 6) Insert loyalty_redemptions
    await conn.query(
      `INSERT INTO loyalty_redemptions
       (customer_id, points_redeemed, wallet_amount, wallet_transaction_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        customerId,
        pointsToRedeem,
        walletAmount,
        txRes.insertId,
        `Redeem ${pointsToRedeem} pts = £${walletAmount}`,
      ]
    );

    await conn.commit();

    return res.json({
      status: 1,
      message: "Loyalty redeemed to wallet successfully",
      points_redeemed: pointsToRedeem,
      wallet_amount: walletAmount,
      wallet_balance: newBalance,
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error("redeemLoyaltyToWallet error:", err);
    return res.status(500).json({ status: 0, message: "Server error" });
  } finally {
    conn.release();
  }
};
