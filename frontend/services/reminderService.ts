/**
 * frontend/services/reminderService.ts
 *
 * Message Reminder Alarms backed by expo-notifications + AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { formatRichPreviewText, getPrivacyShield, notifyFeatureListeners } from "../utils/featureStorage";

const REMINDERS_KEY = "@bubbly_message_reminders_v1";

export interface SavedMessageReminder {
    id: string;
    notificationId: string | null;
    messageId: string;
    conversationId: string;
    senderName: string;
    preview: string;
    remindAt: number; // epoch ms
}

export async function getActiveReminders(): Promise<SavedMessageReminder[]> {
    try {
        const raw = await AsyncStorage.getItem(REMINDERS_KEY);
        const list: SavedMessageReminder[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        const now = Date.now();
        const active = list.filter((r) => r.remindAt > now);
        if (active.length !== list.length) {
            await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(active)).catch(() => {});
        }
        return active.sort((a, b) => a.remindAt - b.remindAt);
    } catch {
        return [];
    }
}

export async function scheduleMessageReminder(params: {
    messageId: string;
    conversationId: string;
    senderName: string;
    preview: string;
    delayMs: number;
}): Promise<{ success: boolean; reminder?: SavedMessageReminder; msg?: string }> {
    try {
        const safeDelaySec = Math.max(10, Math.round(params.delayMs / 1000));
        const remindAt = Date.now() + safeDelaySec * 1000;
        const cleanPreview = formatRichPreviewText(params.preview) || "Saved message";
        let notificationId: string | null = null;

        if (Platform.OS !== "web") {
            const [{ status }, privacy] = await Promise.all([
                Notifications.getPermissionsAsync(),
                getPrivacyShield(),
            ]);
            let finalStatus = status;
            if (status !== "granted") {
                const req = await Notifications.requestPermissionsAsync().catch(() => ({ status }));
                finalStatus = req.status;
            }
            if (finalStatus !== "granted") {
                return { success: false, msg: "Please allow Notifications in Device Settings to schedule reminders." };
            }
            notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: privacy.hideNotificationPreview
                        ? "⏰ Bubbly Reminder"
                        : `⏰ Reminder from ${params.senderName || "Bubbly"}`,
                    body: privacy.hideNotificationPreview
                        ? "🔒 Tap to open reminder"
                        : cleanPreview.slice(0, 160),
                    sound: "default",
                    data: {
                        type: "message",
                        conversationId: params.conversationId,
                        messageId: params.messageId,
                    },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: safeDelaySec,
                },
            });
        }

        const item: SavedMessageReminder = {
            id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            notificationId,
            messageId: params.messageId,
            conversationId: params.conversationId,
            senderName: params.senderName || "Contact",
            preview: cleanPreview.slice(0, 140),
            remindAt,
        };

        const existing = await getActiveReminders();
        const next = [...existing, item].slice(0, 50);
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
        notifyFeatureListeners();
        return { success: true, reminder: item };
    } catch (error: any) {
        return { success: false, msg: error?.message || "Could not schedule reminder" };
    }
}

export async function cancelMessageReminder(id: string): Promise<void> {
    try {
        const list = await getActiveReminders();
        const target = list.find((r) => r.id === id);
        if (target?.notificationId && Platform.OS !== "web") {
            await Notifications.cancelScheduledNotificationAsync(target.notificationId).catch(() => {});
        }
        const next = list.filter((r) => r.id !== id);
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
        notifyFeatureListeners();
    } catch {}
}
