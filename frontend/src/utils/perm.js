// frontend/src/utils/perm.js
export function getPerms() {
  try {
    return JSON.parse(localStorage.getItem("perms") || "[]");
  } catch {
    return [];
  }
}

export function can(required) {
  if (!required) return true; // if a menu item needs no permission
  const perms = getPerms();
  // normalize to lowercase for robust match
  return perms.includes(String(required).toLowerCase());
}
