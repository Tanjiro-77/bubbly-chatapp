/**
 * frontend/components/RealtimeNotifier.tsx
 *
 * App-wide real-time message & incoming-call coordinator:
 * - Reconnects Socket.IO, refreshes push token, and checks pending incoming calls on AppState active.
 * - Shows a Honey Amber floating banner across EVERY screen when new messages arrive for another chat.
 * - Fires local OS notifications if a socket message or incoming call arrives while backgrounded.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Icons from "phosphor-react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "../contexts/authContext";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { connectSocket } from "../socket/socket";
import { newMessage, onCallIncoming } from "../socket/socketEvents";
import {
    claimIncomingCallScreen,
    getActiveConversationId,
    registerForPushNotificationsAsync,
} from "../services/notificationService";
import { getPendingIncomingCall } from "../services/callService";
import {
    formatRichPreviewText,
    getFocusMode,
    getPrivacyShield,
} from "../utils/featureStorage";
import { hapticTap } from "../utils/haptics";
import { IncomingCallProps, ResponseProps } from "../types";
import Avatar from "./Avatar";
import Typo from "./Typo";

interface FloatingBannerState {
    id: string;
    convId: string;
    title: string;
    preview: string;
    avatar?: string;
    senderId?: string;
    conversationType: string;
    conversationName?: string;
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

    const launchIncomingCall = useCallback(
        (payload: {
            callId: string;
            callerId?: string;
            callerName: string;
            callerAvatar?: string;
            kind: string;
            conversationId: string;
        }) => {
            if (!payload?.callId || !claimIncomingCallScreen(payload.callId)) return;

            hapticTap("heavy");

            if (Platform.OS !== "web" && appStateRef.current !== "active") {
                Notifications.scheduleNotificationAsync({
                    content: {
                        title: payload.kind === "video" ? "Incoming Video Call" : "Incoming Voice Call",
                        body: `${payload.callerName} is calling you on Bubbly`,
                        sound: "default",
                        data: {
                            type: "call",
                            callId: payload.callId,
                            callerId: payload.callerId || "",
                            callerName: payload.callerName,
                            callerAvatar: payload.callerAvatar || "",
                            kind: payload.kind || "voice",
                            conversationId: payload.conversationId,
                        },
                    },
                    trigger: null,
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
            if (res?.success && pending?.callId) {
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

    // Ensure AppState resume immediately reconnects socket, refreshes push token, and checks pending calls
    useEffect(() => {
        if (!user) return;

        checkPendingCallFallback();

        const sub = AppState.addEventListener("change", (nextState) => {
            const prev = appStateRef.current;
            appStateRef.current = nextState;
            if (prev !== "active" && nextState === "active") {
                connectSocket().catch(() => {});
                registerForPushNotificationsAsync(token).catch(() => {});
                checkPendingCallFallback();
            }
        });

        return () => sub.remove();
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

        const handleGlobalMessage = async (res: ResponseProps) => {
            if (!res?.success || !res.data?.id) return;
            const msg = res.data;

            // Never alert for messages sent by the current user or silent deliveries
            if (msg.sender?.id?.toString() === user.id?.toString() || msg.isSilent) return;

            // Never interrupt if user is actively inside that exact conversation
            const activeConvId = getActiveConversationId();
            if (activeConvId && msg.conversationId?.toString() === activeConvId.toString()) return;

            try {
                const [enabledPref, soundPref, focus, privacy] = await Promise.all([
                    AsyncStorage.getItem("bubbly_notifications_enabled"),
                    AsyncStorage.getItem("bubbly_sound_enabled"),
                    getFocusMode(),
                    getPrivacyShield(),
                ]);

                if (enabledPref === "false" || focus.enabled) return;

                const senderName = privacy.hideNotificationPreview
                    ? "Bubbly"
                    : msg.sender?.name || "New Message";
                const rawPreview =
                    formatRichPreviewText(msg.content) ||
                    (msg.voiceUrl
                        ? "🎤 Voice message"
                        : msg.type === "file"
                        ? "📎 Document"
                        : msg.attachement
                        ? "📷 Photo"
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
                    hapticTap("medium");
                    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                    setBanner({
                        id: String(msg.id),
                        convId: String(msg.conversationId),
                        title,
                        preview,
                        avatar: privacy.hideNotificationPreview ? undefined : msg.sender?.avatar,
                        senderId: msg.sender?.id,
                        conversationType: (res as any).conversationType || "direct",
                        conversationName: (res as any).conversationName || senderName,
                    });
                    dismissTimerRef.current = setTimeout(() => {
                        setBanner(null);
                    }, 4200);
                } else if (Platform.OS !== "web") {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title,
                            body: preview.slice(0, 180),
                            sound: soundPref === "false" ? undefined : "default",
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
                        },
                        trigger: null,
                    }).catch(() => {});
                }
            } catch {}
        };

        onCallIncoming(handleGlobalIncomingCall);
        newMessage(handleGlobalMessage);

        return () => {
            onCallIncoming(handleGlobalIncomingCall, true);
            newMessage(handleGlobalMessage, true);
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        };
    }, [user, launchIncomingCall]);

    if (!user || !banner) return null;

    const handleOpenBanner = () => {
        const current = banner;
        setBanner(null);
        hapticTap("light");
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

    return (
        <Animated.View
            entering={FadeInUp.duration(240).springify()}
            exiting={FadeOutUp.duration(180)}
            style={[styles.wrap, { top: Math.max(insets.top, 12) + verticalScale(6) }]}
            pointerEvents="box-none"
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenBanner}
                style={styles.card}
            >
                <Avatar size={38} uri={banner.avatar || null} isGroup={banner.conversationType === "group"} />
                <View style={styles.textWrap}>
                    <Typo size={13.5} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                        {banner.title}
                    </Typo>
                    <Typo size={12} color="rgba(255,255,255,0.78)" textProps={{ numberOfLines: 1 }}>
                        {banner.preview}
                    </Typo>
                </View>
                <View style={styles.replyPill}>
                    <Typo size={11} fontWeight="800" color={colors.black}>Open</Typo>
                </View>
                <TouchableOpacity
                    onPress={() => setBanner(null)}
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
        borderColor: "rgba(245, 158, 11, 0.5)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
    },
    textWrap: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    replyPill: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
        flexShrink: 0,
    },
    closeBtn: {
        padding: 4,
        flexShrink: 0,
    },
});
