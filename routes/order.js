import { Router } from "express";
import * as Order from "../controllers/order.js";
import { auth, authAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/create", auth, Order.CreateOrder);
router.post("/initialize", auth, Order.InitializePayment);
router.post("/verify", auth, Order.VerifyPayment);

router.get("/get/:id", Order.GetOrderById);
router.get("/user-orders/:page", auth, Order.GetUserOrders);
router.get("/dashboard", authAdmin, Order.GetDashboardData);
router.get("/orders/:page", authAdmin, Order.GetAllOrders);
router.get("/search/search", Order.SearchOrder);

router.patch("/update/order-status", authAdmin, Order.UpdateOrderStatus);

export default router;
