import db from "../../config/db.js";

export const saveFcmToken = async (req, res) => {
  try {
    const { user_type, user_id, device_type, fcm_token } = req.body;

    if (!user_type || !user_id || !device_type || !fcm_token) {
      return res.status(400).json({
        status: 0,
        message: "Missing required fields"
      });
    }

    await db.query(
      `
      INSERT INTO fcm_tokens (user_type, user_id, device_type, fcm_token)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fcm_token = VALUES(fcm_token),
        updated_at = NOW()
      `,
      [user_type, user_id, device_type, fcm_token]
    );

    res.json({
      status: 1,
      message: "FCM token saved"
    });
  } catch (err) {
    console.error("FCM Save Error:", err);
    res.status(500).json({
      status: 0,
      message: "Server error"
    });
  }
};
