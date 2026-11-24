import mongoose from "mongoose";

export interface IAppErrorReport extends mongoose.Document {
    userId?: mongoose.Types.ObjectId;
    type: "crash" | "bug_report" | "unhandled_promise" | "api_error" | "feedback";
    title: string;
    description: string;
    stackTrace?: string;
    category: "crash" | "ui_glitch" | "network" | "audio_call" | "auth" | "other";
    screenshotUrl?: string;
    deviceInfo?: {
        os?: string;
        deviceModel?: string;
        appVersion?: string;
        currentRoute?: string;
        platform?: string;
    };
    breadcrumbs?: Array<{
        timestamp: Date;
        category?: string;
        message: string;
        data?: Record<string, any>;
    }>;
    status: "open" | "investigating" | "resolved" | "dismissed";
    adminNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const appErrorReportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true,
        },
        type: {
            type: String,
            enum: ["crash", "bug_report", "unhandled_promise", "api_error", "feedback"],
            default: "bug_report",
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        description: {
            type: String,
            required: true,
            maxlength: 5000,
        },
        stackTrace: {
            type: String,
            required: false,
        },
        category: {
            type: String,
            enum: ["crash", "ui_glitch", "network", "audio_call", "auth", "other"],
            default: "other",
            index: true,
        },
        screenshotUrl: {
            type: String,
            required: false,
        },
        deviceInfo: {
            os: String,
            deviceModel: String,
            appVersion: String,
            currentRoute: String,
            platform: String,
        },
        breadcrumbs: [
            {
                timestamp: { type: Date, default: Date.now },
                category: String,
                message: String,
                data: mongoose.Schema.Types.Mixed,
            },
        ],
        status: {
            type: String,
            enum: ["open", "investigating", "resolved", "dismissed"],
            default: "open",
            index: true,
        },
        adminNotes: {
            type: String,
            required: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model<IAppErrorReport>("AppErrorReport", appErrorReportSchema);
