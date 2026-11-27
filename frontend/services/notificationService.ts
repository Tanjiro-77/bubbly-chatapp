import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants";
import { acceptCallHttp, getCallStatus, rejectCallHttp } from "./callService";
import { callAccept, callReject } from "../socket/socketEvents";
import { hapticTap } from "../utils/haptics";
import {
    INCOMING_RINGTONES,
    NOTIFICATION_SOUND_FILE,
    initIncomingRingtone,
    syncCallRingtoneToBackend,
} from "./soundService";

const PUSH_TOKEN_STORAGE_KEY = "bubbly_expo_push_token";
const NOTIF_ENABLED_STORAGE_KEY = "bubbly_notifications_enabled";
const SOUND_ENABLED_STORAGE_KEY = "bubbly_sound_enabled";

let activeConversationId: string | null = null;
let handlerConfigured = false;
let channelsSetupPromise: Promise<void> | null = null;

const recentIncomingCallIds = new Map<string, number>();
const handledCallActionIds = new Map<string, number>();
const seenMessageNotifIds = new Map<string, number>();
const handledResponseIds = new Set<string>();

function pruneTimedMap(map: Map<string, number>, maxAgeMs: number) {
    const now = Date.now();
    for (const [id, ts] of map.entries()) {
        if (now - ts > maxAgeMs) map.delete(id);
    }
}

export function markCallHandledFromNotification(callId: string): void {
    if (!callId) return;
    pruneTimedMap(handledCallActionIds, 60_000);
    handledCallActionIds.set(String(callId), Date.now());
}

export function isCallHandledFromNotification(callId: string): boolean {
    if (!callId) return false;
    pruneTimedMap(handledCallActionIds, 60_000);
    return handledCallActionIds.has(String(callId));
}

export function claimIncomingCallScreen(callId: string): boolean {
    if (!callId) return false;
    pruneTimedMap(recentIncomingCallIds, 30_000);
    if (recentIncomingCallIds.has(callId)) return false;
    recentIncomingCallIds.set(callId, Date.now());
    return true;
}

export function markMessageNotificationSeen(messageId: string): boolean {
    if (!messageId) return true;
    pruneTimedMap(seenMessageNotifIds, 60_000);
    if (seenMessageNotifIds.has(messageId)) return false;
    seenMessageNotifIds.set(messageId, Date.now());
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
 * - Keeps incoming call notifications maximally visible even in Focus Mode.
 */
export function configureNotificationHandler() {
    if (handlerConfigured) return;
    handlerConfigured = true;

    Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
            const data = (notification.request.content.data || {}) as Record<string, any>;
            const msgId = data?.messageId ? String(data.messageId) : "";
            if (msgId) {
                markMessageNotificationSeen(msgId);
            }

            if (data?.type === "missed_call" && data?.dismissCallId) {
                clearDeliveredCallNotifications(String(data.dismissCallId)).catch(() => {});
            }

            let soundEnabled = true;
            try {
                const enabledPref = await AsyncStorage.getItem(NOTIF_ENABLED_STORAGE_KEY);
                if (enabledPref === "false" && data?.type !== "call") {
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

            if (data?.type === "call") {
                hapticTap("boom");
                return {
                    shouldShowBanner: true,
                    shouldShowList: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
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
 * Called eagerly at boot AND during push registration so killed/cold-start notifications always
 * inherit the right channel importance, ringtone attributes, and lock-screen actions.
 */
export async function setupNotificationChannelsAndCategories(): Promise<void> {
    if (Platform.OS === "web") return;
    if (channelsSetupPromise) return channelsSetupPromise;

    channelsSetupPromise = (async () => {
        try {
            if (Platform.OS === "android") {
                await Notifications.setNotificationChannelAsync("messages", {
                    name: "Chat Messages",
                    description: "Real-time notifications for chat messages, media, and missed calls",
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 280, 140, 280],
                    enableVibrate: true,
                    enableLights: true,
                    lightColor: "#facc15",
                    sound: NOTIFICATION_SOUND_FILE,
                    showBadge: true,
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                });

                const callChannelBase = {
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 700, 350, 700, 350, 700],
                    enableVibrate: true,
                    enableLights: true,
                    lightColor: "#22c55e",
                    audioAttributes: {
                        usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
                        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
                    },
                    bypassDnd: true,
                    showBadge: true,
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                };

                await Notifications.setNotificationChannelAsync("calls", {
                    name: "Incoming Calls",
                    description: "High-priority ring alerts for voice and video calls even when app is closed",
                    sound: INCOMING_RINGTONES[0].soundFile,
                    ...callChannelBase,
                });

                await Promise.all(
                    INCOMING_RINGTONES.map((ringtone) =>
                        Notifications.setNotificationChannelAsync(ringtone.channelId, {
                            name: `Incoming Calls · ${ringtone.label}`,
                            description: "Custom high-priority incoming call ringtone channel",
                            sound: ringtone.soundFile,
                            ...callChannelBase,
                        })
                    )
                );
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
        } catch {
            channelsSetupPromise = null;
        }
    })();

    return channelsSetupPromise;
}

/**
 * Presents a high-priority local notification fallback (e.g., when backgrounded before Doze).
 */
export async function presentLocalNotification(params: {
    title: string;
    body: string;
    channelId: string;
    categoryIdentifier?: string;
    sound?: string | undefined;
    data: Record<string, any>;
}): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        await setupNotificationChannelsAndCategories();
        await Notifications.scheduleNotificationAsync({
            content: {
                title: params.title,
                body: params.body,
                sound: params.sound,
                categoryIdentifier: params.categoryIdentifier,
                interruptionLevel: "timeSensitive",
                data: params.data,
            },
            trigger: Platform.OS === "android" ? { channelId: params.channelId } : null,
        });
    } catch {
        // Ignore when notification permissions haven't been granted yet
    }
}

/**
 * Dismisses any stale incoming call notification for the given callId from the notification tray.
 */
export async function clearDeliveredCallNotifications(callId?: string): Promise<void> {
    if (Platform.OS === "web") return;
    try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        await Promise.all(
            presented
                .filter((n) => {
                    const data = (n.request.content.data || {}) as Record<string, any>;
                    if (data?.type !== "call") return false;
                    return !callId || String(data?.callId) === String(callId);
                })
                .map((n) => Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {}))
        );
    } catch {
        // Ignore on unsupported platforms
    }
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
            initIncomingRingtone()
                .then((ringtoneId) => syncCallRingtoneToBackend(ringtoneId, jwt))
                .catch(() => {});
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
 * Keeps the backend synchronized whenever the OS rotates FCM/APNs push tokens.
 */
export function subscribePushTokenUpdates(getAuthToken: () => string | null): () => void {
    if (Platform.OS === "web") return () => {};
    const sub = Notifications.addPushTokenListener(() => {
        const jwt = getAuthToken();
        if (jwt) {
            registerForPushNotificationsAsync(jwt).catch(() => {});
        }
    });
    return () => sub.remove();
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
 * Handles user interaction with a notification (tap, Accept, or Decline),
 * including cold launches when the app was previously closed/off.
 */
export async function handleNotificationResponse(
    response: Notifications.NotificationResponse,
    router: { push: (opts: any) => void }
): Promise<void> {
    const notificationId = response.notification.request.identifier;
    if (handledResponseIds.has(notificationId)) return;
    handledResponseIds.add(notificationId);
    if (handledResponseIds.size > 50) {
        const first = handledResponseIds.values().next().value;
        if (first) handledResponseIds.delete(first);
    }

    const data = (response.notification.request.content.data || {}) as Record<string, any>;
    const actionId = response.actionIdentifier;

    if (data.type === "call" && data.callId) {
        const callId = String(data.callId);

        if (actionId === "DECLINE") {
            markCallHandledFromNotification(callId);
            hapticTap("warning");
            callReject(callId);
            await rejectCallHttp(callId);
            await clearDeliveredCallNotifications(callId);
            await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
            return;
        }

        if (actionId === "ACCEPT") {
            markCallHandledFromNotification(callId);
        }

        await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
        await clearDeliveredCallNotifications(callId);

        // Verify call is still ringing before launching call UI (guards against stale notification taps)
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
            hapticTap("boom");
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
        hapticTap("boom");
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
        hapticTap("medium");
        await Notifications.dismissNotificationAsync(notificationId).catch(() => {});
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
