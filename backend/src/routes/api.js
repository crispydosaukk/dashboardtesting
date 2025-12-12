import express from "express";
import { register, login, profile } from "../controllers/api/auth.js";
import auth from "../middleware/auth.js";
import { getRestaurants, getRestaurantById, getRestaurantTimings } from "../controllers/api/restaurantController.js";
import { getCategories } from "../controllers/api/categoryController.js";
import { getProducts } from "../controllers/api/productController.js";
import { addToCart, getCart, removeFromCart } from "../controllers/api/cartController.js";
import { createOrder, getAllOrders } from "../controllers/api/OrderController.js";
import { getWalletSummary } from "../controllers/api/walletController.js";
import { redeemLoyaltyToWallet } from "../controllers/api/loyaltyController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", auth, profile);
router.get("/wallet/summary", auth, getWalletSummary);

router.get("/restaurants", getRestaurants);
router.get("/restaurant/:id", getRestaurantById);
router.get("/restaurant-timings/:restaurant_id", getRestaurantTimings);

router.get("/categories", getCategories);
router.get("/products", getProducts);

router.post("/cart/add", addToCart);
router.get("/cart", getCart);
router.post("/cart/remove", removeFromCart);

router.post("/create-order", createOrder);
router.get("/orders", getAllOrders);


router.post("/loyalty/redeem", auth, redeemLoyaltyToWallet);

export default router;
