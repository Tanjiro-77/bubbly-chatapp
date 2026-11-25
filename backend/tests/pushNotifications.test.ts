import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
    isValidExpoPushToken,
    formatMessageNotificationBody,
    sendExpoPushNotifications,
} from "../services/pushNotificationService";
import {
    registerPushToken,
    unregisterPushToken,
    updateNotificationPreference,
} from "../controllers/notification.controller";
import User from "../modals/User";

describe("Push Notification Service & Controller", () => {
    test("validates Expo push tokens accurately", () => {
        assert.equal(isValidExpoPushToken("ExponentPushToken[abc123XYZ]"), true);
        assert.equal(isValidExpoPushToken("ExpoPushToken[xyz_987]"), true);
        assert.equal(isValidExpoPushToken("invalid-token"), false);
        assert.equal(isValidExpoPushToken(""), false);
        assert.equal(isValidExpoPushToken(null), false);
    });

    test("formats WhatsApp-style preview bodies for all message types", () => {
        assert.equal(formatMessageNotificationBody({ type: "text", content: "Hello!" }), "Hello!");
        assert.equal(formatMessageNotificationBody({ type: "image", content: "" }), "📷 Photo");
        assert.equal(formatMessageNotificationBody({ type: "image", content: "Look at this" }), "📷 Look at this");
        assert.equal(formatMessageNotificationBody({ type: "video", content: "" }), "🎥 Video");
        assert.equal(formatMessageNotificationBody({ type: "voice", voiceDuration: 15 }), "🎤 Voice message (0:15)");
        assert.equal(formatMessageNotificationBody({ type: "file", attachmentMeta: { name: "invoice.pdf" } }), "📎 invoice.pdf");
        assert.equal(formatMessageNotificationBody({ type: "location", location: { label: "Central Park" } }), "📍 Central Park");
        assert.equal(formatMessageNotificationBody({ type: "image", isViewOnce: true }), "📷 View-once photo");
    });

    test("registerPushToken rejects invalid tokens and saves valid ones", async () => {
        let statusCode = 200;
        let responseJson: any = null;
        const mockRes: any = {
            status(code: number) {
                statusCode = code;
                return this;
            },
            json(data: any) {
                responseJson = data;
            },
        };

        await registerPushToken({ userId: "user_1", body: { pushToken: "bad" } } as any, mockRes);
        assert.equal(statusCode, 400);
        assert.equal(responseJson.success, false);

        const originalUpdate = User.findByIdAndUpdate;
        let capturedUpdate: any = null;
        (User as any).findByIdAndUpdate = async (_id: string, update: any) => {
            capturedUpdate = update;
            return {};
        };

        try {
            statusCode = 200;
            await registerPushToken(
                { userId: "user_1", body: { pushToken: "ExponentPushToken[valid123]" } } as any,
                mockRes
            );
            assert.equal(statusCode, 200);
            assert.equal(responseJson.success, true);
            assert.deepEqual(capturedUpdate, { $addToSet: { pushTokens: "ExponentPushToken[valid123]" } });
        } finally {
            (User as any).findByIdAndUpdate = originalUpdate;
        }
    });

    test("unregisterPushToken pulls token and updateNotificationPreference validates boolean", async () => {
        let statusCode = 200;
        let responseJson: any = null;
        const mockRes: any = {
            status(code: number) {
                statusCode = code;
                return this;
            },
            json(data: any) {
                responseJson = data;
            },
        };

        const originalUpdate = User.findByIdAndUpdate;
        let lastUpdate: any = null;
        (User as any).findByIdAndUpdate = async (_id: string, update: any) => {
            lastUpdate = update;
            return {};
        };

        try {
            await unregisterPushToken(
                { userId: "user_1", body: { pushToken: "ExponentPushToken[valid123]" } } as any,
                mockRes
            );
            assert.equal(responseJson.success, true);
            assert.deepEqual(lastUpdate, { $pull: { pushTokens: "ExponentPushToken[valid123]" } });

            await updateNotificationPreference({ userId: "user_1", body: { enabled: "yes" } } as any, mockRes);
            assert.equal(statusCode, 400);

            statusCode = 200;
            await updateNotificationPreference({ userId: "user_1", body: { enabled: false } } as any, mockRes);
            assert.equal(statusCode, 200);
            assert.equal(responseJson.notificationsEnabled, false);
            assert.deepEqual(lastUpdate, { notificationsEnabled: false });
        } finally {
            (User as any).findByIdAndUpdate = originalUpdate;
        }
    });

    test("sendExpoPushNotifications filters invalid tokens safely", async () => {
        const res = await sendExpoPushNotifications([{ to: "bad-token", body: "hi" }]);
        assert.deepEqual(res, { sent: 0, failed: 0 });
    });
});
