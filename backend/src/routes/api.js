import express from "express";
import { register, login, profile } from "../controllers/api/auth.js";
import auth from "../middleware/auth.js";
import { getRestaurants, getRestaurantById } from "../controllers/api/restaurantController.js"; // import new controller
import { getCategories } from "../controllers/api/categoryController.js";
import { getProducts } from "../controllers/api/productController.js";
import { addToCart, getCart, removeFromCart } from "../controllers/api/cartController.js";
import { getRestaurantTimings } from "../controllers/api/restaurantController.js";
import { createOrder, getAllOrders } from "../controllers/api/OrderController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", auth, profile);

// Restaurants
router.get("/restaurants", getRestaurants);
router.get("/restaurant/:id", getRestaurantById); // <-- NEW: single restaurant
router.get("/restaurant-timings/:restaurant_id", getRestaurantTimings);

// Categories & Products
router.get("/categories", getCategories);
router.get("/products", getProducts);

// Cart
router.post("/cart/add", addToCart);
router.get("/cart", getCart);
router.post("/cart/remove", removeFromCart);

// Orders
router.post("/create-order", createOrder);
router.get("/orders", getAllOrders);

export default router;
