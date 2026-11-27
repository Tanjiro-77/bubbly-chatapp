import React, { useEffect, useMemo, useState } from "react";
import {
    Linking,
    Modal,
    Platform,
    Share,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Icons from "phosphor-react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Typo from "./Typo";
import { BubblyAlert } from "./BubblyAlert";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";

export interface InviteRecipient {
    id?: string;
    name?: string;
    phoneNumber?: string;
}

interface InviteSheetModalProps {
    visible: boolean;
    recipient?: InviteRecipient | null;
    senderName?: string;
    senderId?: string;
    onInvited?: (recipient?: InviteRecipient | null) => void;
    onClose: () => void;
}

type MessageTone = "friendly" | "short" | "calls";

export const InviteSheetModal = ({
    visible,
    recipient,
    senderName,
    senderId,
    onInvited,
    onClose,
}: InviteSheetModalProps) => {
    const insets = useSafeAreaInsets();
    const inviteLink = senderId ? `https://bubbly.app/u/${senderId}` : "https://bubbly.app";
    const firstName = recipient?.name?.trim().split(" ")[0] || "";

    const [tone, setTone] = useState<MessageTone>("friendly");
    const [customText, setCustomText] = useState("");
    const [copiedKind, setCopiedKind] = useState<"link" | "msg" | null>(null);

    const buildPresetMessage = useMemo(() => {
        const greeting = firstName ? `Hey ${firstName}!` : "Hey!";
        const byLine = senderName ? ` (${senderName})` : "";
        if (tone === "short") {
            return `${greeting} Join me on Bubbly Messenger: ${inviteLink}`;
        }
        if (tone === "calls") {
            return `${greeting} Let's connect on Bubbly for instant chats & crystal-clear HD calls${byLine}: ${inviteLink}`;
        }
        return `${greeting} Join me on Bubbly Messenger to chat, share stories & make HD calls! Tap my link to add me${byLine}: ${inviteLink}`;
    }, [firstName, senderName, inviteLink, tone]);

    useEffect(() => {
        if (visible) {
            setCustomText(buildPresetMessage);
            setCopiedKind(null);
        }
    }, [visible, buildPresetMessage]);

    if (!visible) return null;

    const finalMessage = (customText || buildPresetMessage).trim();
    const rawPhone = (recipient?.phoneNumber || "").trim();
    const phoneDigits = rawPhone.replace(/[^\d]/g, "");

    const handleSendSMS = async () => {
        hapticTap("heavy");
        const separator = Platform.OS === "ios" ? "&" : "?";
        const target = rawPhone ? encodeURIComponent(rawPhone) : "";
        const smsUrl = `sms:${target}${separator}body=${encodeURIComponent(finalMessage)}`;
        try {
            const supported = await Linking.canOpenURL(smsUrl);
            if (!supported) {
                await Share.share({ title: "Invite to Bubbly", message: finalMessage, url: inviteLink });
            } else {
                await Linking.openURL(smsUrl);
            }
            hapticTap("success");
            onInvited?.(recipient);
            onClose();
        } catch {
            BubblyAlert.alert("SMS Unavailable", "Could not open your Messages app. Try Share or Copy Link instead.");
        }
    };

    const handleSendWhatsApp = async () => {
        hapticTap("heavy");
        const waUrl = phoneDigits
            ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(finalMessage)}`
            : `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
        try {
            const supported = await Linking.canOpenURL(waUrl);
            if (!supported) {
                await Share.share({ title: "Invite to Bubbly", message: finalMessage, url: inviteLink });
            } else {
                await Linking.openURL(waUrl);
            }
            hapticTap("success");
            onInvited?.(recipient);
            onClose();
        } catch {
            BubblyAlert.alert("WhatsApp Unavailable", "Could not open WhatsApp on this device.");
        }
    };

    const handleSystemShare = async () => {
        hapticTap("medium");
        try {
            const res = await Share.share({
                title: "Join me on Bubbly Messenger",
                message: finalMessage,
                url: inviteLink,
            });
            if (res.action !== Share.dismissedAction) {
                hapticTap("success");
                onInvited?.(recipient);
            }
        } catch {}
    };

    const handleCopy = async (kind: "link" | "msg") => {
        hapticTap("celebration");
        await Clipboard.setStringAsync(kind === "link" ? inviteLink : finalMessage).catch(() => {});
        setCopiedKind(kind);
        onInvited?.(recipient);
        setTimeout(() => setCopiedKind(null), 1800);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            entering={FadeInUp.duration(240)}
                            style={[
                                styles.sheet,
                                { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._8 },
                            ]}
                        >
                            <View style={styles.handle} />

                            {/* Header */}
                            <View style={styles.headerRow}>
                                <View style={styles.headerLeft}>
                                    <View style={styles.avatarCircle}>
                                        {recipient?.name ? (
                                            <Typo size={16} fontWeight="800" color={colors.neutral900}>
                                                {recipient.name.charAt(0).toUpperCase()}
                                            </Typo>
                                        ) : (
                                            <Icons.PaperPlaneTilt size={20} color={colors.neutral900} weight="fill" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Typo size={16.5} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                            {recipient?.name ? `Invite ${recipient.name}` : "Invite Friends to Bubbly"}
                                        </Typo>
                                        <Typo size={12} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                                            {rawPhone || "Share your personal invite link"}
                                        </Typo>
                                    </View>
                                </View>

                                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                                    <Icons.X size={16} color={colors.neutral600} weight="bold" />
                                </TouchableOpacity>
                            </View>

                            {/* Tone Presets */}
                            <View style={styles.toneRow}>
                                {([
                                    { id: "friendly", label: "✨ Friendly" },
                                    { id: "short", label: "⚡ Quick" },
                                    { id: "calls", label: "📞 HD Calls" },
                                ] as const).map((item) => {
                                    const active = tone === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => {
                                                hapticTap("light");
                                                setTone(item.id);
                                            }}
                                            style={[styles.toneChip, active && styles.toneChipActive]}
                                            activeOpacity={0.75}
                                        >
                                            <Typo
                                                size={11.5}
                                                fontWeight={active ? "800" : "600"}
                                                color={active ? colors.neutral900 : colors.neutral500}
                                            >
                                                {item.label}
                                            </Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Editable Preview Message */}
                            <View style={styles.messageBox}>
                                <View style={styles.messageBoxHeader}>
                                    <Typo size={11} fontWeight="700" color={colors.neutral500}>
                                        INVITATION MESSAGE
                                    </Typo>
                                    <TouchableOpacity onPress={() => handleCopy("msg")} activeOpacity={0.7}>
                                        <Typo size={11} fontWeight="700" color={copiedKind === "msg" ? "#16a34a" : colors.primaryDark}>
                                            {copiedKind === "msg" ? "Copied ✓" : "Copy Text"}
                                        </Typo>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    value={customText}
                                    onChangeText={setCustomText}
                                    multiline
                                    style={styles.messageInput}
                                    placeholderTextColor={colors.neutral400}
                                />
                            </View>

                            {/* Personal Link Pill */}
                            <TouchableOpacity
                                onPress={() => handleCopy("link")}
                                style={styles.linkBar}
                                activeOpacity={0.8}
                            >
                                <Icons.LinkSimple size={16} color={colors.primaryDark} weight="bold" />
                                <Typo
                                    size={12.5}
                                    fontWeight="600"
                                    color={colors.neutral800}
                                    style={{ flex: 1 }}
                                    textProps={{ numberOfLines: 1, ellipsizeMode: "middle" }}
                                >
                                    {inviteLink}
                                </Typo>
                                <View style={[styles.copyLinkPill, copiedKind === "link" && styles.copyLinkPillDone]}>
                                    <Typo size={11} fontWeight="800" color={copiedKind === "link" ? "#15803d" : colors.neutral900}>
                                        {copiedKind === "link" ? "Copied ✓" : "Copy Link"}
                                    </Typo>
                                </View>
                            </TouchableOpacity>

                            {/* Delivery Channels */}
                            <View style={styles.channelsGrid}>
                                <TouchableOpacity onPress={handleSendSMS} style={styles.channelBtn} activeOpacity={0.8}>
                                    <View style={[styles.channelIcon, { backgroundColor: "#e0f2fe" }]}>
                                        <Icons.ChatText size={20} color="#0284c7" weight="fill" />
                                    </View>
                                    <Typo size={11.5} fontWeight="700" color={colors.neutral800}>
                                        SMS
                                    </Typo>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleSendWhatsApp} style={styles.channelBtn} activeOpacity={0.8}>
                                    <View style={[styles.channelIcon, { backgroundColor: "#dcfce7" }]}>
                                        <Icons.WhatsappLogo size={20} color="#16a34a" weight="fill" />
                                    </View>
                                    <Typo size={11.5} fontWeight="700" color={colors.neutral800}>
                                        WhatsApp
                                    </Typo>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={handleSystemShare} style={styles.channelBtn} activeOpacity={0.8}>
                                    <View style={[styles.channelIcon, { backgroundColor: "#fef3c7" }]}>
                                        <Icons.ShareNetwork size={20} color="#d97706" weight="fill" />
                                    </View>
                                    <Typo size={11.5} fontWeight="700" color={colors.neutral800}>
                                        More Apps
                                    </Typo>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.52)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30,
        borderCurve: "continuous",
        paddingHorizontal: spacingX._20,
        paddingTop: verticalScale(12),
        gap: spacingY._12,
    },
    handle: {
        width: scale(38),
        height: verticalScale(4),
        borderRadius: radius.full,
        backgroundColor: colors.neutral300,
        alignSelf: "center",
        marginBottom: verticalScale(4),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: scale(10),
    },
    headerLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        minWidth: 0,
    },
    avatarCircle: {
        width: scale(44),
        height: scale(44),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        borderWidth: 1.5,
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    closeBtn: {
        width: scale(32),
        height: scale(32),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        justifyContent: "center",
    },
    toneRow: {
        flexDirection: "row",
        gap: scale(8),
    },
    toneChip: {
        flex: 1,
        paddingVertical: verticalScale(7),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "transparent",
    },
    toneChipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    messageBox: {
        backgroundColor: colors.neutral50,
        borderRadius: radius._15,
        borderWidth: 1,
        borderColor: colors.neutral200,
        padding: spacingX._12,
        gap: verticalScale(6),
    },
    messageBoxHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    messageInput: {
        fontSize: verticalScale(13),
        color: colors.neutral800,
        lineHeight: verticalScale(19),
        minHeight: verticalScale(58),
        maxHeight: verticalScale(100),
        textAlignVertical: "top",
        padding: 0,
    },
    linkBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        backgroundColor: colors.neutral100,
        borderRadius: radius._12,
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(8),
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    copyLinkPill: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: radius.full,
    },
    copyLinkPillDone: {
        backgroundColor: "#dcfce7",
    },
    channelsGrid: {
        flexDirection: "row",
        gap: scale(10),
        marginTop: verticalScale(2),
    },
    channelBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: verticalScale(6),
        paddingVertical: verticalScale(12),
        borderRadius: radius._15,
        backgroundColor: colors.neutral50,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    channelIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
});
