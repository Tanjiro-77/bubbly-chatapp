import { Router } from "express";
import rateLimit from "express-rate-limit";
import { optionalAuthMiddleware } from "../middleware/optionalAuth";
import { authMiddleware } from "../middleware/auth";
import {
    submitErrorReport,
    getErrorReports,
    updateReportStatus,
} from "../controllers/errorReport.controller";

const router = Router();

// Rate limiter for submitting error reports to prevent flooding
const reportLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 submissions per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, msg: "Too many reports submitted. Please wait a moment." },
});

// Client submits a bug report or error telemetry (supports both authenticated and unauthenticated crashes)
router.post("/report", reportLimiter, optionalAuthMiddleware, submitErrorReport);

// Admin view and manage reports
router.get("/reports", authMiddleware, getErrorReports);
router.patch("/reports/:id/status", authMiddleware, updateReportStatus);

export default router;
