/**
 * frontend/components/RealtimeNotifier.tsx
 *
 * App-wide real-time message & incoming-call coordinator:
 * - Reconnects Socket.IO, refreshes push token, and checks pending incoming calls on AppState active & reconnect.
 * - Shows an interactive Honey Amber floating banner across EVERY screen when new messages arrive for another chat.
 * - Fires local OS notifications with proper Android channels ('calls' / 'messages') & call actions when backgrounded.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    AppState,
    AppStateStatus,
    PanResponder,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Icons from "phosphor-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "../contexts/authContext";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { connectSocket } from "../socket/socket";
import {
    newMessage,
    onCallEnded,
    onCallIncoming,
    onSocketConnectionChange,
} from "../socket/socketEvents";
import {
    claimIncomingCallScreen,
    clearDeliveredCallNotifications,
    getActiveConversationId,
    isCallHandledFromNotification,
    markMessageNotificationSeen,
    presentLocalNotification,
    registerForPushNotificationsAsync,
} from "../services/notificationService";
import { getPendingIncomingCall } from "../services/callService";
import {
    formatRichPreviewText,
    getFocusMode,
    getPrivacyShield,
    getQuietHours,
    isWithinQuietHours,
} from "../utils/featureStorage";
import { hapticTap } from "../utils/haptics";
import {
    getIncomingRingtoneId,
    getIncomingRingtoneOption,
    NOTIFICATION_SOUND_FILE,
    playNotificationSound,
} from "../services/soundService";
import { IncomingCallProps, ResponseProps } from "../types";
import Avatar from "./Avatar";
import Typo from "./Typo";

type ToastKind = "text" | "image" | "video" | "voice" | "file" | "poll" | "checklist" | "location" | "call";

interface FloatingBannerState {
    id: string;
    convId: string;
    title: string;
    preview: string;
    kind: ToastKind;
    avatar?: string;
    senderId?: string;
    conversationType: string;
    conversationName?: string;
    burstCount: number;
}

function resolveToastBadge(kind: ToastKind) {
    switch (kind) {
        case "image":
            return { icon: <Icons.Camera size={12} color={colors.primaryDark} weight="fill" />, label: "Photo" };
        case "video":
            return { icon: <Icons.VideoCamera size={12} color={colors.primaryDark} weight="fill" />, label: "Video" };
        case "voice":
            return { icon: <Icons.Microphone size={12} color={colors.primaryDark} weight="fill" />, label: "Voice" };
        case "file":
            return { icon: <Icons.Paperclip size={12} color={colors.primaryDark} weight="bold" />, label: "File" };
        case "poll":
            return { icon: <Icons.ChartBar size={12} color={colors.primaryDark} weight="fill" />, label: "Poll" };
        case "checklist":
            return { icon: <Icons.CheckSquare size={12} color={colors.primaryDark} weight="fill" />, label: "Tasks" };
        case "location":
            return { icon: <Icons.MapPin size={12} color={colors.primaryDark} weight="fill" />, label: "Pin" };
        case "call":
            return { icon: <Icons.PhoneIncoming size={12} color="#ef4444" weight="fill" />, label: "Call" };
        default:
            return { icon: <Icons.ChatCircleDots size={12} color={colors.primaryDark} weight="fill" />, label: "Live" };
    }
}

export const RealtimeNotifier = () => {
    const { user, token } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();
    const [banner, setBanner] = useState<FloatingBannerState | null>(null);

    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const segmentsRef = useRef(segments);
    segmentsRef.current = segments;

    const swipeDismissResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => gs.dy < -10 || Math.abs(gs.dx) > 22,
            onPanResponderRelease: (_, gs) => {
                if (gs.dy < -18 || Math.abs(gs.dx) > 65) {
                    hapticTap("light");
                    setBanner(null);
                }
            },
        })
    ).current;

    const launchIncomingCall = useCallback(
        (payload: {
            callId: string;
            callerId?: string;
            callerName: string;
            callerAvatar?: string;
            kind: string;
            conversationId: string;
        }) => {
            if (!payload?.callId) return;
            if (isCallHandledFromNotification(payload.callId)) return;
            if (!claimIncomingCallScreen(payload.callId)) return;

            hapticTap("boom");

            if (Platform.OS !== "web" && appStateRef.current !== "active") {
                const ringtone = getIncomingRingtoneOption(getIncomingRingtoneId());
                presentLocalNotification({
                    title: payload.kind === "video" ? "Incoming Video Call" : "Incoming Voice Call",
                    body: `${payload.callerName} is calling you on Bubbly`,
                    channelId: ringtone.channelId,
                    categoryIdentifier: "incoming_call",
                    sound: ringtone.soundFile,
                    data: {
                        type: "call",
                        callId: payload.callId,
                        callerId: payload.callerId || "",
                        callerName: payload.callerName,
                        callerAvatar: payload.callerAvatar || "",
                        kind: payload.kind || "voice",
                        conversationId: payload.conversationId,
                    },
                }).catch(() => {});
            }

            router.push({
                pathname: "/(main)/incomingCall",
                params: {
                    callId: payload.callId,
                    callerId: payload.callerId || "",
                    callerName: payload.callerName,
                    callerAvatar: payload.callerAvatar || "",
                    kind: payload.kind || "voice",
                    conversationId: payload.conversationId || "",
                },
            });
        },
        [router]
    );

    const checkPendingCallFallback = useCallback(async () => {
        if (!user) return;
        try {
            const res = await getPendingIncomingCall();
            const pending = res?.data;
            if (res?.success && pending?.callId && !isCallHandledFromNotification(String(pending.callId))) {
                launchIncomingCall({
                    callId: String(pending.callId),
                    callerId: pending.caller?.id || "",
                    callerName: pending.caller?.name || "Unknown",
                    callerAvatar: pending.caller?.avatar || "",
                    kind: pending.kind || "voice",
                    conversationId: pending.conversationId || "",
                });
            }
        } catch {}
    }, [user, launchIncomingCall]);

    // Ensure AppState resume & socket reconnect immediately check pending calls and refresh push token
    useEffect(() => {
        if (!user) return;

        checkPendingCallFallback();

        const unsubConn = onSocketConnectionChange((connected) => {
            if (connected) {
                checkPendingCallFallback();
            }
        });

        const sub = AppState.addEventListener("change", (nextState) => {
            const prev = appStateRef.current;
            appStateRef.current = nextState;
            if (prev !== "active" && nextState === "active") {
                connectSocket().catch(() => {});
                registerForPushNotificationsAsync(token).catch(() => {});
                checkPendingCallFallback();
            }
        });

        return () => {
            unsubConn();
            sub.remove();
        };
    }, [user, token, checkPendingCallFallback]);

    // Global real-time message & incoming call listeners (bound persistently via socketEvents)
    useEffect(() => {
        if (!user) {
            setBanner(null);
            return;
        }

        const handleGlobalIncomingCall = (data: IncomingCallProps) => {
            launchIncomingCall({
                callId: String(data.callId || ""),
                callerId: data?.caller?.id || "",
                callerName: data?.caller?.name || "Unknown",
                callerAvatar: data?.caller?.avatar || "",
                kind: data.kind || "voice",
                conversationId: String(data.conversationId || ""),
            });
        };

        const handleGlobalCallEnded = (data: { callId?: string }) => {
            clearDeliveredCallNotifications(data?.callId).catch(() => {});
        };

        const handleGlobalMessage = async (res: ResponseProps) => {
            if (!res?.success || !res.data?.id) return;
            const msg = res.data;

            // Never alert for messages sent by the current user, system notices, or silent deliveries
            if (msg.sender?.id?.toString() === user.id?.toString() || msg.isSilent || msg.type === "system") return;

            if (msg.type === "call" && msg.callMeta?.callId) {
                clearDeliveredCallNotifications(String(msg.callMeta.callId)).catch(() => {});
                if (msg.callMeta.status !== "missed") return;
            }

            // Never interrupt if user is actively inside that exact conversation
            const activeConvId = getActiveConversationId();
            if (activeConvId && msg.conversationId?.toString() === activeConvId.toString()) return;

            try {
                const [enabledPref, soundPref, focus, privacy, quietHours] = await Promise.all([
                    AsyncStorage.getItem("bubbly_notifications_enabled"),
                    AsyncStorage.getItem("bubbly_sound_enabled"),
                    getFocusMode(),
                    getPrivacyShield(),
                    getQuietHours(),
                ]);

                if (enabledPref === "false" || focus.enabled || isWithinQuietHours(quietHours)) return;

                const senderName = privacy.hideNotificationPreview
                    ? "Bubbly"
                    : msg.sender?.name || "New Message";

                let toastKind: ToastKind = "text";
                if (msg.type === "call") toastKind = "call";
                else if (msg.voiceUrl || msg.type === "voice") toastKind = "voice";
                else if (msg.type === "video") toastKind = "video";
                else if (msg.type === "file") toastKind = "file";
                else if (msg.type === "poll") toastKind = "poll";
                else if (msg.type === "checklist") toastKind = "checklist";
                else if (msg.type === "location") toastKind = "location";
                else if (msg.attachement || msg.type === "image") toastKind = "image";

                const rawPreview =
                    msg.type === "call"
                        ? msg.callMeta?.kind === "video"
                            ? "📞 Missed video call"
                            : "📞 Missed voice call"
                        : formatRichPreviewText(msg.content) ||
                          (toastKind === "voice"
                              ? "🎤 Voice message"
                              : toastKind === "file"
                              ? "📎 Document"
                              : toastKind === "video"
                              ? "🎥 Video"
                              : toastKind === "image"
                              ? "📷 Photo"
                              : toastKind === "poll"
                              ? "📊 Poll"
                              : toastKind === "checklist"
                              ? "✅ Shared Checklist"
                              : toastKind === "location"
                              ? "📍 Location"
                              : "New message");

                const preview = privacy.hideNotificationPreview
                    ? "🔒 New encrypted message"
                    : rawPreview;
                const isGroup = (res as any).conversationType === "group";
                const title =
                    !privacy.hideNotificationPreview && isGroup && (res as any).conversationName
                        ? `${(res as any).conversationName} · ${senderName}`
                        : senderName;

                if (appStateRef.current === "active") {
                    hapticTap("heavy");
                    playNotificationSound().catch(() => {});
                    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                    setBanner((prev) => ({
                        id: String(msg.id),
                        convId: String(msg.conversationId),
                        title,
                        preview,
                        kind: toastKind,
                        avatar: privacy.hideNotificationPreview ? undefined : msg.sender?.avatar,
                        senderId: msg.sender?.id,
                        conversationType: (res as any).conversationType || "direct",
                        conversationName: (res as any).conversationName || senderName,
                        burstCount: prev && prev.convId === String(msg.conversationId) ? prev.burstCount + 1 : 1,
                    }));
                    dismissTimerRef.current = setTimeout(() => {
                        setBanner(null);
                    }, 4600);
                } else if (Platform.OS !== "web" && markMessageNotificationSeen(String(msg.id))) {
                    await presentLocalNotification({
                        title,
                        body: preview.slice(0, 180),
                        channelId: "messages",
                        sound: soundPref === "false" ? undefined : NOTIFICATION_SOUND_FILE,
                        data: {
                            type: "message",
                            conversationId: String(msg.conversationId),
                            messageId: String(msg.id),
                            senderId: msg.sender?.id || "",
                            senderName,
                            senderAvatar: msg.sender?.avatar || "",
                            conversationType: (res as any).conversationType || "direct",
                            conversationName: (res as any).conversationName || senderName,
                        },
                    });
                }
            } catch {}
        };

        onCallIncoming(handleGlobalIncomingCall);
        onCallEnded(handleGlobalCallEnded);
        newMessage(handleGlobalMessage);

        return () => {
            onCallIncoming(handleGlobalIncomingCall, true);
            onCallEnded(handleGlobalCallEnded, true);
            newMessage(handleGlobalMessage, true);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        };
    }, [user, launchIncomingCall]);

    if (!user || !banner) return null;

    const handleOpenBanner = () => {
        const current = banner;
        setBanner(null);
        hapticTap("medium");
        if (!current) return;

        const participantsPayload = current.senderId
            ? JSON.stringify([
                  {
                      _id: current.senderId,
                      name: current.conversationName || current.title,
                      avatar: current.avatar || "",
                  },
              ])
            : "[]";

        const inConversation = segmentsRef.current.join("/").includes("conversation");
        const target = {
            pathname: "/(main)/conversation" as const,
            params: {
                id: current.convId,
                name: current.conversationName || current.title,
                avatar: current.avatar || "",
                type: current.conversationType || "direct",
                participants: participantsPayload,
            },
        };
        if (inConversation) router.replace(target);
        else router.push(target);
    };

    const badge = resolveToastBadge(banner.kind);

    return (
        <Animated.View
            entering={FadeInUp.duration(260).springify()}
            exiting={FadeOutUp.duration(180)}
            style={[styles.wrap, { top: Math.max(insets.top, 12) + verticalScale(6) }]}
            pointerEvents="box-none"
            {...swipeDismissResponder.panHandlers}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenBanner}
                style={styles.card}
            >
                <View style={styles.avatarHolder}>
                    <Avatar size={40} uri={banner.avatar || null} isGroup={banner.conversationType === "group"} />
                    <View style={styles.liveDot} />
                </View>
                <View style={styles.textWrap}>
                    <View style={styles.titleRow}>
                        <Typo size={13.5} fontWeight="800" color={colors.white} style={{ flexShrink: 1 }} textProps={{ numberOfLines: 1 }}>
                            {banner.title}
                        </Typo>
                        <View style={styles.typeChip}>
                            {badge.icon}
                            <Typo size={10} fontWeight="800" color={colors.primaryLight}>
                                {banner.burstCount > 1 ? `${banner.burstCount} new` : badge.label}
                            </Typo>
                        </View>
                    </View>
                    <Typo size={12} color="rgba(255,255,255,0.8)" textProps={{ numberOfLines: 1 }}>
                        {banner.preview}
                    </Typo>
                </View>
                <View style={styles.replyPill}>
                    <Typo size={11} fontWeight="800" color={colors.black}>Open</Typo>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        hapticTap("light");
                        setBanner(null);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                >
                    <Icons.X size={14} color="rgba(255,255,255,0.65)" weight="bold" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        left: spacingX._12,
        right: spacingX._12,
        zIndex: 9500,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
        backgroundColor: "#1c1917",
        borderRadius: radius._20,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._10,
        borderWidth: 1.5,
        borderColor: "rgba(250, 204, 21, 0.52)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        elevation: 12,
    },
    avatarHolder: {
        position: "relative",
        flexShrink: 0,
    },
    liveDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: "#22c55e",
        borderWidth: 2,
        borderColor: "#1c1917",
    },
    textWrap: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
        minWidth: 0,
    },
    typeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(250, 204, 21, 0.14)",
        borderWidth: 1,
        borderColor: "rgba(250, 204, 21, 0.28)",
        paddingHorizontal: scale(6),
        paddingVertical: 1,
        borderRadius: radius.full,
        flexShrink: 0,
    },
    replyPill: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: radius.full,
        flexShrink: 0,
    },
    closeBtn: {
        padding: 4,
        flexShrink: 0,
    },
});
