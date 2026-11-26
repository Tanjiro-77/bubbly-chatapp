/**
 * frontend/app/(main)/contactProfile.tsx
 *
 * Rich Contact & Group Profile Detail Screen (V3.4.0 Flagship Feature).
 * Displays full contact avatar, online status, bio, encryption verification,
 * quick call shortcuts, media preview shortcuts, and secret vault toggle.
 */

import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Share,
} from "react-native";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import {
    callInvite,
    toggleMuteConversation,
    getUserStatus,
    onUserStatus,
    deleteConversation,
} from "../../socket/socketEvents";
import { useAuth } from "../../contexts/authContext";

const ContactProfileScreen = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { userId, name, avatar, isDirect, conversationId } = useLocalSearchParams();
    const userIdStr = Array.isArray(userId) ? userId[0] : (userId as string);
    const conversationIdStr = Array.isArray(conversationId) ? conversationId[0] : (conversationId as string);
    const nameStr = Array.isArray(name) ? name[0] : (name as string);

    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const displayName = nameStr || "Contact";
    const isDirectChat = isDirect !== "false";

    const lockedStorageKey = currentUser?.id ? `@bubbly_locked_chats_${currentUser.id}` : "@bubbly_locked_chats";

    // ── Check Vault Lock Status ──
    useEffect(() => {
        if (!conversationIdStr) return;
        AsyncStorage.getItem(lockedStorageKey)
            .then((stored) => {
                if (stored) {
                    try {
                        const list = JSON.parse(stored);
                        if (Array.isArray(list) && list.includes(conversationIdStr)) {
                            setIsLocked(true);
                        }
                    } catch (_) {}
                }
            })
            .catch(() => {});
    }, [conversationIdStr, lockedStorageKey]);

    // ── Listen for User Online Status ──
    useEffect(() => {
        if (!userIdStr || !isDirectChat) return;

        const liveHandler = (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
            if (data.userId === userIdStr) {
                setIsOnline(data.isOnline);
                if (data.lastSeen) setLastSeen(data.lastSeen);
            }
        };

        const initialHandler = (res: any) => {
            if (res?.success && res.data && res.data.userId === userIdStr) {
                setIsOnline(!!res.data.isOnline);
                if (res.data.lastSeen) setLastSeen(res.data.lastSeen);
            }
        };

        onUserStatus(liveHandler);
        getUserStatus(initialHandler);
        getUserStatus({ userId: userIdStr });

        return () => {
            onUserStatus(liveHandler, true);
            getUserStatus(initialHandler, true);
        };
    }, [userIdStr, isDirectChat]);

    // ── Call Handlers ──
    const handleStartCall = (kind: "voice" | "video") => {
        if (!conversationIdStr || !userIdStr || !currentUser) {
            BubblyAlert.alert("Call Unavailable", "Unable to place call at this moment.");
            return;
        }
        const { isSocketConnected } = require("../../socket/socketEvents");
        if (!isSocketConnected()) {
            BubblyAlert.alert("Offline", "Connect to the internet to place a call.");
            return;
        }
        callInvite({
            conversationId: conversationIdStr,
            calleeId: userIdStr,
            kind,
        });
        router.back();
    };

    // ── Vault Lock Toggle ──
    const handleToggleVault = async () => {
        if (!conversationId) return;
        try {
            const stored = await AsyncStorage.getItem(lockedStorageKey);
            let list: string[] = [];
            if (stored) {
                try {
                    list = JSON.parse(stored);
                } catch (_) {}
            }

            if (isLocked) {
                list = list.filter((id) => id !== (conversationId as string));
                await AsyncStorage.setItem(lockedStorageKey, JSON.stringify(list));
                setIsLocked(false);
                BubblyAlert.alert("Chat Unlocked", "Conversation removed from your Secret Vault.");
            } else {
                if (!list.includes(conversationId as string)) {
                    list.push(conversationId as string);
                }
                await AsyncStorage.setItem(lockedStorageKey, JSON.stringify(list));
                setIsLocked(true);
                BubblyAlert.alert("Chat Locked 🔒", "Conversation is now hidden in your Secret Vault.");
            }
        } catch (_) {
            BubblyAlert.alert("Error", "Could not update vault lock.");
        }
    };

    // ── Mute Toggle ──
    const handleMuteOptions = () => {
        BubblyAlert.alert(
            "Mute Notifications",
            "Choose duration to mute notifications:",
            [
                {
                    text: "8 Hours",
                    onPress: () => {
                        toggleMuteConversation({ conversationId: conversationId as string, durationHours: 8 });
                        setIsMuted(true);
                    },
                },
                {
                    text: "1 Week",
                    onPress: () => {
                        toggleMuteConversation({ conversationId: conversationId as string, durationHours: 168 });
                        setIsMuted(true);
                    },
                },
                {
                    text: "Always",
                    onPress: () => {
                        toggleMuteConversation({ conversationId: conversationId as string, durationHours: 0 });
                        setIsMuted(true);
                    },
                },
                {
                    text: "Unmute",
                    onPress: () => {
                        toggleMuteConversation({ conversationId: conversationId as string, unmute: true });
                        setIsMuted(false);
                    },
                },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    // ── Share Contact Card ──
    const handleShareContact = async () => {
        try {
            await Share.share({
                title: `Contact - ${displayName}`,
                message: `Connect with ${displayName} on Bubbly Messenger! ✨`,
            });
        } catch (_) {}
    };

    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.6}>
            <View style={styles.container}>
                {/* ── Top App Bar ── */}
                <View style={styles.topBar}>
                    <BackButton iconSize={22} />
                    <Typo size={17} fontWeight="700" color={colors.white} style={{ flex: 1, textAlign: "center" }} textProps={{ numberOfLines: 1 }}>
                        {isDirectChat ? "Contact Info" : "Group Info"}
                    </Typo>
                    <TouchableOpacity onPress={handleShareContact} activeOpacity={0.7} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icons.ShareNetwork size={verticalScale(20)} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                </View>

                {/* ── Content Card ── */}
                <View style={styles.sheet}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* ── Hero Profile ── */}
                    <View style={styles.heroSection}>
                        <View style={styles.avatarWrap}>
                            <Avatar uri={avatar as string} size={96} isGroup={!isDirectChat} />
                            {isDirectChat && isOnline && <View style={styles.onlineBadge} />}
                        </View>
                        <Typo size={22} fontWeight="800" color={colors.neutral900} style={styles.nameText}>
                            {displayName}
                        </Typo>
                        <Typo size={13} color={colors.neutral500} fontWeight="500">
                            {isDirectChat
                                ? (isOnline ? "Active Now 🟢" : "Bubbly Contact ✨")
                                : "Group Conversation 👥"}
                        </Typo>
                    </View>

                    {/* ── Quick Action Dock ── */}
                    <View style={styles.actionDock}>
                        {isDirectChat && (
                            <>
                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => handleStartCall("voice")}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.actionCircle}>
                                        <Icons.Phone size={22} color={colors.primaryDark} weight="fill" />
                                    </View>
                                    <Typo size={11.5} fontWeight="600" color={colors.neutral700}>Audio</Typo>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => handleStartCall("video")}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.actionCircle}>
                                        <Icons.VideoCamera size={22} color={colors.primaryDark} weight="fill" />
                                    </View>
                                    <Typo size={11.5} fontWeight="600" color={colors.neutral700}>Video</Typo>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => {
                                router.push({
                                    pathname: "/(main)/sharedMedia",
                                    params: {
                                        conversationId: conversationId as string,
                                        name: displayName,
                                    },
                                });
                            }}
                            activeOpacity={0.75}
                        >
                            <View style={styles.actionCircle}>
                                <Icons.Images size={22} color={colors.primaryDark} weight="fill" />
                            </View>
                            <Typo size={11.5} fontWeight="600" color={colors.neutral700}>Media</Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={handleMuteOptions}
                            activeOpacity={0.75}
                        >
                            <View style={[styles.actionCircle, isMuted && styles.actionCircleActive]}>
                                <Icons.BellSlash size={22} color={isMuted ? colors.white : colors.primaryDark} weight="fill" />
                            </View>
                            <Typo size={11.5} fontWeight="600" color={colors.neutral700}>
                                {isMuted ? "Muted" : "Mute"}
                            </Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={handleToggleVault}
                            activeOpacity={0.75}
                        >
                            <View style={[styles.actionCircle, isLocked && styles.actionCircleActive]}>
                                <Icons.LockKey size={22} color={isLocked ? colors.white : colors.primaryDark} weight="fill" />
                            </View>
                            <Typo size={11.5} fontWeight="600" color={colors.neutral700}>
                                {isLocked ? "Locked" : "Vault"}
                            </Typo>
                        </TouchableOpacity>
                    </View>

                    {/* ── About & Bio Section ── */}
                    <View style={styles.card}>
                        <Typo size={12} fontWeight="700" color={colors.neutral400} style={styles.cardHeader}>
                            ABOUT & STATUS
                        </Typo>
                        <View style={styles.cardRow}>
                            <Icons.Sparkle size={18} color={colors.primaryDark} weight="fill" />
                            <View style={{ flex: 1 }}>
                                <Typo size={14.5} fontWeight="600" color={colors.neutral900}>
                                    Available on Bubbly ✨
                                </Typo>
                                <Typo size={11.5} color={colors.neutral400} style={{ marginTop: 2 }}>
                                    Joined Bubbly Flagship Edition
                                </Typo>
                            </View>
                        </View>
                    </View>

                    {/* ── Security & Encryption Section ── */}
                    <View style={styles.card}>
                        <Typo size={12} fontWeight="700" color={colors.neutral400} style={styles.cardHeader}>
                            SECURITY & ENCRYPTION
                        </Typo>
                        <View style={styles.cardRow}>
                            <Icons.ShieldCheck size={20} color={colors.green} weight="fill" />
                            <View style={{ flex: 1 }}>
                                <Typo size={14} fontWeight="700" color={colors.neutral900}>
                                    End-to-End Encrypted 🔒
                                </Typo>
                                <Typo size={11.5} color={colors.neutral500} style={{ marginTop: 3, lineHeight: 16 }}>
                                    Messages and calls are secured with Bubbly Shield. No one outside of this chat can read or listen to them.
                                </Typo>
                            </View>
                        </View>
                    </View>

                    {/* ── Shortcuts Section ── */}
                    <View style={styles.card}>
                        <Typo size={12} fontWeight="700" color={colors.neutral400} style={styles.cardHeader}>
                            CONVERSATION TOOLS
                        </Typo>

                        <TouchableOpacity
                            style={styles.toolRow}
                            onPress={() => {
                                router.push({
                                    pathname: "/(main)/sharedMedia",
                                    params: { conversationId: conversationId as string, name: displayName },
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Icons.FileText size={18} color={colors.primaryDark} weight="bold" />
                            <Typo size={14} fontWeight="600" color={colors.neutral800} style={{ flex: 1 }}>
                                Media, Links and Docs
                            </Typo>
                            <Icons.CaretRight size={16} color={colors.neutral400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.toolRow}
                            onPress={() => router.push("/(main)/starredMessages")}
                            activeOpacity={0.7}
                        >
                            <Icons.Star size={18} color="#f59e0b" weight="fill" />
                            <Typo size={14} fontWeight="600" color={colors.neutral800} style={{ flex: 1 }}>
                                Starred Messages
                            </Typo>
                            <Icons.CaretRight size={16} color={colors.neutral400} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.toolRow}
                            onPress={handleToggleVault}
                            activeOpacity={0.7}
                        >
                            <Icons.LockSimple size={18} color={colors.rose} weight="fill" />
                            <Typo size={14} fontWeight="600" color={colors.neutral800} style={{ flex: 1 }}>
                                {isLocked ? "Unlock from Secret Vault" : "Lock in Secret Chat Vault"}
                            </Typo>
                            <Icons.CaretRight size={16} color={colors.neutral400} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Danger Zone ── */}
                    <View style={[styles.card, { marginBottom: verticalScale(40) }]}>
                        <TouchableOpacity
                            style={styles.dangerRow}
                            onPress={() => {
                                BubblyAlert.alert(
                                    "Clear Chat",
                                    "Are you sure you want to clear message history from this conversation?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Clear & Hide",
                                            style: "destructive",
                                            onPress: async () => {
                                                if (conversationIdStr) {
                                                    deleteConversation({ conversationId: conversationIdStr });
                                                    await AsyncStorage.removeItem(`@bubbly_draft_${conversationIdStr}`).catch(() => {});
                                                    await AsyncStorage.removeItem(`@bubbly_outbox_${conversationIdStr}`).catch(() => {});
                                                }
                                                if (router.canDismiss?.()) router.dismissAll();
                                                router.replace("/(main)/home");
                                            },
                                        },
                                    ]
                                );
                            }}
                            activeOpacity={0.7}
                        >
                            <Icons.Trash size={18} color={colors.rose} weight="bold" />
                            <Typo size={14} fontWeight="700" color={colors.rose}>
                                Clear Chat History
                            </Typo>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                </View>
            </View>
        </ScreenWrapper>
    );
};

export default ContactProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._10,
        paddingBottom: spacingY._15,
    },
    iconBtn: {
        padding: spacingY._7,
    },
    sheet: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._40,
        borderTopRightRadius: radius._40,
        borderCurve: "continuous",
        overflow: "hidden",
    },
    scrollContent: {
        paddingTop: spacingY._25,
        paddingHorizontal: spacingX._20,
        paddingBottom: verticalScale(40),
        gap: spacingY._15,
        flexGrow: 1,
    },
    heroSection: {
        alignItems: "center",
        gap: spacingY._7,
        marginBottom: spacingY._10,
    },
    avatarWrap: {
        position: "relative",
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    onlineBadge: {
        position: "absolute",
        bottom: 4,
        right: 4,
        width: verticalScale(18),
        height: verticalScale(18),
        borderRadius: radius.full,
        backgroundColor: colors.emerald,
        borderWidth: 3,
        borderColor: colors.white,
    },
    nameText: {
        marginTop: spacingY._5,
        textAlign: "center",
    },
    actionDock: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: colors.white,
        borderRadius: radius._20,
        paddingVertical: spacingY._12,
        paddingHorizontal: spacingX._8,
        gap: scale(8),
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        marginBottom: spacingY._5,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    actionItem: {
        alignItems: "center",
        gap: spacingY._5,
        minWidth: scale(52),
    },
    actionCircle: {
        width: verticalScale(46),
        height: verticalScale(46),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    actionCircleActive: {
        backgroundColor: colors.primaryDark,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius._20,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        gap: spacingY._10,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    cardHeader: {
        letterSpacing: 0.5,
    },
    cardRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacingX._12,
    },
    toolRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
        paddingVertical: spacingY._8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral200,
    },
    dangerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
        paddingVertical: spacingY._5,
    },
});
