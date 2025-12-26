// backend/src/utils/sendNotification.js
import admin from "../config/firebaseAdmin.js";
import db from "../config/db.js";

export async function sendNotification({ userType, userId, title, body, data = {} }) {
  const [rows] = await db.query(
    `SELECT fcm_token FROM fcm_tokens
     WHERE user_type = ? AND user_id = ?`,
    [userType, userId]
  );

  if (!rows.length) return;

  const tokens = rows.map(r => r.fcm_token);

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });
}
