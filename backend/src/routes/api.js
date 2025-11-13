import express from "express";
import { register, login, profile } from "../controllers/api/auth.js";
import auth from "../middleware/auth.js"; // ✅ same middleware you already have

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);

// Protected
router.get("/profile", auth, profile);

export default router;
