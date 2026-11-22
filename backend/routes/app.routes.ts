import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import { searchAll, translateText } from "../controllers/search.controller";
import { generateAgoraToken, getCallHistory } from "../controllers/call.controller";

const router = Router();

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit search requests per user/IP
  standardHeaders: true,
  legacyHeaders: false,
});

const callHistoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each user/IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

const callTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit token generation attempts per user/IP
  standardHeaders: true,
  legacyHeaders: false,
});

const translateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit translation requests per user/IP
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/search", searchLimiter, authMiddleware, searchAll);
router.post("/translate", translateLimiter, authMiddleware, translateText);

// ── Call routes ──
router.post("/call/token", callTokenLimiter, authMiddleware, generateAgoraToken);
router.get("/call/history", callHistoryLimiter, authMiddleware, getCallHistory);

export default router;