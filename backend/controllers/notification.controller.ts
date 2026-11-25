import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../modals/User";
import { isValidExpoPushToken } from "../services/pushNotificationService";

/**
 * Register or update the current user's Expo push token.
 * POST /api/user/push-token
 */
export const registerPushToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { pushToken } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }

        if (!isValidExpoPushToken(pushToken)) {
            res.status(400).json({ success: false, msg: "Invalid push token" });
            return;
        }

        const trimmedToken = pushToken.trim();

        await User.findByIdAndUpdate(userId, {
            $addToSet: { pushTokens: trimmedToken },
        });

        res.json({ success: true, msg: "Push token registered" });
    } catch (error) {
        console.error("registerPushToken error:", error instanceof Error ? error.message : error);
        res.status(500).json({ success: false, msg: "Failed to register push token" });
    }
};

/**
 * Remove an Expo push token on logout.
 * DELETE /api/user/push-token
 */
export const unregisterPushToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { pushToken } = req.body || {};

        if (!userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }

        if (typeof pushToken === "string" && pushToken.trim()) {
            await User.findByIdAndUpdate(userId, {
                $pull: { pushTokens: pushToken.trim() },
            });
        }

        res.json({ success: true, msg: "Push token removed" });
    } catch (error) {
        console.error("unregisterPushToken error:", error instanceof Error ? error.message : error);
        res.status(500).json({ success: false, msg: "Failed to remove push token" });
    }
};

/**
 * Sync user notification enabled/disabled preference.
 * PUT /api/user/notifications
 */
export const updateNotificationPreference = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { enabled } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, msg: "Unauthorized" });
            return;
        }

        if (typeof enabled !== "boolean") {
            res.status(400).json({ success: false, msg: "enabled must be a boolean" });
            return;
        }

        await User.findByIdAndUpdate(userId, { notificationsEnabled: enabled });

        res.json({ success: true, notificationsEnabled: enabled });
    } catch (error) {
        console.error("updateNotificationPreference error:", error instanceof Error ? error.message : error);
        res.status(500).json({ success: false, msg: "Failed to update notification preference" });
    }
};
