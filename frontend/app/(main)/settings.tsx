/**
 * frontend/app/(main)/settings.tsx
 *
 * Central settings hub. Accessible from the profile screen.
 * Intentionally does NOT include a light/dark mode toggle.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    Image,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    Platform,
    Linking,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import { scale, verticalScale } from "../../utils/styling";
import { useAuth } from "../../contexts/authContext";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const BUG_REPORT_URL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Bug%20Report&body=Describe%20the%20bug%20you%20encountered%3A%0A%0A";
const FEEDBACK_EMAIL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Feedback&body=Hi%20Arnav%2C%0A%0A";

const NOTIF_KEY = "bubbly_notifications_enabled";
const SOUND_KEY = "bubbly_sound_enabled";

const openLink = async (url: string) => {
    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
    } catch (_) { }
};

// ─── Reusable pieces ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <View style={styles.sectionLabelRow}>
        <View style={styles.sectionLabelBar} />
        <Typo
            size={12}
            fontWeight="600"
            color={colors.neutral500}
            style={styles.sectionLabel}
        >
            {label.toUpperCase()}
        </Typo>
    </View>
);

const SectionCard: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => <View style={styles.card}>{children}</View>;

interface RowProps {
    icon: IconName;
    iconColor?: string;
    iconBg?: string;
    label: string;
    subtitle?: string;
    isLast?: boolean;
    danger?: boolean;
    right?: React.ReactNode;
    onPress?: () => void;
}

const Row: React.FC<RowProps> = ({
    icon,
    iconColor = colors.neutral700,
    iconBg = colors.neutral100,
    label,
    subtitle,
    isLast = false,
    danger = false,
    right,
    onPress,
}) => (
    <TouchableOpacity
        activeOpacity={onPress ? 0.6 : 1}
        onPress={onPress}
        disabled={!onPress}
        style={[styles.row, !isLast && styles.rowBorder]}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
                <MaterialIcons name={icon} size={19} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
                <Typo
                    size={14.5}
                    fontWeight="500"
                    color={danger ? colors.rose : colors.neutral800}
                >
                    {label}
                </Typo>
                {subtitle && (
                    <Typo
                        size={11.5}
                        color={colors.neutral400}
                        style={{ marginTop: verticalScale(2) }}
                    >
                        {subtitle}
                    </Typo>
                )}
            </View>
        </View>
        {right ??
            (onPress && (
                <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={colors.neutral350}
                />
            ))}
    </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [loadingPrefs, setLoadingPrefs] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [notif, sound] = await Promise.all([
                    AsyncStorage.getItem(NOTIF_KEY),
                    AsyncStorage.getItem(SOUND_KEY),
                ]);
                if (notif !== null) setNotificationsEnabled(notif === "true");
                if (sound !== null) setSoundEnabled(sound === "true");
            } catch (_) {
            } finally {
                setLoadingPrefs(false);
            }
        })();
    }, []);

    const toggleNotifications = useCallback(async (value: boolean) => {
        setNotificationsEnabled(value);
        try {
            await AsyncStorage.setItem(NOTIF_KEY, String(value));
        } catch (_) { }
    }, []);

    const toggleSound = useCallback(async (value: boolean) => {
        setSoundEnabled(value);
        try {
            await AsyncStorage.setItem(SOUND_KEY, String(value));
        } catch (_) { }
    }, []);

    const handleLogout = useCallback(() => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        await signOut();
                        // signOut() already navigates to /(auth)/welcome internally
                    } catch (_) {
                        Alert.alert("Error", "Something went wrong. Please try again.");
                    }
                },
            },
        ]);
    }, [signOut]);

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            "Delete Account",
            "This will permanently delete your account and all your data. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "Contact Support",
                            "Please email us to complete account deletion.",
                            [
                                {
                                    text: "Email Us",
                                    onPress: () =>
                                        openLink(
                                            "mailto:arnavkhari.77@gmail.com?subject=Delete%20My%20Bubbly%20Account"
                                        ),
                                },
                                { text: "Cancel", style: "cancel" },
                            ]
                        );
                    },
                },
            ]
        );
    }, []);

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <BackButton />
                <Typo
                    size={16}
                    fontWeight="600"
                    color={colors.neutral900}
                    style={styles.headerTitle}
                >
                    Settings
                </Typo>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    style={styles.profileCard}
                    activeOpacity={0.7}
                    onPress={() => router.push("/(main)/profileModel")}
                >
                    <Image
                        source={
                            user?.avatar
                                ? { uri: user.avatar }
                                : require("@/assets/images/defaultAvatar.png")
                        }
                        style={styles.profileAvatar}
                    />
                    <View style={{ flex: 1 }}>
                        <Typo size={16} fontWeight="700" color={colors.neutral900}>
                            {user?.name ?? "Your Profile"}
                        </Typo>
                        <Typo
                            size={12.5}
                            color={colors.neutral500}
                            style={{ marginTop: verticalScale(2) }}
                        >
                            {user?.email ?? "Tap to edit your profile"}
                        </Typo>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={colors.neutral350}
                    />
                </TouchableOpacity>

                <SectionLabel label="Preferences" />
                <SectionCard>
                    <Row
                        icon="notifications"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Notifications"
                        subtitle="Message & call alerts"
                        right={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={toggleNotifications}
                                trackColor={{
                                    false: colors.neutral300,
                                    true: colors.primary,
                                }}
                                thumbColor={colors.white}
                                disabled={loadingPrefs}
                            />
                        }
                    />
                    <Row
                        icon="volume-up"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Sound & Vibration"
                        subtitle="Playback for incoming messages"
                        isLast
                        right={
                            <Switch
                                value={soundEnabled}
                                onValueChange={toggleSound}
                                trackColor={{
                                    false: colors.neutral300,
                                    true: colors.primary,
                                }}
                                thumbColor={colors.white}
                                disabled={loadingPrefs}
                            />
                        }
                    />
                </SectionCard>

                <SectionLabel label="Privacy" />
                <SectionCard>
                    <Row
                        icon="shield"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Blocked Contacts"
                        subtitle="Manage people you've blocked"
                        onPress={() =>
                            Alert.alert("Coming Soon", "This feature is on the way.")
                        }
                    />
                    <Row
                        icon="lock"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Change Password"
                        onPress={() =>
                            Alert.alert("Coming Soon", "This feature is on the way.")
                        }
                        isLast
                    />
                </SectionCard>

                <SectionLabel label="Support" />
                <SectionCard>
                    <Row
                        icon="refresh"
                        iconColor={colors.neutral700}
                        label="Replay Onboarding"
                        onPress={() => router.push("/onboarding?replay=true")}
                    />
                    <Row
                        icon="bug-report"
                        iconColor={colors.neutral700}
                        label="Report a Bug"
                        onPress={() => openLink(BUG_REPORT_URL)}
                    />
                    <Row
                        icon="mail"
                        iconColor={colors.neutral700}
                        label="Send Feedback"
                        onPress={() => openLink(FEEDBACK_EMAIL)}
                    />
                    <Row
                        icon="info"
                        iconColor={colors.neutral700}
                        label="About Bubbly"
                        onPress={() => router.push("/(main)/about")}
                        isLast
                    />
                </SectionCard>

                <SectionLabel label="Account" />
                <SectionCard>
                    <Row
                        icon="logout"
                        iconColor={colors.rose}
                        iconBg={colors.rose + "1F"}
                        label="Log Out"
                        danger
                        onPress={handleLogout}
                    />
                    <Row
                        icon="delete"
                        iconColor={colors.rose}
                        iconBg={colors.rose + "1F"}
                        label="Delete Account"
                        danger
                        onPress={handleDeleteAccount}
                        isLast
                    />
                </SectionCard>

                <View style={styles.footer}>
                    <Typo size={11.5} color={colors.neutral400}>
                        Bubbly · Made with care
                    </Typo>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingTop:
            Platform.OS === "android" ? verticalScale(8) : verticalScale(4),
        paddingBottom: verticalScale(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral200,
        backgroundColor: colors.neutral100,
    },
    headerTitle: { flex: 1, textAlign: "center" },
    headerSpacer: { width: scale(36) },

    scrollContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._20,
        paddingBottom: spacingY._40,
        backgroundColor: colors.neutral100,
    },

    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        backgroundColor: colors.white,
        borderRadius: radius._15,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.neutral200,
        padding: spacingX._15,
        marginBottom: spacingY._10,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: { elevation: 1 },
        }),
    },
    profileAvatar: {
        width: scale(52),
        height: scale(52),
        borderRadius: scale(26),
        backgroundColor: colors.neutral200,
    },

    sectionLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacingY._20,
        marginBottom: spacingY._8,
        marginLeft: spacingX._4,
        gap: scale(6),
    },
    sectionLabelBar: {
        width: scale(4),
        height: verticalScale(12),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    sectionLabel: { letterSpacing: 0.6 },

    card: {
        backgroundColor: colors.white,
        borderRadius: radius._15,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.neutral200,
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
            },
            android: { elevation: 1 },
        }),
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: verticalScale(12),
        paddingHorizontal: spacingX._15,
        minHeight: verticalScale(58),
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral200,
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        flex: 1,
        paddingRight: spacingX._10,
    },
    iconBadge: {
        width: scale(34),
        height: scale(34),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
    },

    footer: {
        alignItems: "center",
        marginTop: spacingY._30,
        paddingBottom: spacingY._10,
    },
});