import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { searchAll, translateText } from "../controllers/search.controller";
import { generateAgoraToken, getCallHistory } from "../controllers/call.controller";

const router = Router();

router.get("/search", authMiddleware, searchAll);
router.post("/translate", authMiddleware, translateText);

// ── Call routes ──
router.post("/call/token", authMiddleware, generateAgoraToken);
router.get("/call/history", authMiddleware, getCallHistory);

export default router;