import { Router } from "express";
import * as User from "../controllers/user.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", User.SignUp);
router.post("/signin", User.SignIn);
router.post("/logout", User.LogOut);
router.get("/", auth, User.GetUserDetails);
router.patch("/update", auth, User.EditUserDetails);
router.patch("/change-password", auth, User.ChangePassword);

router.get("/check-session", auth, (_req, res) => {
  res.json({
    isAuthenticated: true,
  });
});

export default router;
