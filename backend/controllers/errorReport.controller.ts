import { NextFunction, Response } from "express";
import { isValidObjectId } from "mongoose";
import { AuthRequest } from "../middleware/auth";
import AppErrorReport from "../modals/AppErrorReport";
import User from "../modals/User";
import { uploadImageToCloudinary } from "../services/cloudinary.service";

/**
 * Middleware ensuring only moderators can inspect or triage global bug reports
 */
export async function requireModerator(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }
        const user = await User.findById(req.userId).select("isModerator").lean();
        if (!user?.isModerator) {
            res.status(403).json({ success: false, msg: "Forbidden: Moderator access required" });
            return;
        }
        next();
    } catch {
        res.status(500).json({ success: false, msg: "Failed to verify permissions" });
    }
}

/**
 * Submit a bug report or error report from the client
 */
export async function submitErrorReport(req: AuthRequest, res: Response): Promise<void> {
    try {
        const {
            title,
            description,
            type = "bug_report",
            category = "other",
            screenshotBase64,
            deviceInfo,
            stackTrace,
            breadcrumbs,
        } = req.body ?? {};

        if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) {
            res.status(400).json({
                success: false,
                msg: "Title and description are required.",
            });
            return;
        }

        const allowedTypes = ["crash", "bug_report", "unhandled_promise", "api_error", "feedback"] as const;
        const allowedCategories = ["crash", "ui_glitch", "network", "audio_call", "auth", "other"] as const;
        const safeType = allowedTypes.includes(type) ? type : "bug_report";
        const safeCategory = allowedCategories.includes(category) ? category : "other";
        const safeTitle = title.trim().slice(0, 300);
        const safeDescription = description.trim().slice(0, 5000);

        let screenshotUrl: string | undefined = undefined;

        // If a screenshot was attached as base64 data URI, upload it to Cloudinary
        if (screenshotBase64 && typeof screenshotBase64 === "string" && screenshotBase64.startsWith("data:image/")) {
            try {
                screenshotUrl = await uploadImageToCloudinary(screenshotBase64, "bubbly_error_reports");
            } catch (uploadErr) {
                console.warn("Could not upload screenshot to Cloudinary, saving report without image:", uploadErr);
            }
        } else if (screenshotBase64 && typeof screenshotBase64 === "string" && screenshotBase64.startsWith("http")) {
            screenshotUrl = screenshotBase64;
        }

        const report = await AppErrorReport.create({
            userId: req.userId || undefined,
            type: safeType,
            title: safeTitle,
            description: safeDescription,
            category: safeCategory,
            screenshotUrl,
            deviceInfo,
            stackTrace,
            breadcrumbs,
            status: "open",
        });

        console.log(`[Error Telemetry] New report registered (#${report._id}): "${report.title}" [${report.type}]`);

        res.status(201).json({
            success: true,
            msg: "Error report submitted successfully. Thank you!",
            reportId: report._id,
        });
    } catch (error: any) {
        console.error("Error submitting bug report:", error);
        res.status(500).json({
            success: false,
            msg: "Failed to submit error report.",
            error: error?.message,
        });
    }
}

/**
 * Get list of reported bugs/crashes (for admin/developer inspection)
 */
export async function getErrorReports(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { status, type, limit = 50, page = 1 } = req.query;

        const filter: Record<string, any> = {};
        if (typeof status === "string" && status.trim()) filter.status = status.trim();
        if (typeof type === "string" && type.trim()) filter.type = type.trim();

        const limitNum = Math.max(1, Math.min(Number(limit) || 50, 100));
        const pageNum = Math.max(1, Number(page) || 1);
        const skip = (pageNum - 1) * limitNum;

        const [reports, total] = await Promise.all([
            AppErrorReport.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate("userId", "name email avatar")
                .lean(),
            AppErrorReport.countDocuments(filter),
        ]);

        res.json({
            success: true,
            reports,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error: any) {
        console.error("Error fetching error reports:", error);
        res.status(500).json({
            success: false,
            msg: "Failed to fetch error reports.",
            error: error?.message,
        });
    }
}

/**
 * Update error report status (open, investigating, resolved, dismissed)
 */
export async function updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        if (!status || !["open", "investigating", "resolved", "dismissed"].includes(status)) {
            res.status(400).json({
                success: false,
                msg: "Valid status ('open', 'investigating', 'resolved', 'dismissed') is required.",
            });
            return;
        }

        if (!id || !isValidObjectId(id)) {
            res.status(400).json({ success: false, msg: "Invalid report id." });
            return;
        }

        const report = await AppErrorReport.findByIdAndUpdate(
            id,
            { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
            { new: true }
        );

        if (!report) {
            res.status(404).json({ success: false, msg: "Report not found." });
            return;
        }

        res.json({
            success: true,
            msg: "Report status updated.",
            report,
        });
    } catch (error: any) {
        console.error("Error updating report status:", error);
        res.status(500).json({
            success: false,
            msg: "Failed to update report status.",
            error: error?.message,
        });
    }
}
