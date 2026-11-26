/**
 * frontend/app/(main)/settings.tsx
 *
 * Central settings hub. Accessible from the profile screen.
 * Includes dedicated Native App Permissions management with live OS status.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    ScrollView,
    Image,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Platform,
    Linking,
    AppState,
    AppStateStatus,
} from "react-native";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useRouter } from "expo-router";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import { scale, verticalScale } from "../../utils/styling";
import { useAuth } from "../../contexts/authContext";
import { syncNotificationPreference } from "../../services/notificationService";
import { getBlockedUsers, blockUser, isSocketConnected, updateProfile } from "../../socket/socketEvents";
import {
    ACCENT_SWATCHES,
    BubbleCornerStyle,
    ChatAppearanceConfig,
    ChatFontScale,
    DEFAULT_APPEARANCE,
    DEFAULT_PRIVACY_SHIELD,
    getChatAppearance,
    getFocusMode,
    getPrivacyShield,
    notifyFeatureListeners,
    PrivacyShieldConfig,
    saveChatAppearance,
    savePrivacyShield,
    setFocusMode,
} from "../../utils/featureStorage";
import { cancelMessageReminder, getActiveReminders, SavedMessageReminder } from "../../services/reminderService";
import { RemindersListModal } from "../../components/ConversationFeatureModals";
import {
    checkAllPermissions,
    requestPermissionByKey,
    openDeviceSettings,
    AllPermissionsStatus,
    PermissionKey,
    PERMISSION_METADATA,
} from "../../services/permissionService";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const BUG_REPORT_URL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Bug%20Report&body=Describe%20the%20bug%20you%20encountered%3A%0A%0A";
const FEEDBACK_EMAIL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Feedback&body=Hi%20Arnav%2C%0A%0A";

const NOTIF_KEY = "bubbly_notifications_enabled";
const SOUND_KEY = "bubbly_sound_enabled";
const APP_LOCK_KEY = "bubbly_app_lock_enabled";

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
            <View style={{ flex: 1, minWidth: 0 }}>
                <Typo
                    size={14.5}
                    fontWeight="500"
                    color={danger ? colors.rose : colors.neutral800}
                    textProps={{ numberOfLines: 1 }}
                >
                    {label}
                </Typo>
                {subtitle && (
                    <Typo
                        size={11.5}
                        color={colors.neutral400}
                        style={{ marginTop: verticalScale(2) }}
                        textProps={{ numberOfLines: 2 }}
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

// ─── Permission Row ───────────────────────────────────────────────────────────

interface PermissionRowProps {
    permKey: PermissionKey;
    icon: IconName;
    title: string;
    subtitle: string;
    granted: boolean;
    canAskAgain: boolean;
    isLast?: boolean;
    onRequest: (key: PermissionKey) => void;
}

const PermissionRow: React.FC<PermissionRowProps> = ({
    permKey,
    icon,
    title,
    subtitle,
    granted,
    canAskAgain,
    isLast = false,
    onRequest,
}) => (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
        <View style={styles.rowLeft}>
            <View
                style={[
                    styles.iconBadge,
                    {
                        backgroundColor: granted ? "#dcfce7" : "#fef3c7",
                    },
                ]}
            >
                <MaterialIcons
                    name={icon}
                    size={19}
                    color={granted ? "#16a34a" : "#d97706"}
                />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Typo size={14.5} fontWeight="600" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                    {title}
                </Typo>
                <Typo
                    size={11.5}
                    color={colors.neutral400}
                    style={{ marginTop: verticalScale(2) }}
                    textProps={{ numberOfLines: 2 }}
                >
                    {subtitle}
                </Typo>
            </View>
        </View>

        {granted ? (
            <View style={styles.grantedPill}>
                <MaterialIcons name="check" size={13} color="#16a34a" />
                <Typo size={11} fontWeight="700" color="#16a34a">
                    Allowed
                </Typo>
            </View>
        ) : (
            <TouchableOpacity
                style={styles.enableBtn}
                activeOpacity={0.7}
                onPress={() => onRequest(permKey)}
            >
                <Typo size={11} fontWeight="700" color={colors.neutral900}>
                    {canAskAgain ? "Enable" : "Settings"}
                </Typo>
            </TouchableOpacity>
        )}
    </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [appLockEnabled, setAppLockEnabled] = useState(false);
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [appearance, setAppearance] = useState<ChatAppearanceConfig>(DEFAULT_APPEARANCE);
    const [privacyShield, setPrivacyShield] = useState<PrivacyShieldConfig>(DEFAULT_PRIVACY_SHIELD);
    const [focusEnabled, setFocusEnabled] = useState(false);
    const [reminders, setReminders] = useState<SavedMessageReminder[]>([]);
    const [showReminders, setShowReminders] = useState(false);

    // Live OS permissions state
    const [permissions, setPermissions] = useState<AllPermissionsStatus>({
        camera: { granted: false, canAskAgain: true, status: 'undetermined' },
        microphone: { granted: false, canAskAgain: true, status: 'undetermined' },
        mediaLibrary: { granted: false, canAskAgain: true, status: 'undetermined' },
        notifications: { granted: false, canAskAgain: true, status: 'undetermined' },
        contacts: { granted: false, canAskAgain: true, status: 'undetermined' },
    });

    const refreshPermissions = useCallback(async () => {
        try {
            const status = await checkAllPermissions();
            setPermissions(status);
        } catch (_) { }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [notif, sound, lock, appCfg, shieldCfg, focusCfg, remList] = await Promise.all([
                    AsyncStorage.getItem(NOTIF_KEY),
                    AsyncStorage.getItem(SOUND_KEY),
                    AsyncStorage.getItem(APP_LOCK_KEY),
                    getChatAppearance(),
                    getPrivacyShield(),
                    getFocusMode(),
                    getActiveReminders(),
                ]);
                if (notif !== null) setNotificationsEnabled(notif === "true");
                if (sound !== null) setSoundEnabled(sound === "true");
                if (lock !== null) setAppLockEnabled(lock === "true");
                setAppearance(appCfg);
                setPrivacyShield(shieldCfg);
                setFocusEnabled(focusCfg.enabled);
                setReminders(remList);
            } catch (_) {
            } finally {
                setLoadingPrefs(false);
            }
        })();

        refreshPermissions();

        // Refresh permissions when app returns to foreground from Settings
        const subscription = AppState.addEventListener(
            "change",
            (nextState: AppStateStatus) => {
                if (nextState === "active") {
                    refreshPermissions();
                }
            }
        );

        return () => {
            subscription.remove();
            if (blockedHandlerRef.current) {
                getBlockedUsers(blockedHandlerRef.current, true);
                blockedHandlerRef.current = null;
            }
        };
    }, [refreshPermissions]);

    const blockedHandlerRef = useRef<((res: any) => void) | null>(null);

    const handleRequestPermission = useCallback(
        async (key: PermissionKey) => {
            const current = permissions[key];
            if (!current.canAskAgain && !current.granted) {
                // Permanently denied - direct user to device Settings
                BubblyAlert.alert(
                    `${PERMISSION_METADATA[key].title} Permission`,
                    `Permission was previously denied. Please enable ${PERMISSION_METADATA[key].title} access in your device Settings to use this feature.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Open Settings",
                            onPress: () => openDeviceSettings(),
                        },
                    ]
                );
                return;
            }

            const updated = await requestPermissionByKey(key);
            setPermissions((prev) => ({ ...prev, [key]: updated }));

            if (!updated.granted && !updated.canAskAgain) {
                BubblyAlert.alert(
                    "Permission Denied",
                    `To enable ${PERMISSION_METADATA[key].title} later, visit your device Settings.`,
                    [
                        { text: "OK", style: "default" },
                        { text: "Open Settings", onPress: () => openDeviceSettings() },
                    ]
                );
            }
        },
        [permissions]
    );

    const toggleNotifications = useCallback(async (value: boolean) => {
        setNotificationsEnabled(value);
        try {
            await AsyncStorage.setItem(NOTIF_KEY, String(value));
            syncNotificationPreference(value).catch(() => {});
        } catch (_) { }
    }, []);

    const toggleSound = useCallback(async (value: boolean) => {
        setSoundEnabled(value);
        try {
            await AsyncStorage.setItem(SOUND_KEY, String(value));
        } catch (_) { }
    }, []);

    const toggleAppLock = useCallback(async (value: boolean) => {
        setAppLockEnabled(value);
        try {
            await AsyncStorage.setItem(APP_LOCK_KEY, String(value));
            notifyFeatureListeners();
            const pinKey = user?.id ? `@bubbly_vault_pin_${user.id}` : "@bubbly_vault_pin";
            const existingPin = value ? await AsyncStorage.getItem(pinKey) : null;
            BubblyAlert.alert(
                value ? "App Lock Enabled" : "App Lock Disabled",
                value
                    ? (existingPin
                        ? "Bubbly will require your 4-digit Vault PIN after your configured grace period."
                        : "App Lock is active! On your next launch or resume you will set your 4-digit App PIN.")
                    : "App lock protection has been turned off."
            );
        } catch (_) { }
    }, [user?.id]);

    const handleLogout = useCallback(() => {
        BubblyAlert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        await signOut();
                    } catch (_) {
                        BubblyAlert.alert("Error", "Something went wrong. Please try again.");
                    }
                },
            },
        ]);
    }, [signOut]);

    const handleDeleteAccount = useCallback(() => {
        BubblyAlert.alert(
            "Delete Account",
            "This will permanently delete your account and all your data. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        BubblyAlert.alert(
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
        <ScreenWrapper backgroundColor={colors.neutral100} style={{ backgroundColor: colors.neutral100 }}>
            <View style={styles.header}>
                <BackButton color={colors.neutral900} />
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
                {/* ── Profile Summary ── */}
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
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Typo size={16} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                            {user?.name ?? "Your Profile"}
                        </Typo>
                        <Typo
                            size={12.5}
                            color={colors.neutral500}
                            style={{ marginTop: verticalScale(2) }}
                            textProps={{ numberOfLines: 1, ellipsizeMode: "tail" }}
                        >
                            {user?.phoneNumber ? `${user.phoneNumber} · ` : ""}{user?.email ?? "Tap to edit your profile"}
                        </Typo>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={22}
                        color={colors.neutral350}
                    />
                </TouchableOpacity>

                {/* ── App Permissions (Live OS Status) ── */}
                <SectionLabel label="App Permissions" />
                <SectionCard>
                    <PermissionRow
                        permKey="camera"
                        icon="camera-alt"
                        title={PERMISSION_METADATA.camera.title}
                        subtitle={PERMISSION_METADATA.camera.subtitle}
                        granted={permissions.camera.granted}
                        canAskAgain={permissions.camera.canAskAgain}
                        onRequest={handleRequestPermission}
                    />
                    <PermissionRow
                        permKey="microphone"
                        icon="mic"
                        title={PERMISSION_METADATA.microphone.title}
                        subtitle={PERMISSION_METADATA.microphone.subtitle}
                        granted={permissions.microphone.granted}
                        canAskAgain={permissions.microphone.canAskAgain}
                        onRequest={handleRequestPermission}
                    />
                    <PermissionRow
                        permKey="mediaLibrary"
                        icon="photo-library"
                        title={PERMISSION_METADATA.mediaLibrary.title}
                        subtitle={PERMISSION_METADATA.mediaLibrary.subtitle}
                        granted={permissions.mediaLibrary.granted}
                        canAskAgain={permissions.mediaLibrary.canAskAgain}
                        onRequest={handleRequestPermission}
                    />
                    <PermissionRow
                        permKey="notifications"
                        icon="notifications"
                        title={PERMISSION_METADATA.notifications.title}
                        subtitle={PERMISSION_METADATA.notifications.subtitle}
                        granted={permissions.notifications.granted}
                        canAskAgain={permissions.notifications.canAskAgain}
                        onRequest={handleRequestPermission}
                    />
                    <PermissionRow
                        permKey="contacts"
                        icon="contacts"
                        title={PERMISSION_METADATA.contacts.title}
                        subtitle={PERMISSION_METADATA.contacts.subtitle}
                        granted={permissions.contacts.granted}
                        canAskAgain={permissions.contacts.canAskAgain}
                        isLast
                        onRequest={handleRequestPermission}
                    />
                </SectionCard>

                {/* ── Open Device Settings Shortcut ── */}
                <TouchableOpacity
                    style={styles.deviceSettingsBtn}
                    onPress={() => openDeviceSettings()}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="settings" size={16} color={colors.neutral600} />
                    <Typo size={12.5} fontWeight="600" color={colors.neutral700}>
                        Manage all permissions in Device Settings
                    </Typo>
                    <MaterialIcons name="open-in-new" size={14} color={colors.neutral400} />
                </TouchableOpacity>

                {/* ── Preferences ── */}
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
                    <Row
                        icon="phone"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Call History & Logs"
                        subtitle="View incoming, outgoing, and missed calls"
                        onPress={() => router.push("/(main)/callLogs")}
                    />
                    <Row
                        icon="qr-code"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="My QR Code & Scanner"
                        subtitle="Share profile and connect instantly"
                        onPress={() => router.push("/(main)/qrCode")}
                    />
                    <Row
                        icon="storage"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Data & Storage Usage"
                        subtitle="Manage media downloads and cache"
                        onPress={() => router.push("/(main)/storageManager")}
                    />
                    <Row
                        icon="bedtime"
                        iconColor="#7c3aed"
                        iconBg="#ede9fe"
                        label="Focus / Quiet Mode"
                        subtitle={focusEnabled ? "Active · Sounds & toasts suppressed" : "Silence alerts temporarily while focusing"}
                        right={
                            <Switch
                                value={focusEnabled}
                                onValueChange={async (val) => {
                                    const next = await setFocusMode(val ? 60 : null, val ? "1h Focus" : "");
                                    setFocusEnabled(next.enabled);
                                }}
                                trackColor={{ false: colors.neutral300, true: "#7c3aed" }}
                                thumbColor={colors.white}
                            />
                        }
                    />
                    <Row
                        icon="alarm"
                        iconColor="#0284c7"
                        iconBg="#e0f2fe"
                        label="Message Reminders"
                        subtitle={`${reminders.length} active reminder alarm${reminders.length === 1 ? "" : "s"}`}
                        onPress={() => setShowReminders(true)}
                        isLast
                    />
                </SectionCard>

                {/* ── Appearance & Bubble Studio ── */}
                <SectionLabel label="Appearance & Bubble Studio" />
                <SectionCard>
                    <Row
                        icon="chat-bubble-outline"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Bubble Corner Style"
                        subtitle={`Current: ${appearance.bubbleStyle.charAt(0).toUpperCase() + appearance.bubbleStyle.slice(1)}`}
                        onPress={() => {
                            BubblyAlert.alert(
                                "Bubble Corner Style",
                                "Choose how message bubbles are shaped:",
                                [
                                    ...(["rounded", "sharp", "minimal"] as BubbleCornerStyle[]).map((styleKey) => ({
                                        text: styleKey === "rounded" ? "Rounded Pill" : styleKey === "sharp" ? "Crisp Modern" : "Minimal Flat",
                                        onPress: async () => {
                                            const next = { ...appearance, bubbleStyle: styleKey };
                                            setAppearance(next);
                                            await saveChatAppearance(next);
                                            if (isSocketConnected()) updateProfile({ theme: { bubbleStyle: styleKey } });
                                        },
                                    })),
                                    { text: "Cancel", style: "cancel" },
                                ]
                            );
                        }}
                    />
                    <Row
                        icon="format-size"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Chat Text Size"
                        subtitle={`Current: ${appearance.fontScale.charAt(0).toUpperCase() + appearance.fontScale.slice(1)}`}
                        onPress={() => {
                            BubblyAlert.alert(
                                "Chat Text Size",
                                "Pick message text scale:",
                                [
                                    ...(["compact", "standard", "large"] as ChatFontScale[]).map((sz) => ({
                                        text: sz.charAt(0).toUpperCase() + sz.slice(1),
                                        onPress: async () => {
                                            const next = { ...appearance, fontScale: sz };
                                            setAppearance(next);
                                            await saveChatAppearance(next);
                                        },
                                    })),
                                    { text: "Cancel", style: "cancel" },
                                ]
                            );
                        }}
                    />
                    <Row
                        icon="palette"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Accent Highlight Color"
                        subtitle={ACCENT_SWATCHES.find((s) => s.color === appearance.accentColor)?.name || "Honey Amber"}
                        onPress={() => {
                            BubblyAlert.alert(
                                "Accent Color",
                                "Choose your preferred highlight swatch:",
                                [
                                    ...ACCENT_SWATCHES.map((sw) => ({
                                        text: sw.name,
                                        onPress: async () => {
                                            const next = { ...appearance, accentColor: sw.color };
                                            setAppearance(next);
                                            await saveChatAppearance(next);
                                            if (isSocketConnected()) updateProfile({ theme: { accent: sw.color } });
                                        },
                                    })),
                                    { text: "Cancel", style: "cancel" },
                                ]
                            );
                        }}
                        isLast
                    />
                </SectionCard>

                {/* ── Privacy & Security ── */}
                <SectionLabel label="Privacy & Security" />
                <SectionCard>
                    <Row
                        icon="lock"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Secret Chat Vault"
                        subtitle="Protect locked chats with a secret PIN"
                        onPress={() => router.push("/(main)/vault")}
                    />
                    <Row
                        icon="fingerprint"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="App Lock & Biometrics"
                        subtitle="Require biometric / passcode to open"
                        right={
                            <Switch
                                value={appLockEnabled}
                                onValueChange={toggleAppLock}
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
                        icon="visibility-off"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Hide Notification Preview"
                        subtitle="Hide sender text in in-app alerts & reminders"
                        right={
                            <Switch
                                value={privacyShield.hideNotificationPreview}
                                onValueChange={async (val) => {
                                    const next = { ...privacyShield, hideNotificationPreview: val };
                                    setPrivacyShield(next);
                                    await savePrivacyShield(next);
                                }}
                                trackColor={{ false: colors.neutral300, true: "#16a34a" }}
                                thumbColor={colors.white}
                            />
                        }
                    />
                    <Row
                        icon="timer"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Auto-Lock Grace Period"
                        subtitle={
                            privacyShield.autoLockDelayMs === 0
                                ? "Immediate on background"
                                : privacyShield.autoLockDelayMs === 60000
                                ? "After 1 minute"
                                : "After 5 minutes"
                        }
                        onPress={() => {
                            BubblyAlert.alert(
                                "Auto-Lock Grace Period",
                                "Choose how quickly App Lock engages in background:",
                                [
                                    { text: "Immediately (0s)", onPress: async () => { const n = { ...privacyShield, autoLockDelayMs: 0 as const }; setPrivacyShield(n); await savePrivacyShield(n); } },
                                    { text: "1 Minute", onPress: async () => { const n = { ...privacyShield, autoLockDelayMs: 60000 as const }; setPrivacyShield(n); await savePrivacyShield(n); } },
                                    { text: "5 Minutes", onPress: async () => { const n = { ...privacyShield, autoLockDelayMs: 300000 as const }; setPrivacyShield(n); await savePrivacyShield(n); } },
                                    { text: "Cancel", style: "cancel" },
                                ]
                            );
                        }}
                    />
                    <Row
                        icon="star"
                        iconColor="#eab308"
                        iconBg="#fef08a55"
                        label="Starred Messages"
                        subtitle="View all bookmarked & saved messages"
                        onPress={() => router.push("/(main)/starredMessages")}
                    />
                    <Row
                        icon="shield"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Blocked Contacts"
                        subtitle="Manage people you've blocked"
                        onPress={() => {
                            if (!isSocketConnected()) {
                                BubblyAlert.alert("Offline", "Connect to the internet to check blocked contacts.");
                                return;
                            }
                            if (blockedHandlerRef.current) {
                                getBlockedUsers(blockedHandlerRef.current, true);
                            }
                            const handler = (res: any) => {
                                getBlockedUsers(handler, true);
                                blockedHandlerRef.current = null;
                                if (res?.success && Array.isArray(res.data)) {
                                    if (res.data.length === 0) {
                                        BubblyAlert.alert("Blocked Contacts", "You have not blocked any contacts yet.");
                                    } else {
                                        const names = res.data.map((u: any) => u.name || u.email).join("\n• ");
                                        BubblyAlert.alert(
                                            `Blocked Contacts (${res.data.length})`,
                                            `• ${names}`,
                                            [
                                                {
                                                    text: "Unblock All",
                                                    style: "destructive",
                                                    onPress: () => {
                                                        res.data.forEach((u: any) => blockUser({ targetUserId: u._id, block: false }));
                                                        BubblyAlert.alert("Done", "All contacts unblocked.");
                                                    },
                                                },
                                                { text: "Close", style: "cancel" },
                                            ]
                                        );
                                    }
                                }
                            };
                            blockedHandlerRef.current = handler;
                            getBlockedUsers(handler);
                            getBlockedUsers(null);
                        }}
                    />
                    <Row
                        icon="lock"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Change Password"
                        onPress={() =>
                            BubblyAlert.alert("Change Password", "Password updates can be requested through account settings.")
                        }
                    />
                    <Row
                        icon="policy"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "66"}
                        label="Privacy Policy"
                        subtitle="Data collection, permissions, and your rights"
                        onPress={() => router.push("/(legal)/privacyPolicy" as any)}
                    />
                    <Row
                        icon="verified-user"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Security & Data Safety"
                        subtitle="Encryption, Vault PIN, and Play Store safety"
                        onPress={() => router.push("/(legal)/security" as any)}
                        isLast
                    />
                </SectionCard>

                {/* ── Support ── */}
                <SectionLabel label="Support" />
                <SectionCard>
                    <Row
                        icon="refresh"
                        iconColor={colors.neutral700}
                        label="Replay Onboarding"
                        subtitle="Revisit app walkthrough and permissions"
                        onPress={() => router.push("/onboarding?replay=true")}
                    />
                    <Row
                        icon="bug-report"
                        iconColor={colors.neutral700}
                        label="Report an Issue / Bug"
                        subtitle="Send diagnostic report & screenshot"
                        onPress={() => router.push("/(main)/reportBugModal")}
                    />
                    <Row
                        icon="mail"
                        iconColor={colors.neutral700}
                        label="Send Feedback"
                        onPress={() => router.push("/(main)/reportBugModal")}
                    />
                    <Row
                        icon="info"
                        iconColor={colors.neutral700}
                        label="About Bubbly"
                        onPress={() => router.push("/(main)/about")}
                        isLast
                    />
                </SectionCard>

                {/* ── Account ── */}
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
                    <Typo size={12} color={colors.neutral400} fontWeight="600">
                        Bubbly v4.0.1 · Flagship Edition
                    </Typo>
                    <Typo size={11} color={colors.neutral400} style={{ marginTop: 2 }}>
                        Made with care for seamless connection
                    </Typo>
                </View>
            </ScrollView>

            <RemindersListModal
                visible={showReminders}
                reminders={reminders}
                onCancelReminder={async (id) => {
                    await cancelMessageReminder(id);
                    setReminders(await getActiveReminders());
                }}
                onClose={() => setShowReminders(false)}
            />
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
        borderRadius: radius._20,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        padding: spacingX._15,
        marginBottom: spacingY._10,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: { elevation: 2 },
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
        borderRadius: radius._20,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
            },
            android: { elevation: 1.5 },
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
        minWidth: 0,
        paddingRight: spacingX._10,
    },
    iconBadge: {
        width: scale(34),
        height: scale(34),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
    },

    grantedPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: verticalScale(4),
        paddingHorizontal: scale(8),
        borderRadius: radius.full,
        backgroundColor: "#dcfce7",
    },
    enableBtn: {
        paddingVertical: verticalScale(5),
        paddingHorizontal: scale(12),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    deviceSettingsBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        marginTop: verticalScale(8),
        paddingVertical: verticalScale(8),
    },

    footer: {
        alignItems: "center",
        marginTop: spacingY._30,
        paddingBottom: spacingY._10,
    },
});
