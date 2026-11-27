import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import { searchAll, translateText } from "../controllers/search.controller";
import { transcribeAudio } from "../controllers/transcribe.controller";
import { getUserPreferences, updateUserPreferences } from "../controllers/preferences.controller";
import {
  acceptCallHttp,
  endCallHttp,
  generateAgoraToken,
  getCallHistory,
  getCallStatus,
  getPendingIncomingCall,
  rejectCallHttp,
} from "../controllers/call.controller";
import { syncContacts, updatePhoneNumber, findUserByPhone } from "../controllers/contact.controller";
import {
  registerPushToken,
  unregisterPushToken,
  updateCallRingtone,
  updateNotificationPreference,
} from "../controllers/notification.controller";

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

const transcribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/search", searchLimiter, authMiddleware, searchAll);
router.post("/translate", translateLimiter, authMiddleware, translateText);
router.post("/transcribe", transcribeLimiter, authMiddleware, transcribeAudio);
router.get("/preferences", authMiddleware, getUserPreferences);
router.put("/preferences", authMiddleware, updateUserPreferences);

// ── Call routes ──
router.post("/call/token", callTokenLimiter, authMiddleware, generateAgoraToken);
router.get("/call/history", callHistoryLimiter, authMiddleware, getCallHistory);
router.get("/call/pending", authMiddleware, getPendingIncomingCall);
router.get("/call/:callId/status", authMiddleware, getCallStatus);
router.post("/call/:callId/accept", authMiddleware, acceptCallHttp);
router.post("/call/:callId/reject", authMiddleware, rejectCallHttp);
router.post("/call/:callId/end", authMiddleware, endCallHttp);

// ── Push notification routes ──
router.post("/user/push-token", authMiddleware, registerPushToken);
router.delete("/user/push-token", authMiddleware, unregisterPushToken);
router.put("/user/notifications", authMiddleware, updateNotificationPreference);
router.put("/user/call-ringtone", authMiddleware, updateCallRingtone);

// ── Contact & Phone routes ──
router.post("/contacts/sync", authMiddleware, syncContacts);
router.post("/contacts/find", authMiddleware, findUserByPhone);
router.put("/user/phone", authMiddleware, updatePhoneNumber);

export default router;