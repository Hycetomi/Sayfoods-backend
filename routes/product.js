import { Router } from "express";
import * as Product from "../controllers/product.js";
import { authAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/:page", Product.GetProducts);
router.get("/singleproduct/:name", Product.GetProduct);
router.post("/create", authAdmin, Product.CreateProduct);
router.patch("/update", authAdmin, Product.EditProduct);
router.delete("/delete/:id", authAdmin, Product.DeleteProduct);
router.get("/products/:category", Product.GetProductsByCategory);
router.get("/category/random", Product.GetRandomCategory);
router.get("/search/search", Product.SearchProducts);

export default router;
