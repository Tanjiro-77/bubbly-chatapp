import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants";
import { acceptCallHttp, getCallStatus, rejectCallHttp } from "./callService";
import { callAccept, callReject } from "../socket/socketEvents";

const PUSH_TOKEN_STORAGE_KEY = "bubbly_expo_push_token";
const NOTIF_ENABLED_STORAGE_KEY = "bubbly_notifications_enabled";
const SOUND_ENABLED_STORAGE_KEY = "bubbly_sound_enabled";

let activeConversationId: string | null = null;
let handlerConfigured = false;
const recentIncomingCallIds = new Map<string, number>();

export function claimIncomingCallScreen(callId: string): boolean {
    if (!callId) return false;
    const now = Date.now();
    for (const [id, ts] of recentIncomingCallIds.entries()) {
        if (now - ts > 30000) recentIncomingCallIds.delete(id);
    }
    if (recentIncomingCallIds.has(callId)) return false;
    recentIncomingCallIds.set(callId, now);
    return true;
}

export function setActiveConversationId(conversationId: string | null) {
    activeConversationId = conversationId;
}

export function getActiveConversationId(): string | null {
    return activeConversationId;
}

/**
 * Configures foreground notification behavior (WhatsApp-style):
 * - Suppresses banner/sound if user is currently inside that exact conversation.
 * - Shows banner/sound for other chats and incoming calls.
 */
export function configureNotificationHandler() {
    if (handlerConfigured) return;
    handlerConfigured = true;

    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            const data = (notification.request.content.data || {}) as Record<string, any>;

            let soundEnabled = true;
            try {
                const enabledPref = await AsyncStorage.getItem(NOTIF_ENABLED_STORAGE_KEY);
                if (enabledPref === "false") {
                    return {
                        shouldShowBanner: false,
                        shouldShowList: false,
                        shouldPlaySound: false,
                        shouldSetBadge: false,
                    };
                }
                const soundPref = await AsyncStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
                if (soundPref === "false") {
                    soundEnabled = false;
                }
                const focusRaw = await AsyncStorage.getItem("@bubbly_focus_mode_v1");
                if (focusRaw) {
                    const focus = JSON.parse(focusRaw);
                    const focusActive = focus?.enabled && (!focus.until || Date.now() < focus.until);
                    if (focusActive && data?.type !== "call") {
                        return {
                            shouldShowBanner: false,
                            shouldShowList: true,
                            shouldPlaySound: false,
                            shouldSetBadge: true,
                        };
                    }
                }
            } catch {
                // ignore storage read errors
            }

            if (
                data?.type === "message" &&
                data?.conversationId &&
                data.conversationId === activeConversationId
            ) {
                return {
                    shouldShowBanner: false,
                    shouldShowList: false,
                    shouldPlaySound: false,
                    shouldSetBadge: false,
                };
            }

            return {
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: soundEnabled,
                shouldSetBadge: true,
            };
        },
    });
}

/**
 * Configures Android notification channels ('messages' & 'calls') and Accept/Decline call actions.
 */
export async function setupNotificationChannelsAndCategories() {
    if (Platform.OS === "web") return;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("messages", {
            name: "Chat Messages",
            description: "Notifications for new text, voice, and media messages",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 150, 250],
            enableVibrate: true,
            sound: "default",
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        await Notifications.setNotificationChannelAsync("calls", {
            name: "Incoming Calls",
            description: "High-priority alerts for incoming voice and video calls",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 600, 400, 600, 400, 600],
            enableVibrate: true,
            sound: "default",
            audioAttributes: {
                usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
                contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            },
            bypassDnd: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
    }

    await Notifications.setNotificationCategoryAsync("incoming_call", [
        {
            identifier: "ACCEPT",
            buttonTitle: "Accept",
            options: {
                opensAppToForeground: true,
            },
        },
        {
            identifier: "DECLINE",
            buttonTitle: "Decline",
            options: {
                isDestructive: true,
                opensAppToForeground: false,
            },
        },
    ]);
}

/**
 * Registers device for Expo Push Notifications and persists the token to the backend.
 */
export async function registerForPushNotificationsAsync(
    authToken?: string | null
): Promise<string | null> {
    if (Platform.OS === "web") return null;

    try {
        await setupNotificationChannelsAndCategories();

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            return null;
        }

        if (!Device.isDevice) {
            console.log("Push notifications require a physical device for remote tokens.");
            return null;
        }

        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        const pushToken = tokenResponse.data;

        if (!pushToken) return null;

        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, pushToken);

        const jwt = authToken || (await AsyncStorage.getItem("token"));
        if (jwt) {
            await fetch(`${API_URL}/api/user/push-token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ pushToken }),
            });
        }

        return pushToken;
    } catch (error) {
        console.warn(
            "Push notification registration failed:",
            error instanceof Error ? error.message : error
        );
        return null;
    }
}

/**
 * Unregisters the device's push token from the backend on logout.
 */
export async function unregisterPushTokenAsync(authToken?: string | null): Promise<void> {
    if (Platform.OS === "web") return;

    try {
        const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
        const jwt = authToken || (await AsyncStorage.getItem("token"));

        if (pushToken && jwt) {
            await fetch(`${API_URL}/api/user/push-token`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ pushToken }),
            });
        }

    } catch (error) {
        console.warn(
            "Push token unregistration failed:",
            error instanceof Error ? error.message : error
        );
    } finally {
        await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY).catch(() => {});
    }
}

/**
 * Syncs the in-app notification toggle with the backend.
 */
export async function syncNotificationPreference(enabled: boolean): Promise<void> {
    try {
        const jwt = await AsyncStorage.getItem("token");
        if (!jwt) return;

        await fetch(`${API_URL}/api/user/notifications`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ enabled }),
        });
    } catch {
        // ignore offline toggle sync error
    }
}

/**
 * Handles user interaction with a notification (tap, Accept, or Decline).
 */
export async function handleNotificationResponse(
    response: Notifications.NotificationResponse,
    router: { push: (opts: any) => void }
): Promise<void> {
    const data = (response.notification.request.content.data || {}) as Record<string, any>;
    const actionId = response.actionIdentifier;
    const notificationId = response.notification.request.identifier;

    if (data.type === "call" && data.callId) {
        const callId = String(data.callId);

        if (actionId === "DECLINE") {
            callReject(callId);
            await rejectCallHttp(callId);
            await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
            return;
        }

        await Notifications.dismissNotificationAsync(notificationId).catch(() => {});

        // Verify call is still ringing before launching call UI (e.g. on stale notification tap)
        const statusRes = await getCallStatus(callId);
        const status = statusRes?.data?.status;
        if (status && !["ringing", "connecting"].includes(status)) {
            if (data.conversationId) {
                router.push({
                    pathname: "/(main)/conversation",
                    params: {
                        id: String(data.conversationId),
                        name: String(data.callerName || ""),
                        avatar: String(data.callerAvatar || ""),
                        type: "direct",
                        participants: data.callerId
                            ? JSON.stringify([
                                  {
                                      _id: data.callerId,
                                      name: data.callerName,
                                      avatar: data.callerAvatar,
                                  },
                              ])
                            : "[]",
                    },
                });
            }
            return;
        }

        if (actionId === "ACCEPT") {
            callAccept(callId);
            try {
                const acceptRes = await acceptCallHttp(callId);
                if (acceptRes && acceptRes.success === false) return;
            } catch {
                return;
            }
            router.push({
                pathname: "/(main)/callScreen",
                params: {
                    callId,
                    kind: String(data.kind || "voice"),
                    conversationId: String(data.conversationId || ""),
                    remoteUserName: String(data.callerName || "Unknown"),
                    remoteUserAvatar: String(data.callerAvatar || ""),
                    isOutgoing: "false",
                },
            });
            return;
        }

        if (!claimIncomingCallScreen(callId)) return;
        router.push({
            pathname: "/(main)/incomingCall",
            params: {
                callId,
                callerId: String(data.callerId || ""),
                callerName: String(data.callerName || "Unknown"),
                callerAvatar: String(data.callerAvatar || ""),
                kind: String(data.kind || "voice"),
                conversationId: String(data.conversationId || ""),
            },
        });
        return;
    }

    if ((data.type === "message" || data.type === "missed_call") && data.conversationId) {
        const isDirect = (data.conversationType || "direct") === "direct";
        const senderId = data.senderId || data.callerId;
        const senderName = data.senderName || data.callerName || data.conversationName || "";
        const senderAvatar = data.senderAvatar || data.callerAvatar || data.conversationAvatar || "";
        const participants =
            isDirect && senderId
                ? JSON.stringify([
                      {
                          _id: senderId,
                          name: senderName,
                          avatar: senderAvatar,
                      },
                  ])
                : "[]";

        router.push({
            pathname: "/(main)/conversation",
            params: {
                id: String(data.conversationId),
                name: String(data.conversationName || senderName),
                avatar: String(data.conversationAvatar || senderAvatar),
                type: String(data.conversationType || "direct"),
                participants,
            },
        });
    }
}
