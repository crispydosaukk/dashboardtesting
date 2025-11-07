import express from "express";
import { login } from "../controllers/admin/authcontroller.js";
import {
  index as listPermissions,
  create as createPermission,
  update as updatePermissionCtrl,
  remove as deletePermissionCtrl,
} from "../controllers/admin/permissioncontroller.js";

import {
  index as listRoles,
  create as createRole,
  update as updateRole,
  remove as deleteRole,
} from "../controllers/admin/rolesController.js";


import {
  index as listUsers,
  create as createUser,
  update as updateUser,
  remove as deleteUser,
} from "../controllers/admin/userscontroller.js";

import { show as getRestaurant, upsert as upsertRestaurant } from "../controllers/admin/restaurantController.js";

const router = express.Router();

/* AUTH */
router.post("/auth/login", login);

/* PERMISSIONS */
router.get("/permissions", listPermissions);
router.post("/permissions", createPermission);
router.put("/permissions/:id", updatePermissionCtrl);
router.delete("/permissions/:id", deletePermissionCtrl);

/* ROLES */
router.get("/roles", listRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

/* ---------- USERS ---------- */
router.get("/users", listUsers);            // list users + role name
router.post("/users", createUser);          // create user
router.put("/users/:id", updateUser);       // update user
router.delete("/users/:id", deleteUser);

router.get("/restaurant", getRestaurant);     // get current user's restaurant
router.post("/restaurant", upsertRestaurant);

export default router;
