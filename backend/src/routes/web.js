import express from "express";
import { login } from "../controllers/admin/authcontroller.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js"; // <-- use this one
import { getProducts, addProduct, removeProduct, updateProduct} from "../controllers/admin/productController.js";

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

import {
  show as getRestaurant,
  upsert as upsertRestaurant,
} from "../controllers/admin/restaurantController.js";

import {
  getCategories,
  addCategory,
  removeCategory,
  updateCategory
} from "../controllers/admin/categoryController.js";


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

/* USERS */
router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

/* RESTAURANT */
router.get("/restaurant", auth, getRestaurant);
router.post("/restaurant", auth, upsertRestaurant);

/* CATEGORY */
router.get("/category", auth, getCategories);
router.post("/category", auth, upload.single("image"), addCategory);
router.put("/category/:id", auth, upload.single("image"), updateCategory); // <-- ADD THIS
router.delete("/category/:id", auth, removeCategory);

/* PRODUCTS */
router.get("/products", auth, getProducts);
router.post("/products", auth, upload.single("image"), addProduct);
router.delete("/products/:id", auth, removeProduct);
router.put("/products/:id", auth, upload.single("image"), updateProduct);

export default router;
