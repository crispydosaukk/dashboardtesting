// backend/src/controllers/admin/rolescontroller.js
import db from "../../config/db.js";
import {
  ROLE_TABLE,
  PERMISSION_ROLE_TABLE,
} from "../../models/RolesModel.js";

/** Build "(?, ?), (?, ?)" placeholders and flat params for bulk insert */
function buildValues(rows, colsPerRow = 2) {
  const placeholders = rows
    .map(() => `(${new Array(colsPerRow).fill("?").join(",")})`)
    .join(", ");
  const params = rows.flat();
  return { placeholders, params };
}   

/* ---------- GET /roles -> roles with permissions ---------- */
export const index = async (_req, res) => {
  try {
    const [roles] = await db.execute(
      `SELECT id, title, created_at FROM ${ROLE_TABLE} WHERE deleted_at IS NULL ORDER BY id ASC`
    );

    const [links] = await db.execute(
      `SELECT pr.role_id, p.id AS permission_id, p.title AS permission_title
       FROM ${PERMISSION_ROLE_TABLE} pr
       JOIN permissions p ON p.id = pr.permission_id
       ORDER BY p.title ASC`
    );

    const map = new Map();
    for (const r of roles) map.set(r.id, []);
    for (const row of links) {
      if (map.has(row.role_id)) {
        map.get(row.role_id).push({
          id: row.permission_id,
          title: row.permission_title,
        });
      }
    }

    const data = roles.map((r) => ({
      id: r.id,
      title: r.title,
      created_at: r.created_at,
      permissions: map.get(r.id) || [],
    }));

    return res.json({ message: "OK", data });
  } catch (e) {
    console.error("roles.index:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------- POST /roles  { title, permission_ids:number[] } ---------- */
export const create = async (req, res) => {
  const { title, permission_ids } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  const permIds = Array.isArray(permission_ids)
    ? [...new Set(permission_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Insert role
    const [ins] = await conn.execute(
      `INSERT INTO ${ROLE_TABLE} (title) VALUES (?)`,
      [title.trim()]
    );
    const roleId = ins.insertId;

    // 2) Validate permission ids exist to avoid FK errors
    if (permIds.length) {
      const placeholders = permIds.map(() => "?").join(",");
      const [rows] = await conn.query(
        `SELECT id FROM permissions WHERE id IN (${placeholders})`,
        permIds
      );
      const found = new Set(rows.map((r) => Number(r.id)));
      const missing = permIds.filter((id) => !found.has(id));
      if (missing.length) {
        throw Object.assign(
          new Error(`Unknown permission_ids: ${missing.join(", ")}`),
          { code: "ER_FK_PRECHECK" }
        );
      }

      // 3) Bulk insert links
      const pairs = permIds.map((pid) => [roleId, pid]);
      const { placeholders: ph, params } = buildValues(pairs, 2);
      const sql = `INSERT INTO ${PERMISSION_ROLE_TABLE} (role_id, permission_id) VALUES ${ph}`;
      await conn.query(sql, params);
    }

    await conn.commit();
    return res.status(201).json({ message: "Role created", id: roleId });
  } catch (e) {
    await conn.rollback();

    console.error("roles.create error:", {
      code: e.code,
      errno: e.errno,
      sqlState: e.sqlState,
      sqlMessage: e.sqlMessage,
      message: e.message,
    });

    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Role title already exists" });
    }
    if (
      e?.code === "ER_NO_REFERENCED_ROW_2" ||
      e?.code === "ER_ROW_IS_REFERENCED_2" ||
      e?.code === "ER_FK_PRECHECK"
    ) {
      return res.status(422).json({ message: e.message || "Foreign key constraint failed" });
    }

    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

/* ---------- PUT /roles/:id  { title?, permission_ids?:number[] } ---------- */
export const update = async (req, res) => {
  const roleId = Number(req.params.id);
  if (!roleId) return res.status(400).json({ message: "Invalid role id" });

  const { title, permission_ids } = req.body || {};
  const hasTitle = typeof title === "string" && title.trim().length > 0;
  const hasPerms = Array.isArray(permission_ids);

  if (!hasTitle && !hasPerms) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (hasTitle) {
      await conn.execute(
        `UPDATE ${ROLE_TABLE} SET title=? WHERE id=?`,
        [title.trim(), roleId]
      );
    }

    if (hasPerms) {
      const permIds = [...new Set(permission_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))];

      if (permIds.length) {
        const placeholders = permIds.map(() => "?").join(",");
        const [rows] = await conn.query(
          `SELECT id FROM permissions WHERE id IN (${placeholders})`,
          permIds
        );
        const found = new Set(rows.map((r) => Number(r.id)));
        const missing = permIds.filter((id) => !found.has(id));
        if (missing.length) {
          throw Object.assign(
            new Error(`Unknown permission_ids: ${missing.join(", ")}`),
            { code: "ER_FK_PRECHECK" }
          );
        }
      }

      await conn.execute(
        `DELETE FROM ${PERMISSION_ROLE_TABLE} WHERE role_id=?`,
        [roleId]
      );

      if (permIds.length) {
        const pairs = permIds.map((pid) => [roleId, pid]);
        const { placeholders: ph, params } = buildValues(pairs, 2);
        const sql = `INSERT INTO ${PERMISSION_ROLE_TABLE} (role_id, permission_id) VALUES ${ph}`;
        await conn.query(sql, params);
      }
    }

    await conn.commit();
    return res.json({ message: "Role updated" });
  } catch (e) {
    await conn.rollback();

    console.error("roles.update error:", {
      code: e.code,
      errno: e.errno,
      sqlState: e.sqlState,
      sqlMessage: e.sqlMessage,
      message: e.message,
    });

    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Role title already exists" });
    }
    if (
      e?.code === "ER_NO_REFERENCED_ROW_2" ||
      e?.code === "ER_ROW_IS_REFERENCED_2" ||
      e?.code === "ER_FK_PRECHECK"
    ) {
      return res.status(422).json({ message: e.message || "Foreign key constraint failed" });
    }

    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

/* ---------- DELETE /roles/:id ---------- */
export const remove = async (req, res) => {
  const roleId = Number(req.params.id);
  if (!roleId) return res.status(400).json({ message: "Invalid role id" });

  try {
    const [r] = await db.execute(
      `DELETE FROM ${ROLE_TABLE} WHERE id=?`,
      [roleId]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Role not found" });
    }
    return res.json({ message: "Role deleted" });
  } catch (e) {
    console.error("roles.remove:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
