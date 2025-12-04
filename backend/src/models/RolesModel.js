// backend/src/models/rolesModel.js
export const ROLE_TABLE = "roles";
export const PERMISSION_ROLE_TABLE = "permission_role";

export const ROLE_COLUMNS = ["id", "title", "created_at", "updated_at", "deleted_at"];

export const PERMISSION_ROLE_COLUMNS = ["role_id", "permission_id", "created_at"];
