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
    Share,
    AppState,
    AppStateStatus,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import { scale, verticalScale } from "../../utils/styling";
import {
    getHapticStrength,
    hapticTap,
    HapticStrength,
    initHapticStrength,
    setHapticStrength,
} from "../../utils/haptics";
import { useAuth } from "../../contexts/authContext";
import {
    getPushRegistrationStatus,
    PushRegistrationSnapshot,
    registerForPushNotificationsAsync,
    subscribePushStatus,
    syncNotificationPreference,
} from "../../services/notificationService";
import {
    DEFAULT_RINGTONE_ID,
    INCOMING_RINGTONES,
    IncomingRingtoneId,
    initIncomingRingtone,
    previewIncomingRingtone,
    setIncomingRingtoneId,
    stopPreviewRingtone,
} from "../../services/soundService";
import { getBlockedUsers, blockUser, isSocketConnected, updatePrivacy } from "../../socket/socketEvents";
import {
    ACCENT_SWATCHES,
    BubbleCornerStyle,
    ChatAppearanceConfig,
    ChatFontScale,
    DEFAULT_APPEARANCE,
    DEFAULT_FAVORITE_REACTIONS,
    DEFAULT_PRIVACY_SHIELD,
    DEFAULT_QUIET_HOURS,
    exportLocalPreferencesSnapshot,
    formatHour12,
    getChatAppearance,
    getFavoriteReactions,
    getFocusMode,
    getPrivacyShield,
    getQuietHours,
    isWithinQuietHours,
    notifyFeatureListeners,
    PrivacyShieldConfig,
    QuietHoursConfig,
    REACTION_PALETTE,
    resetLocalCustomizations,
    saveChatAppearance,
    saveFavoriteReactions,
    savePrivacyShield,
    saveQuietHours,
    setFocusMode,
    subscribeFeatureUpdates,
} from "../../utils/featureStorage";
import {
    DEFAULT_PRIVACY_PREFS,
    loadEffectivePreferences,
    persistPreferencesPatch,
    PrivacyPrefsConfig,
} from "../../services/preferencesService";
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

const APP_VERSION: string = Constants.expoConfig?.version ?? "4.2.1";

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
        onPress={
            onPress
                ? () => {
                      hapticTap(danger ? "warning" : "medium");
                      onPress();
                  }
                : undefined
        }
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
                onPress={() => {
                    hapticTap("medium");
                    onRequest(permKey);
                }}
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
    const [callRingtone, setCallRingtone] = useState<IncomingRingtoneId>(DEFAULT_RINGTONE_ID);
    const [previewingToneId, setPreviewingToneId] = useState<IncomingRingtoneId | null>(null);
    const previewStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [hapticStrength, setHapticStrengthState] = useState<HapticStrength>(() => getHapticStrength());
    const [appLockEnabled, setAppLockEnabled] = useState(false);
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [appearance, setAppearance] = useState<ChatAppearanceConfig>(DEFAULT_APPEARANCE);
    const [privacyShield, setPrivacyShield] = useState<PrivacyShieldConfig>(DEFAULT_PRIVACY_SHIELD);
    const [quietHours, setQuietHours] = useState<QuietHoursConfig>(DEFAULT_QUIET_HOURS);
    const [favoriteReactions, setFavoriteReactions] = useState<string[]>(DEFAULT_FAVORITE_REACTIONS);
    const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefsConfig>(DEFAULT_PRIVACY_PREFS);
    const [focusEnabled, setFocusEnabled] = useState(false);
    const [reminders, setReminders] = useState<SavedMessageReminder[]>([]);
    const [showReminders, setShowReminders] = useState(false);
    const [pushStatus, setPushStatus] = useState<PushRegistrationSnapshot>(() => getPushRegistrationStatus());
    const [refreshingPush, setRefreshingPush] = useState(false);

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

    const hydrateSettings = useCallback(async () => {
        try {
            const [bundle, focusCfg, remList] = await Promise.all([
                loadEffectivePreferences(user?.id),
                getFocusMode(),
                getActiveReminders(),
            ]);
            setNotificationsEnabled(bundle.notificationsEnabled);
            setSoundEnabled(bundle.soundEnabled);
            setAppLockEnabled(bundle.appLockEnabled);
            setHapticStrengthState(bundle.hapticStrength);
            setCallRingtone(bundle.callRingtone);
            setAppearance(bundle.appearance);
            setPrivacyShield(bundle.privacyShield);
            setQuietHours(bundle.quietHours);
            setFavoriteReactions(bundle.favoriteReactions);
            setPrivacyPrefs(bundle.privacy);
            setFocusEnabled(focusCfg.enabled);
            setReminders(remList);
        } catch (_) {
        } finally {
            setLoadingPrefs(false);
        }
    }, [user?.id]);

    useEffect(() => {
        hydrateSettings();
        refreshPermissions();
        const unsubPush = subscribePushStatus(setPushStatus);
        const unsubFeature = subscribeFeatureUpdates(() => {
            loadEffectivePreferences(user?.id)
                .then((bundle) => {
                    setNotificationsEnabled(bundle.notificationsEnabled);
                    setSoundEnabled(bundle.soundEnabled);
                    setAppLockEnabled(bundle.appLockEnabled);
                    setHapticStrengthState(bundle.hapticStrength);
                    setCallRingtone(bundle.callRingtone);
                    setAppearance(bundle.appearance);
                    setPrivacyShield(bundle.privacyShield);
                    setQuietHours(bundle.quietHours);
                    setFavoriteReactions(bundle.favoriteReactions);
                    setPrivacyPrefs(bundle.privacy);
                })
                .catch(() => {});
        });

        // Refresh permissions when app returns to foreground from Settings
        const subscription = AppState.addEventListener(
            "change",
            (nextState: AppStateStatus) => {
                if (nextState === "active") {
                    refreshPermissions();
                    hydrateSettings();
                }
            }
        );

        return () => {
            unsubPush();
            unsubFeature();
            subscription.remove();
            if (previewStateTimerRef.current) clearTimeout(previewStateTimerRef.current);
            stopPreviewRingtone();
            if (blockedHandlerRef.current) {
                getBlockedUsers(blockedHandlerRef.current, true);
                blockedHandlerRef.current = null;
            }
        };
    }, [hydrateSettings, refreshPermissions, user?.id]);

    useFocusEffect(
        useCallback(() => {
            hydrateSettings();
            refreshPermissions();
        }, [hydrateSettings, refreshPermissions])
    );

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
            hapticTap(updated.granted ? "success" : "warning");

            if (key === "notifications" && updated.granted) {
                registerForPushNotificationsAsync().catch(() => {});
            }

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
        hapticTap("medium");
        setNotificationsEnabled(value);
        try {
            await persistPreferencesPatch({ notificationsEnabled: value }, { userId: user?.id });
            syncNotificationPreference(value).catch(() => {});
            if (value) {
                registerForPushNotificationsAsync().catch(() => {});
            }
        } catch (_) { }
    }, [user?.id]);

    const toggleSound = useCallback(async (value: boolean) => {
        hapticTap("medium");
        setSoundEnabled(value);
        try {
            await persistPreferencesPatch({ soundEnabled: value }, { userId: user?.id });
        } catch (_) { }
    }, [user?.id]);

    const toggleAppLock = useCallback(async (value: boolean) => {
        hapticTap("heavy");
        setAppLockEnabled(value);
        try {
            await persistPreferencesPatch({ appLockEnabled: value }, { userId: user?.id });
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
                    onPress={() => {
                        hapticTap("medium");
                        router.push("/(main)/profileModel");
                    }}
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
                    onPress={() => {
                        hapticTap("medium");
                        openDeviceSettings();
                    }}
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
                        icon={pushStatus.status === "registered" ? "cloud-done" : "cloud-off"}
                        iconColor={pushStatus.status === "registered" ? "#16a34a" : "#d97706"}
                        iconBg={pushStatus.status === "registered" ? "#dcfce7" : "#fef3c7"}
                        label="Closed-App Push Delivery"
                        subtitle={pushStatus.detail}
                        onPress={async () => {
                            if (refreshingPush) return;
                            setRefreshingPush(true);
                            try {
                                await registerForPushNotificationsAsync();
                            } finally {
                                setRefreshingPush(false);
                            }
                        }}
                        right={
                            <View
                                style={{
                                    paddingHorizontal: scale(10),
                                    paddingVertical: verticalScale(4),
                                    borderRadius: radius.full,
                                    backgroundColor:
                                        pushStatus.status === "registered" ? "#dcfce7" : "#fef3c7",
                                }}
                            >
                                <Typo
                                    size={11}
                                    fontWeight="700"
                                    color={pushStatus.status === "registered" ? "#16a34a" : "#b45309"}
                                >
                                    {refreshingPush
                                        ? "Syncing..."
                                        : pushStatus.status === "registered"
                                        ? "Active"
                                        : "Retry Sync"}
                                </Typo>
                            </View>
                        }
                    />
                    <Row
                        icon="volume-up"
                        iconColor={colors.primaryDark}
                        iconBg={colors.primaryLight + "55"}
                        label="Sound & Vibration"
                        subtitle="Notification chimes, dial tones & call alerts"
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
                    <View style={[styles.row, styles.rowBorder, { flexDirection: "column", alignItems: "stretch", gap: verticalScale(10) }]}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBadge, { backgroundColor: "#dcfce7" }]}>
                                <MaterialIcons name="ring-volume" size={19} color="#16a34a" />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Typo size={14.5} fontWeight="600" color={colors.neutral800}>
                                    Incoming Call Ringtone
                                </Typo>
                                <Typo size={11.5} color={colors.neutral400} style={{ marginTop: verticalScale(2) }}>
                                    Choose 1 of 4 custom ringtones for incoming & closed-app calls
                                </Typo>
                            </View>
                        </View>
                        <View style={{ gap: verticalScale(7) }}>
                            {INCOMING_RINGTONES.map((tone) => {
                                const selected = callRingtone === tone.id;
                                const isPlaying = previewingToneId === tone.id;
                                return (
                                    <View
                                        key={tone.id}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingHorizontal: spacingX._12,
                                            paddingVertical: verticalScale(9),
                                            borderRadius: radius._12,
                                            backgroundColor: selected ? "#fef9c3" : colors.neutral50,
                                            borderWidth: 1.5,
                                            borderColor: selected ? colors.primary : colors.neutral200,
                                            gap: scale(10),
                                        }}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={0.78}
                                            onPress={async () => {
                                                hapticTap("heavy");
                                                setCallRingtone(tone.id);
                                                await persistPreferencesPatch({ callRingtone: tone.id }, { userId: user?.id });
                                                if (previewStateTimerRef.current) clearTimeout(previewStateTimerRef.current);
                                                setPreviewingToneId(tone.id);
                                                await previewIncomingRingtone(tone.id);
                                                previewStateTimerRef.current = setTimeout(() => {
                                                    setPreviewingToneId(null);
                                                }, 5500);
                                            }}
                                            style={{ flexDirection: "row", alignItems: "center", gap: scale(10), flex: 1, minWidth: 0 }}
                                        >
                                            <MaterialIcons
                                                name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                                                size={18}
                                                color={selected ? colors.primaryDark : colors.neutral400}
                                            />
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <Typo size={13.5} fontWeight={selected ? "700" : "600"} color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                                    {tone.label}
                                                </Typo>
                                                <Typo size={11} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                                                    {tone.subtitle}
                                                </Typo>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            activeOpacity={0.75}
                                            onPress={async () => {
                                                hapticTap("medium");
                                                if (isPlaying) {
                                                    if (previewStateTimerRef.current) clearTimeout(previewStateTimerRef.current);
                                                    stopPreviewRingtone();
                                                    setPreviewingToneId(null);
                                                } else {
                                                    if (previewStateTimerRef.current) clearTimeout(previewStateTimerRef.current);
                                                    setPreviewingToneId(tone.id);
                                                    await previewIncomingRingtone(tone.id);
                                                    previewStateTimerRef.current = setTimeout(() => {
                                                        setPreviewingToneId(null);
                                                    }, 5500);
                                                }
                                            }}
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 4,
                                                paddingHorizontal: scale(10),
                                                paddingVertical: verticalScale(5),
                                                borderRadius: radius.full,
                                                backgroundColor: isPlaying ? "#fee2e2" : colors.white,
                                                borderWidth: 1,
                                                borderColor: isPlaying ? "#fca5a5" : colors.neutral200,
                                            }}
                                        >
                                            <MaterialIcons
                                                name={isPlaying ? "stop" : "play-arrow"}
                                                size={14}
                                                color={isPlaying ? "#dc2626" : colors.neutral700}
                                            />
                                            <Typo size={11} fontWeight="700" color={isPlaying ? "#dc2626" : colors.neutral700}>
                                                {isPlaying ? "Stop" : "Preview"}
                                            </Typo>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                    <View style={[styles.row, styles.rowBorder, { flexDirection: "column", alignItems: "stretch", gap: verticalScale(10) }]}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBadge, { backgroundColor: colors.primaryLight + "55" }]}>
                                <MaterialIcons name="vibration" size={19} color={colors.primaryDark} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Typo size={14.5} fontWeight="500" color={colors.neutral800}>
                                    Haptic Feedback Intensity
                                </Typo>
                                <Typo size={11.5} color={colors.neutral400} style={{ marginTop: verticalScale(2) }}>
                                    Tap strength for buttons, swipes, reactions & alerts
                                </Typo>
                            </View>
                        </View>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                            {([
                                { key: "off" as HapticStrength, label: "Off" },
                                { key: "standard" as HapticStrength, label: "Normal" },
                                { key: "strong" as HapticStrength, label: "Strong" },
                                { key: "ultra" as HapticStrength, label: "Ultra" },
                            ]).map((opt) => {
                                const active = hapticStrength === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        activeOpacity={0.75}
                                        onPress={async () => {
                                            setHapticStrengthState(opt.key);
                                            await persistPreferencesPatch({ hapticStrength: opt.key }, { userId: user?.id });
                                            if (opt.key !== "off") {
                                                hapticTap(opt.key === "ultra" ? "rigid" : "heavy");
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            paddingVertical: verticalScale(7),
                                            borderRadius: radius.full,
                                            backgroundColor: active ? colors.primaryLight : colors.neutral100,
                                            borderWidth: 1,
                                            borderColor: active ? colors.primary : colors.neutral200,
                                            alignItems: "center",
                                        }}
                                    >
                                        <Typo size={11.5} fontWeight={active ? "800" : "600"} color={active ? colors.primaryDark : colors.neutral700}>
                                            {opt.label}
                                        </Typo>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
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
                                    hapticTap(val ? "heavy" : "medium");
                                    const next = await setFocusMode(val ? 60 : null, val ? "1h Focus" : "");
                                    setFocusEnabled(next.enabled);
                                }}
                                trackColor={{ false: colors.neutral300, true: "#7c3aed" }}
                                thumbColor={colors.white}
                            />
                        }
                    />
                    <View style={[styles.row, styles.rowBorder, { flexDirection: "column", alignItems: "stretch", gap: verticalScale(10) }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBadge, { backgroundColor: "#e0e7ff" }]}>
                                    <MaterialIcons name="nights-stay" size={19} color="#4f46e5" />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Typo size={14.5} fontWeight="500" color={colors.neutral800}>
                                        Scheduled Quiet Hours
                                    </Typo>
                                    <Typo size={11.5} color={colors.neutral400} style={{ marginTop: verticalScale(2) }}>
                                        {quietHours.enabled
                                            ? `${formatHour12(quietHours.startHour)} – ${formatHour12(quietHours.endHour)}${isWithinQuietHours(quietHours) ? " · Active now" : ""}`
                                            : "Auto-silence in-app alerts overnight"}
                                    </Typo>
                                </View>
                            </View>
                            <Switch
                                value={quietHours.enabled}
                                onValueChange={async (val) => {
                                    hapticTap("medium");
                                    const next = { ...quietHours, enabled: val };
                                    setQuietHours(next);
                                    await persistPreferencesPatch({ quietHours: next }, { userId: user?.id });
                                }}
                                trackColor={{ false: colors.neutral300, true: "#4f46e5" }}
                                thumbColor={colors.white}
                            />
                        </View>
                        {quietHours.enabled && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                {[
                                    { label: "9 PM – 6 AM", start: 21, end: 6 },
                                    { label: "10 PM – 7 AM", start: 22, end: 7 },
                                    { label: "11 PM – 8 AM", start: 23, end: 8 },
                                    { label: "12 AM – 8 AM", start: 0, end: 8 },
                                ].map((win) => {
                                    const active = quietHours.startHour === win.start && quietHours.endHour === win.end;
                                    return (
                                        <TouchableOpacity
                                            key={win.label}
                                            onPress={async () => {
                                                hapticTap("light");
                                                const next = { ...quietHours, startHour: win.start, endHour: win.end };
                                                setQuietHours(next);
                                                await persistPreferencesPatch({ quietHours: next }, { userId: user?.id });
                                            }}
                                            style={{
                                                paddingHorizontal: scale(10),
                                                paddingVertical: verticalScale(6),
                                                borderRadius: radius.full,
                                                backgroundColor: active ? "#e0e7ff" : colors.neutral100,
                                                borderWidth: 1,
                                                borderColor: active ? "#4f46e5" : colors.neutral200,
                                            }}
                                        >
                                            <Typo size={11.5} fontWeight={active ? "800" : "600"} color={active ? "#4338ca" : colors.neutral700}>
                                                {win.label}
                                            </Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
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
                    <View style={{ padding: spacingX._15, gap: verticalScale(12) }}>
                        {/* Live Bubble Preview Stage */}
                        {(() => {
                            const activeSwatch = ACCENT_SWATCHES.find((s) => s.color === appearance.accentColor) || ACCENT_SWATCHES[0];
                            const bubbleRadius =
                                appearance.bubbleStyle === "sharp"
                                    ? radius._8
                                    : appearance.bubbleStyle === "minimal"
                                    ? radius._12
                                    : radius._18;
                            const previewFontSize =
                                appearance.fontScale === "compact" ? 12.5 : appearance.fontScale === "large" ? 15.5 : 14;
                            const borderStyle =
                                appearance.bubbleStyle === "minimal"
                                    ? { borderWidth: 0 }
                                    : { borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" };
                            return (
                                <View style={{
                                    backgroundColor: colors.neutral50,
                                    borderRadius: radius._15,
                                    padding: spacingX._12,
                                    borderWidth: 1,
                                    borderColor: colors.neutral200,
                                    gap: verticalScale(8),
                                }}>
                                    <Typo size={10.5} fontWeight="800" color={colors.neutral400}>LIVE CHAT PREVIEW</Typo>
                                    <View style={[{
                                        alignSelf: "flex-start",
                                        backgroundColor: colors.white,
                                        borderRadius: bubbleRadius,
                                        paddingHorizontal: spacingX._12,
                                        paddingVertical: verticalScale(8),
                                        maxWidth: "82%",
                                    }, borderStyle]}>
                                        <Typo size={previewFontSize} color={colors.neutral800}>
                                            Bubbly v{APP_VERSION} looks super crisp! ✨
                                        </Typo>
                                    </View>
                                    <View style={[{
                                        alignSelf: "flex-end",
                                        backgroundColor: activeSwatch.myBubble,
                                        borderRadius: bubbleRadius,
                                        paddingHorizontal: spacingX._12,
                                        paddingVertical: verticalScale(8),
                                        maxWidth: "82%",
                                    }, borderStyle]}>
                                        <Typo size={previewFontSize} fontWeight="500" color={colors.neutral900}>
                                            Custom corners, typography & color 🎨
                                        </Typo>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Inline Corner Style Pills */}
                        <View style={{ gap: 6 }}>
                            <Typo size={12} fontWeight="700" color={colors.neutral600}>Bubble Corner Style</Typo>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {([
                                    { key: "rounded" as BubbleCornerStyle, label: "Rounded" },
                                    { key: "sharp" as BubbleCornerStyle, label: "Sharp" },
                                    { key: "minimal" as BubbleCornerStyle, label: "Minimal" },
                                ]).map((opt) => {
                                    const active = appearance.bubbleStyle === opt.key;
                                    return (
                                        <TouchableOpacity
                                            key={opt.key}
                                            activeOpacity={0.75}
                                            onPress={async () => {
                                                hapticTap("medium");
                                                const next = { ...appearance, bubbleStyle: opt.key };
                                                setAppearance(next);
                                                await persistPreferencesPatch({ appearance: next }, { userId: user?.id });
                                                if (isSocketConnected()) updatePrivacy({ theme: { bubbleStyle: opt.key } });
                                            }}
                                            style={{
                                                flex: 1,
                                                paddingVertical: verticalScale(8),
                                                borderRadius: radius.full,
                                                backgroundColor: active ? colors.primaryLight : colors.neutral100,
                                                borderWidth: 1,
                                                borderColor: active ? colors.primary : colors.neutral200,
                                                alignItems: "center",
                                            }}
                                        >
                                            <Typo size={12} fontWeight={active ? "800" : "600"} color={active ? colors.primaryDark : colors.neutral700}>
                                                {opt.label}
                                            </Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Inline Font Scale Pills */}
                        <View style={{ gap: 6 }}>
                            <Typo size={12} fontWeight="700" color={colors.neutral600}>Chat Text Size</Typo>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {(["compact", "standard", "large"] as ChatFontScale[]).map((sz) => {
                                    const active = appearance.fontScale === sz;
                                    return (
                                        <TouchableOpacity
                                            key={sz}
                                            activeOpacity={0.75}
                                            onPress={async () => {
                                                hapticTap("medium");
                                                const next = { ...appearance, fontScale: sz };
                                                setAppearance(next);
                                                await persistPreferencesPatch({ appearance: next }, { userId: user?.id });
                                            }}
                                            style={{
                                                flex: 1,
                                                paddingVertical: verticalScale(8),
                                                borderRadius: radius.full,
                                                backgroundColor: active ? colors.primaryLight : colors.neutral100,
                                                borderWidth: 1,
                                                borderColor: active ? colors.primary : colors.neutral200,
                                                alignItems: "center",
                                            }}
                                        >
                                            <Typo size={12} fontWeight={active ? "800" : "600"} color={active ? colors.primaryDark : colors.neutral700}>
                                                {sz.charAt(0).toUpperCase() + sz.slice(1)}
                                            </Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Inline Accent Color Swatches */}
                        <View style={{ gap: 6 }}>
                            <Typo size={12} fontWeight="700" color={colors.neutral600}>
                                Bubble Accent · {ACCENT_SWATCHES.find((s) => s.color === appearance.accentColor)?.name || "Honey Amber"}
                            </Typo>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                {ACCENT_SWATCHES.map((sw) => {
                                    const active = appearance.accentColor === sw.color;
                                    return (
                                        <TouchableOpacity
                                            key={sw.color}
                                            activeOpacity={0.8}
                                            onPress={async () => {
                                                hapticTap("medium");
                                                const next = { ...appearance, accentColor: sw.color };
                                                setAppearance(next);
                                                await persistPreferencesPatch({ appearance: next }, { userId: user?.id });
                                                if (isSocketConnected()) updatePrivacy({ theme: { accent: sw.color } });
                                            }}
                                            style={{
                                                flex: 1,
                                                height: verticalScale(34),
                                                borderRadius: radius.full,
                                                backgroundColor: sw.color,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderWidth: active ? 2.5 : 1,
                                                borderColor: active ? colors.neutral900 : "rgba(0,0,0,0.08)",
                                            }}
                                        >
                                            {active && <MaterialIcons name="check" size={16} color="#ffffff" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Custom Quick-Reaction Presets (Top 6) */}
                        <View style={{ gap: 8, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.neutral200 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                <Typo size={12} fontWeight="700" color={colors.neutral600}>
                                    Quick-Reaction Bar (6 Favorites)
                                </Typo>
                                <TouchableOpacity
                                    onPress={async () => {
                                        hapticTap("light");
                                        const reset = await saveFavoriteReactions(DEFAULT_FAVORITE_REACTIONS);
                                        setFavoriteReactions(reset);
                                        await persistPreferencesPatch({ favoriteReactions: reset }, { userId: user?.id });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={11.5} fontWeight="700" color={colors.primaryDark}>Reset</Typo>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: "row", gap: 6 }}>
                                {favoriteReactions.map((emoji) => (
                                    <View
                                        key={`fav_${emoji}`}
                                        style={{
                                            flex: 1,
                                            height: verticalScale(38),
                                            borderRadius: radius._12,
                                            backgroundColor: colors.primaryLight,
                                            borderWidth: 1.5,
                                            borderColor: colors.primary,
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typo size={20}>{emoji}</Typo>
                                    </View>
                                ))}
                            </View>
                            <Typo size={11} color={colors.neutral400}>Tap any emoji below to add it to the front of your quick bar:</Typo>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                {REACTION_PALETTE.map((emoji) => {
                                    const active = favoriteReactions.includes(emoji);
                                    return (
                                        <TouchableOpacity
                                            key={`pal_${emoji}`}
                                            activeOpacity={0.7}
                                            onPress={async () => {
                                                hapticTap("medium");
                                                const nextList = active
                                                    ? [emoji, ...favoriteReactions.filter((e) => e !== emoji)]
                                                    : [emoji, ...favoriteReactions].slice(0, 6);
                                                const saved = await saveFavoriteReactions(nextList);
                                                setFavoriteReactions(saved);
                                                await persistPreferencesPatch({ favoriteReactions: saved }, { userId: user?.id });
                                            }}
                                            style={{
                                                width: scale(34),
                                                height: scale(34),
                                                borderRadius: radius._10,
                                                backgroundColor: active ? colors.primaryLight : colors.neutral100,
                                                borderWidth: 1,
                                                borderColor: active ? colors.primary : colors.neutral200,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Typo size={18}>{emoji}</Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
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
                        icon="schedule"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Last Seen & Online Visibility"
                        subtitle={
                            privacyPrefs.lastSeen === "nobody"
                                ? "Nobody can see your online status"
                                : privacyPrefs.lastSeen === "contacts"
                                ? "Only your contacts can see last seen"
                                : "Everyone can see when you are online"
                        }
                        onPress={() => {
                            BubblyAlert.alert(
                                "Last Seen Visibility",
                                "Who can see your online & last seen status:",
                                [
                                    {
                                        text: "Everyone",
                                        onPress: async () => {
                                            const next = { ...privacyPrefs, lastSeen: "everyone" as const };
                                            setPrivacyPrefs(next);
                                            await persistPreferencesPatch({ privacy: next }, { userId: user?.id });
                                            if (isSocketConnected()) updatePrivacy({ lastSeen: "everyone" });
                                        },
                                    },
                                    {
                                        text: "My Contacts",
                                        onPress: async () => {
                                            const next = { ...privacyPrefs, lastSeen: "contacts" as const };
                                            setPrivacyPrefs(next);
                                            await persistPreferencesPatch({ privacy: next }, { userId: user?.id });
                                            if (isSocketConnected()) updatePrivacy({ lastSeen: "contacts" });
                                        },
                                    },
                                    {
                                        text: "Nobody",
                                        onPress: async () => {
                                            const next = { ...privacyPrefs, lastSeen: "nobody" as const };
                                            setPrivacyPrefs(next);
                                            await persistPreferencesPatch({ privacy: next }, { userId: user?.id });
                                            if (isSocketConnected()) updatePrivacy({ lastSeen: "nobody" });
                                        },
                                    },
                                    { text: "Cancel", style: "cancel" },
                                ]
                            );
                        }}
                    />
                    <Row
                        icon="done-all"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Read Receipts"
                        subtitle="Share blue seen ticks on messages you open"
                        right={
                            <Switch
                                value={privacyPrefs.readReceipts}
                                onValueChange={async (val) => {
                                    hapticTap("medium");
                                    const next = { ...privacyPrefs, readReceipts: val };
                                    setPrivacyPrefs(next);
                                    await persistPreferencesPatch({ privacy: next }, { userId: user?.id });
                                    if (isSocketConnected()) updatePrivacy({ readReceipts: val });
                                }}
                                trackColor={{ false: colors.neutral300, true: "#16a34a" }}
                                thumbColor={colors.white}
                                disabled={loadingPrefs}
                            />
                        }
                    />
                    <Row
                        icon="keyboard"
                        iconColor="#16a34a"
                        iconBg="#16a34a1F"
                        label="Typing Indicators"
                        subtitle="Show when you are typing in conversations"
                        right={
                            <Switch
                                value={privacyPrefs.typingIndicators}
                                onValueChange={async (val) => {
                                    hapticTap("medium");
                                    const next = { ...privacyPrefs, typingIndicators: val };
                                    setPrivacyPrefs(next);
                                    await persistPreferencesPatch({ privacy: next }, { userId: user?.id });
                                    if (isSocketConnected()) updatePrivacy({ typingIndicators: val });
                                }}
                                trackColor={{ false: colors.neutral300, true: "#16a34a" }}
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
                                    hapticTap("medium");
                                    const next = { ...privacyShield, hideNotificationPreview: val };
                                    setPrivacyShield(next);
                                    await persistPreferencesPatch({ privacyShield: next }, { userId: user?.id });
                                }}
                                trackColor={{ false: colors.neutral300, true: "#16a34a" }}
                                thumbColor={colors.white}
                                disabled={loadingPrefs}
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
                                    { text: "Immediately (0s)", onPress: async () => { const n = { ...privacyShield, autoLockDelayMs: 0 as const }; setPrivacyShield(n); await persistPreferencesPatch({ privacyShield: n }, { userId: user?.id }); } },
                                    { text: "1 Minute", onPress: async () => { const n = { ...privacyShield, autoLockDelayMs: 60000 as const }; setPrivacyShield(n); await persistPreferencesPatch({ privacyShield: n }, { userId: user?.id }); } },
                                    { text: "5 Minutes", onPress: async () => { const n = { ...privacyShield, autoLockDelayMs: 300000 as const }; setPrivacyShield(n); await persistPreferencesPatch({ privacyShield: n }, { userId: user?.id }); } },
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
                    />
                    <Row
                        icon="download"
                        iconColor="#0284c7"
                        iconBg="#e0f2fe"
                        label="Export Preferences Backup"
                        subtitle="Share or copy themes, snippets, tags & notes JSON"
                        onPress={async () => {
                            try {
                                const json = await exportLocalPreferencesSnapshot();
                                await Share.share({
                                    title: "Bubbly Preferences Backup",
                                    message: json,
                                });
                            } catch {
                                const json = await exportLocalPreferencesSnapshot();
                                await Clipboard.setStringAsync(json).catch(() => {});
                                BubblyAlert.alert("Copied", "Preferences JSON copied to clipboard.");
                            }
                        }}
                    />
                    <Row
                        icon="restart-alt"
                        iconColor={colors.rose}
                        iconBg={colors.rose + "1F"}
                        label="Reset Customizations"
                        subtitle="Restore default bubble theme, reactions & quiet hours"
                        onPress={() => {
                            BubblyAlert.alert(
                                "Reset Customizations",
                                "Restore default bubble appearance, quick reactions, quiet hours, and quick replies?",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Reset",
                                        style: "destructive",
                                        onPress: async () => {
                                            await resetLocalCustomizations();
                                            setAppearance(DEFAULT_APPEARANCE);
                                            setPrivacyShield(DEFAULT_PRIVACY_SHIELD);
                                            setQuietHours(DEFAULT_QUIET_HOURS);
                                            setFavoriteReactions(DEFAULT_FAVORITE_REACTIONS);
                                            await persistPreferencesPatch(
                                                {
                                                    appearance: DEFAULT_APPEARANCE,
                                                    privacyShield: DEFAULT_PRIVACY_SHIELD,
                                                    quietHours: DEFAULT_QUIET_HOURS,
                                                    favoriteReactions: DEFAULT_FAVORITE_REACTIONS,
                                                },
                                                { userId: user?.id }
                                            );
                                            hapticTap("success");
                                            BubblyAlert.alert("Restored", "All local customizations reset to defaults.");
                                        },
                                    },
                                ]
                            );
                        }}
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
                        Bubbly v{APP_VERSION} · Flagship Edition
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
                onPressReminder={(rem) => {
                    setShowReminders(false);
                    router.push({
                        pathname: "/(main)/conversation",
                        params: {
                            id: rem.conversationId,
                            name: rem.senderName || "Chat",
                            type: "direct",
                            participants: "[]",
                            highlightMessageId: rem.messageId,
                        },
                    });
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
