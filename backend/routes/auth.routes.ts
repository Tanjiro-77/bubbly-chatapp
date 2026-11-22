
import { Router } from "express";
import { registerUser, loginUser } from "../controllers/auth.controller";
import {
  loginLimiter,
  registerLimiter,
} from "../middleware/authLimiter";

const router = Router();

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);

export default router;
