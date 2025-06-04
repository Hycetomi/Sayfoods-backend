import { Router } from "express";
import * as FoodShare from "../controllers/foodShare.js";
import { auth, authAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/create", authAdmin, FoodShare.CreateFoodShare);
router.patch("/update", authAdmin, FoodShare.UpdateFoodShare);
router.delete("/delete/:id", authAdmin, FoodShare.DeleteFoodShare);

router.get("/", FoodShare.GetFoodShares);
router.get("/food-names", FoodShare.GetAllProductsNames);
router.get("/singlefoodshare/:productName", FoodShare.GetFoodShare);

router.post("/create/order-share", auth, FoodShare.CreateOrderShare);
router.get("/get/order-share", authAdmin, FoodShare.GetAllOrderShares)

export default router;
