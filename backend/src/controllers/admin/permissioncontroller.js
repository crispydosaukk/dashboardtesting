// backend/src/controllers/admin/permissioncontroller.js
import {
  createPermission,
  listPermissions,
  updatePermission,
  softDeletePermission,
} from "../../models/PermissionModel.js";

export const index = async (_req, res) => {
  try {
    const rows = await listPermissions();
    res.json({ status: 1, message: "OK", data: rows });
  } catch (err) {
    console.error("List permissions error:", err);
    res.status(500).json({ status: 0, message: err.message || "Server error", data: [] });
  }
};  

export const create = async (req, res) => {
  try {
    const { title } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ status: 0, message: "Title is required", data: [] });
    }
    const id = await createPermission(String(title).trim());
    res.status(201).json({ status: 1, message: "Permission created", data: { id, title: String(title).trim() } });
  } catch (err) {
    console.error("Create permission error:", err);
    res.status(500).json({ status: 0, message: err.message || "Server error", data: [] });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ status: 0, message: "Title is required", data: [] });
    }
    const affected = await updatePermission(id, String(title).trim());
    if (!affected) return res.status(404).json({ status: 0, message: "Permission not found", data: [] });
    res.json({ status: 1, message: "Permission updated", data: { id, title: String(title).trim() } });
  } catch (err) {
    console.error("Update permission error:", err);
    res.status(500).json({ status: 0, message: err.message || "Server error", data: [] });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const affected = await softDeletePermission(id);
    if (!affected) return res.status(404).json({ status: 0, message: "Permission not found", data: [] });
    res.json({ status: 1, message: "Permission deleted", data: { id } });
  } catch (err) {
    console.error("Delete permission error:", err);
    res.status(500).json({ status: 0, message: err.message || "Server error", data: [] });
  }
};
