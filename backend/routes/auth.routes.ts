
import { Router } from "express";
import { registerUser, loginUser, googleAuth } from "../controllers/auth.controller";
import {
  loginLimiter,
  registerLimiter,
} from "../middleware/authLimiter";

const router = Router();

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/phone/register", registerLimiter, registerUser);
router.post("/phone/login", loginLimiter, loginUser);
router.post("/google", loginLimiter, googleAuth);

export default router;
