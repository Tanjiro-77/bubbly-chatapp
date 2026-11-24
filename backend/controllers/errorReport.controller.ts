import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import AppErrorReport from "../modals/AppErrorReport";
import { uploadImageToCloudinary } from "../services/cloudinary.service";

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
        } = req.body;

        if (!title || !description) {
            res.status(400).json({
                success: false,
                msg: "Title and description are required.",
            });
            return;
        }

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
            type,
            title,
            description,
            category,
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
        if (status) filter.status = status;
        if (type) filter.type = type;

        const limitNum = Math.min(Number(limit) || 50, 100);
        const skip = ((Number(page) || 1) - 1) * limitNum;

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
            page: Number(page) || 1,
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
