import db from "../../config/db.js";

/* ================= GET USER NOTIFICATIONS ================= */
export const getNotifications = async (req, res) => {
  try {
    const { user_type, user_id } = req.query;

    if (!user_type || !user_id) {
      return res.status(400).json({
        status: 0,
        message: "Missing user details"
      });
    }

    const [rows] = await db.query(
      `SELECT *
       FROM notifications
       WHERE user_type = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [user_type, user_id]
    );

    res.json({
      status: 1,
      data: rows
    });

  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({
      status: 0,
      message: "Server error"
    });
  }
};

/* ================= MARK AS READ ================= */
export const markNotificationRead = async (req, res) => {
  try {
    const { id, user_id, mark_all } = req.body;

    if (mark_all && user_id) {
       // ✅ Mark ALL notifications for this user as read
       await db.query(
         "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND user_type = 'customer'", 
         [user_id]
       );
    } else if (id) {
       // ✅ Mark SINGLE notification as read
       await db.query(
         "UPDATE notifications SET is_read = 1 WHERE id = ?", 
         [id]
       );
    }

    res.json({ status: 1 });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ status: 0 });
  }
};