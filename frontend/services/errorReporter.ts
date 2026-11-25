import * as Sentry from "@sentry/react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL, SENTRY_DSN } from "../constants";
import { uploadFileToCloudinary } from "./imageService";

const getAuthHeaders = async () => {
    try {
        const token = await AsyncStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
        return {};
    }
};

let isSentryInitialized = false;

export interface DeviceDiagnostics {
    os: string;
    deviceModel: string;
    appVersion: string;
    platform: string;
    currentRoute?: string;
}

export interface BugReportInput {
    title: string;
    description: string;
    category?: "crash" | "ui_glitch" | "network" | "audio_call" | "auth" | "other";
    imageUri?: string | null;
    currentRoute?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
}

/**
 * Gather device and application diagnostics
 */
export const getDeviceDiagnostics = (currentRoute?: string): DeviceDiagnostics => {
    const osName = Device.osName || Platform.OS;
    const osVersion = Device.osVersion || `${Platform.Version}`;
    const modelName = Device.modelName || (Platform.OS === "android" ? "Android Device" : "iOS Device");
    const appVersion = Constants.expoConfig?.version || "1.0.0";

    return {
        os: `${osName} ${osVersion}`,
        deviceModel: modelName,
        appVersion,
        platform: Platform.OS,
        currentRoute,
    };
};

/**
 * Initialize Sentry Crash Reporting
 */
export const initSentry = () => {
    if (isSentryInitialized) return;

    if (!SENTRY_DSN) {
        console.warn("[Sentry] No Sentry DSN provided. Crash monitoring disabled.");
        return;
    }

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            debug: false,
            enableAutoSessionTracking: true,
            tracesSampleRate: 1.0,
            attachStacktrace: true,
            beforeSend(event) {
                // Attach device diagnostics as tags/extra context
                const diag = getDeviceDiagnostics();
                event.tags = {
                    ...event.tags,
                    app_version: diag.appVersion,
                    device_model: diag.deviceModel,
                    os: diag.os,
                };
                return event;
            },
        });

        isSentryInitialized = true;
        console.log("[Sentry] Sentry initialized successfully.");
    } catch (err) {
        console.error("[Sentry] Failed to initialize Sentry:", err);
    }
};

/**
 * Set user context in Sentry
 */
export const setSentryUser = (user: { id?: string; _id?: string; name?: string; email?: string } | null) => {
    if (!user) {
        Sentry.setUser(null);
        return;
    }

    const userId = user._id || user.id || "anonymous";
    Sentry.setUser({
        id: userId,
        username: user.name || "User",
        email: user.email || undefined,
    });
};

/**
 * Dispatches an exception to both Sentry and the Backend Ingestion API
 */
export const captureAppException = async (
    error: any,
    context?: {
        message?: string;
        currentRoute?: string;
        isFatal?: boolean;
    }
) => {
    try {
        console.error("[ErrorReporter] Capturing exception:", error);

        // 1. Send to Sentry
        if (isSentryInitialized) {
            Sentry.captureException(error, {
                extra: {
                    contextMessage: context?.message,
                    currentRoute: context?.currentRoute,
                    isFatal: context?.isFatal,
                },
            });
        }

        // 2. Dispatch to Backend DB
        const diagnostics = getDeviceDiagnostics(context?.currentRoute);
        const title = context?.message || error?.message || "Unhandled App Exception";
        const stackTrace = error?.stack || (typeof error === "string" ? error : JSON.stringify(error));

        const headers = await getAuthHeaders();
        await axios.post(
            `${API_URL}/api/errors/report`,
            {
                title: `[Auto-Captured] ${title}`,
                description: stackTrace ? stackTrace.slice(0, 4000) : "No stack trace provided",
                type: context?.isFatal ? "crash" : "unhandled_promise",
                category: "crash",
                stackTrace,
                deviceInfo: diagnostics,
            },
            { headers, timeout: 8000 }
        );
    } catch (dispatchErr) {
        // Silently catch so telemetry failure never creates a crash loop
        console.warn("[ErrorReporter] Failed to dispatch error to backend:", dispatchErr);
    }
};

/**
 * Submit a user-reported bug or feedback
 */
export const submitUserBugReport = async (input: BugReportInput): Promise<{ success: boolean; msg: string }> => {
    try {
        let uploadedImageUrl: string | undefined = undefined;

        // Upload screenshot to Cloudinary if attached
        if (input.imageUri) {
            try {
                const uploadRes = await uploadFileToCloudinary({ uri: input.imageUri }, "bubbly_user_bug_reports");
                if (uploadRes.success && uploadRes.data) {
                    uploadedImageUrl = uploadRes.data;
                }
            } catch (imgErr) {
                console.warn("[ErrorReporter] Screenshot upload failed, submitting report without image:", imgErr);
            }
        }

        const diagnostics = getDeviceDiagnostics(input.currentRoute);

        // 1. Send User Feedback to Sentry
        if (isSentryInitialized) {
            try {
                Sentry.captureFeedback({
                    message: `[${input.category?.toUpperCase() || "BUG"}] ${input.title}\n\n${input.description}`,
                    name: input.userName || "Bubbly User",
                    email: input.userEmail || "user@bubbly.app",
                });
            } catch (sentryFeedbackErr) {
                console.warn("[ErrorReporter] Sentry feedback capture failed:", sentryFeedbackErr);
            }
        }

        // 2. Submit to Backend API
        const payload = {
            title: input.title.trim(),
            description: input.description.trim(),
            category: input.category || "other",
            type: "bug_report",
            screenshotBase64: uploadedImageUrl,
            deviceInfo: diagnostics,
        };

        const headers = await getAuthHeaders();
        const response = await axios.post(`${API_URL}/api/errors/report`, payload, {
            headers,
            timeout: 15000,
        });

        if (response.data && response.data.success) {
            return { success: true, msg: response.data.msg || "Report submitted successfully. Thank you!" };
        } else {
            return { success: false, msg: response.data?.msg || "Could not submit report." };
        }
    } catch (err: any) {
        console.error("[ErrorReporter] Error submitting bug report:", err);
        return {
            success: false,
            msg: err.response?.data?.msg || err.message || "Failed to submit report. Please try again.",
        };
    }
};

/**
 * Global JavaScript exception and unhandled promise handler
 */
export const setupGlobalErrorHandlers = () => {
    const g = (typeof globalThis !== "undefined" ? globalThis : {}) as any;
    const defaultHandler = g.ErrorUtils?.getGlobalHandler?.();

    if (g.ErrorUtils) {
        g.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
            console.error(`[Global Error] isFatal=${isFatal}:`, error);
            captureAppException(error, {
                message: isFatal ? "Fatal Global JS Error" : "Global JS Error",
                isFatal,
            });

            // Call default handler so standard Expo/React Native behavior persists
            if (typeof defaultHandler === "function") {
                defaultHandler(error, isFatal);
            }
        });
    }
};
