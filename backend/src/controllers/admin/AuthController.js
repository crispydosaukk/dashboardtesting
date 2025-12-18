// backend/src/controllers/admin/authcontroller.js
import db from "../../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const login = async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  email = String(email).trim().toLowerCase();
  password = String(password);

  try {
    const [rows] = await db.execute(
      `SELECT id, role_id, name, email, password
         FROM users
        WHERE LOWER(email)=? AND deleted_at IS NULL
        LIMIT 1`,
      [email]  
    );
    if (!rows.length) return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const stored = user.password || "";

    // ✅ only use bcrypt when the stored value is a bcrypt hash
    const isBcrypt = /^\$2[aby]\$/.test(stored);
    const ok = isBcrypt ? await bcrypt.compare(password, stored) : password === stored;
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });
  

    // role title
    let roleTitle = null;
    if (user.role_id) {
      const [r] = await db.execute(`SELECT title FROM roles WHERE id=? AND deleted_at IS NULL`, [user.role_id]);
      roleTitle = r.length ? r[0].title : null;
    }

    // permissions list (lowercased codes)
    let permissions = [];
    if (user.role_id) {
      const [perms] = await db.execute(
        `SELECT LOWER(p.title) AS code
           FROM permission_role pr
           JOIN permissions p ON p.id = pr.permission_id
          WHERE pr.role_id=?`,
        [user.role_id]
      );
      permissions = perms.map(x => x.code);
    }

    const expiresIn = req.body?.remember ? "30d" : "2d";
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, role: roleTitle, email: user.email },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn }
    );


    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_title: roleTitle },
      permissions,
    });
  } catch (e) {
    console.error("auth.login:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
