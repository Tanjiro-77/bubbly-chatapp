import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import * as SimpleIcons from "simple-icons";
import * as Icons from "phosphor-react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import BrandIcon from "../../components/BrandIcon";
import { scale, verticalScale } from "../../utils/styling";
import { HapticKind, hapticTap } from "../../utils/haptics";

const GITHUB_URL = "https://github.com/Tanjiro-77/bubbly-chatapp";
const BUG_REPORT_URL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20v4.2.1%20Bug%20Report&body=Describe%20the%20bug%20you%20encountered%3A%0A%0A";
const FEEDBACK_EMAIL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20v4.2.1%20Feedback&body=Hi%20Arnav%2C%0A%0A";

const APP_VERSION: string = Constants.expoConfig?.version ?? "4.2.1";
const BUILD_NUM = Platform.OS === "android" ? "12" : "11";

interface TechItem {
    id: string;
    label: string;
    role: string;
    detail: string;
    iconKey: string;
    fallbackEmoji: string;
}

const TECH_STACK: TechItem[] = [
    {
        id: "rn",
        label: "React Native",
        role: "Mobile UI",
        detail: "60fps gesture-driven native interface with Reanimated transitions.",
        iconKey: "siReact",
        fallbackEmoji: "⚛️",
    },
    {
        id: "expo",
        label: "Expo SDK 57",
        role: "Native Runtime",
        detail: "Push channels, audio/camera capture, clipboard & file system APIs.",
        iconKey: "siExpo",
        fallbackEmoji: "🔷",
    },
    {
        id: "express",
        label: "Express 5",
        role: "REST API",
        detail: "Rate-limited auth, Agora call tokens, uploads, and search endpoints.",
        iconKey: "siExpress",
        fallbackEmoji: "🚀",
    },
    {
        id: "socket",
        label: "Socket.IO",
        role: "Live Engine",
        detail: "Sub-second message delivery, typing states, read receipts & call signaling.",
        iconKey: "siSocketdotio",
        fallbackEmoji: "⚡",
    },
    {
        id: "mongo",
        label: "MongoDB",
        role: "Persistence",
        detail: "Indexed conversations, polls, disappearing timers & encrypted metadata.",
        iconKey: "siMongodb",
        fallbackEmoji: "🍃",
    },
    {
        id: "agora",
        label: "Agora RTC",
        role: "HD Calls",
        detail: "Low-latency voice & video channels with real-time token renewal.",
        iconKey: "siAgora",
        fallbackEmoji: "📡",
    },
    {
        id: "e2ee",
        label: "TweetNaCl",
        role: "E2EE Crypto",
        detail: "X25519 key exchange, XSalsa20-Poly1305 messages/media & Safety Numbers.",
        iconKey: "siLetsencrypt",
        fallbackEmoji: "🔐",
    },
    {
        id: "cloudinary",
        label: "Cloudinary",
        role: "Media CDN",
        detail: "Instant HD image optimization, voice clips, documents & stories.",
        iconKey: "siCloudinary",
        fallbackEmoji: "☁️",
    },
];

type BentoKey = "tools" | "calls" | "realtime" | "vault";

const BENTO_PILLARS: {
    key: BentoKey;
    title: string;
    subtitle: string;
    specTitle: string;
    specBody: string;
    badgeBg: string;
    accent: string;
    icon: React.ReactNode;
}[] = [
    {
        key: "tools",
        title: "20+ Tools",
        subtitle: "Flagship Suite",
        specTitle: "Interactive Chat Productivity",
        specBody:
            "Collaborative checklists, live countdowns, polls, slash quick-replies, mini-games, reminders & offline outbox built straight into threads.",
        badgeBg: "#fef3c7",
        accent: "#d97706",
        icon: <Icons.RocketLaunch size={verticalScale(17)} color="#b45309" weight="fill" />,
    },
    {
        key: "calls",
        title: "Agora HD",
        subtitle: "Voice & Video",
        specTitle: "Crystal-Clear Real-Time Calling",
        specBody:
            "Native full-screen incoming calls with lock-screen Accept / Decline actions, 4 custom call ringtones, outgoing dial tone, and Agora WebRTC HD streams.",
        badgeBg: "#dcfce7",
        accent: "#16a34a",
        icon: <Icons.PhoneCall size={verticalScale(17)} color="#15803d" weight="fill" />,
    },
    {
        key: "realtime",
        title: "Real-Time",
        subtitle: "Socket + Push",
        specTitle: "Instant Delivery Even When Closed",
        specBody:
            "Foreground floating banners + high-priority FCM/APNs push alerts with Android ringtone channels wake your device for calls & messages even when the app is closed.",
        badgeBg: "#dbeafe",
        accent: "#2563eb",
        icon: <Icons.Lightning size={verticalScale(17)} color="#1d4ed8" weight="fill" />,
    },
    {
        key: "vault",
        title: "E2EE + Vault",
        subtitle: "X25519 Shield",
        specTitle: "End-to-End Encrypted By Design",
        specBody:
            "Messages, media, and voice notes are encrypted on-device with X25519 + XSalsa20-Poly1305, calls use Agora AES-128-GCM2, plus 60-digit Safety Numbers, 4-digit Secret Vault PIN, and Biometric App Lock.",
        badgeBg: "#dcfce7",
        accent: "#16a34a",
        icon: <Icons.ShieldCheck size={verticalScale(17)} color="#15803d" weight="fill" />,
    },
];

type FeatureCategory = "all" | "messaging" | "productivity" | "privacy" | "media";

interface FlagshipFeature {
    id: number;
    title: string;
    subtitle: string;
    tip: string;
    category: Exclude<FeatureCategory, "all">;
    emoji: string;
}

const FLAGSHIP_FEATURES: FlagshipFeature[] = [
    { id: 1, title: "Quick Formatting Toolbar", subtitle: "Bold, italic, strike, inline code & > blockquotes", tip: "Tap the Aa button next to the composer bar.", category: "messaging", emoji: "✍️" },
    { id: 2, title: "Slash Command Quick Replies", subtitle: "Type / for instant reusable reply templates", tip: "Start any message with / to trigger saved snippets.", category: "productivity", emoji: "⚡" },
    { id: 3, title: "Bulk Multi-Select Dock", subtitle: "Copy, star, or delete multiple messages at once", tip: "Long-press a message or select multiple bubbles in thread.", category: "productivity", emoji: "☑️" },
    { id: 4, title: "Silent Send Mode", subtitle: "Long-press Send to deliver without alert chimes", tip: "Hold the Send button for 320ms to toggle Silent Send.", category: "messaging", emoji: "🔕" },
    { id: 5, title: "Message Reminder Alarms", subtitle: "Schedule OS alerts on important chat messages", tip: "Long-press any message and pick Remind Me.", category: "productivity", emoji: "⏰" },
    { id: 6, title: "Interactive Smart Chips", subtitle: "1-tap @mentions, phone numbers, URLs & emails", tip: "Links, handles & numbers become clickable pills automatically.", category: "messaging", emoji: "🔗" },
    { id: 7, title: "Shared Checklist Cards", subtitle: "Collaborative live to-do lists inside any thread", tip: "Open Attach (+) -> Checklist to create synced tasks.", category: "productivity", emoji: "✅" },
    { id: 8, title: "Icebreaker Mini-Games", subtitle: "Roll Dice, flip Coins, Magic 8-Ball & RPS live", tip: "Open Attach (+) -> Games to challenge friends.", category: "media", emoji: "🎲" },
    { id: 9, title: "Multi-Pinned Carousel", subtitle: "Cycle pinned announcements & jump right to them", tip: "Pin messages from the bubble action menu to build a banner.", category: "messaging", emoji: "📌" },
    { id: 10, title: "Live Countdown Stickers", subtitle: "Animated event timers directly inside chats", tip: "Open Attach (+) -> Timer with quick presets or custom duration.", category: "media", emoji: "⏳" },
    { id: 11, title: "Chat Archive Vault", subtitle: "Declutter home feed into a collapsible archive", tip: "Long-press a conversation on Home to archive or pin.", category: "productivity", emoji: "🗄️" },
    { id: 12, title: "Smart Chat Folders", subtitle: "Filter Work, Friends, Family, VIP & Unread chats", tip: "Tag chats via long-press or Contact Profile screen.", category: "productivity", emoji: "🗂️" },
    { id: 13, title: "Private Nicknames & Notes", subtitle: "Per-contact aliases & scratchpad notes stored locally", tip: "Open Contact Info to set private nicknames and notes.", category: "privacy", emoji: "📝" },
    { id: 14, title: "In-Chat Insights", subtitle: "Live message counts, top senders & media breakdown", tip: "Tap the top menu (⋮) inside a chat -> Insights.", category: "productivity", emoji: "📊" },
    { id: 15, title: "Custom Activity Status", subtitle: "Emoji + live status line visible on your chats", tip: "Open Profile to update your live status preset.", category: "messaging", emoji: "🎧" },
    { id: 16, title: "Focus Quiet Mode", subtitle: "Timed Do-Not-Disturb suppressing foreground pings", tip: "Tap the Moon icon on Home header to enable timed focus.", category: "privacy", emoji: "🌙" },
    { id: 17, title: "Bubble Corner Studio", subtitle: "Pill, Classic & Sharp corners plus font scaling", tip: "Customize live chat preview in Settings -> Bubble Studio.", category: "media", emoji: "🎨" },
    { id: 18, title: "Privacy Notification Shield", subtitle: "Mask sender & message previews on banners", tip: "Toggle Hide Notification Preview in Settings -> Privacy.", category: "privacy", emoji: "🛡️" },
    { id: 19, title: "Story Studio Typography", subtitle: "7 gradient presets, fonts & mood stickers", tip: "Tap + on the Stories bar to customize text or photo stories.", category: "media", emoji: "✨" },
    { id: 20, title: "Quick Jump & Offline Outbox", subtitle: "Instant chat switcher & resilient send queue", tip: "Tap the Lightning button on Home to jump anywhere fast.", category: "messaging", emoji: "🚀" },
];

const CATEGORY_TABS: { key: FeatureCategory; label: string }[] = [
    { key: "all", label: "All" },
    { key: "messaging", label: "Messaging" },
    { key: "productivity", label: "Productivity" },
    { key: "privacy", label: "Privacy" },
    { key: "media", label: "Media" },
];

const HAPTIC_DEMOS: { kind: HapticKind; label: string; emoji: string }[] = [
    { kind: "medium", label: "Click", emoji: "👆" },
    { kind: "heavy", label: "Punch", emoji: "💥" },
    { kind: "rigid", label: "Detent", emoji: "⚙️" },
    { kind: "heartbeat", label: "Pulse", emoji: "💓" },
    { kind: "boom", label: "Boom", emoji: "🔊" },
];

const openLink = async (url: string) => {
    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        }
    } catch (_) {}
};

const getIcon = (key: string) => (SimpleIcons as any)[key];

interface SectionLabelProps {
    label: string;
    rightHint?: string;
    isDark: boolean;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ label, rightHint, isDark }) => (
    <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionLabelLeft}>
            <View style={styles.sectionAccentBar} />
            <Typo
                size={11.5}
                fontWeight="800"
                color={isDark ? colors.neutral400 : colors.neutral500}
                style={styles.sectionLabel}
                textProps={{ numberOfLines: 1 }}
            >
                {label.toUpperCase()}
            </Typo>
        </View>
        {rightHint ? (
            <Typo size={11} fontWeight="700" color={colors.primaryDark} textProps={{ numberOfLines: 1 }}>
                {rightHint}
            </Typo>
        ) : null}
    </View>
);

interface SectionCardProps {
    children: React.ReactNode;
    isDark: boolean;
    noPadding?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, isDark, noPadding }) => (
    <View
        style={[
            styles.card,
            !noPadding && { padding: spacingX._15 },
            {
                backgroundColor: isDark ? colors.neutral800 : colors.white,
                borderColor: isDark ? colors.neutral700 : colors.neutral200,
            },
        ]}
    >
        {children}
    </View>
);

interface LinkRowProps {
    icon: React.ReactNode;
    iconBg?: string;
    label: string;
    subtitle?: string;
    url?: string;
    onPress?: () => void;
    isDark: boolean;
    isLast?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({
    icon,
    iconBg,
    label,
    subtitle,
    url,
    onPress,
    isDark,
    isLast = false,
}) => (
    <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
            hapticTap("medium");
            if (onPress) onPress();
            else if (url) openLink(url);
        }}
        style={[
            styles.linkRow,
            !isLast && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: isDark ? colors.neutral700 : colors.neutral200,
            },
        ]}
    >
        <View style={styles.linkRowLeft}>
            <View
                style={[
                    styles.linkIconBadge,
                    {
                        backgroundColor: iconBg || (isDark ? colors.neutral700 : colors.neutral100),
                        borderColor: isDark ? colors.neutral600 : colors.neutral200,
                    },
                ]}
            >
                {icon}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Typo
                    size={14.5}
                    fontWeight="600"
                    color={isDark ? colors.neutral100 : colors.neutral900}
                    textProps={{ numberOfLines: 1 }}
                >
                    {label}
                </Typo>
                {subtitle ? (
                    <Typo
                        size={11.5}
                        color={isDark ? colors.neutral400 : colors.neutral500}
                        textProps={{ numberOfLines: 1 }}
                    >
                        {subtitle}
                    </Typo>
                ) : null}
            </View>
        </View>
        <Icons.CaretRight
            size={verticalScale(15)}
            color={isDark ? colors.neutral500 : colors.neutral350}
            weight="bold"
        />
    </TouchableOpacity>
);

export default function AboutScreen() {
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";

    const [selectedCat, setSelectedCat] = useState<FeatureCategory>("all");
    const [featureQuery, setFeatureQuery] = useState("");
    const [showAllFeatures, setShowAllFeatures] = useState(false);
    const [expandedFeatureId, setExpandedFeatureId] = useState<number | null>(null);
    const [selectedPillar, setSelectedPillar] = useState<BentoKey>("realtime");
    const [selectedTechId, setSelectedTechId] = useState<string>(TECH_STACK[0].id);
    const [copiedBuild, setCopiedBuild] = useState(false);
    const [celebrateCreator, setCelebrateCreator] = useState(false);
    const [photoModalVisible, setPhotoModalVisible] = useState(false);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const creatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (creatorTimerRef.current) clearTimeout(creatorTimerRef.current);
        };
    }, []);

    const pageBg = isDark ? colors.neutral900 : colors.neutral100;
    const primaryTextColor = isDark ? colors.white : colors.neutral900;
    const subtleTextColor = isDark ? colors.neutral400 : colors.neutral500;

    const filteredFeatures = useMemo(() => {
        const q = featureQuery.trim().toLowerCase();
        return FLAGSHIP_FEATURES.filter((f) => {
            const catOk = selectedCat === "all" || f.category === selectedCat;
            if (!catOk) return false;
            if (!q) return true;
            return (
                f.title.toLowerCase().includes(q) ||
                f.subtitle.toLowerCase().includes(q) ||
                f.category.toLowerCase().includes(q)
            );
        });
    }, [selectedCat, featureQuery]);

    const visibleFeatures = useMemo(() => {
        if (selectedCat !== "all" || featureQuery.trim() || showAllFeatures) return filteredFeatures;
        return filteredFeatures.slice(0, 6);
    }, [filteredFeatures, selectedCat, featureQuery, showAllFeatures]);

    const activePillar = BENTO_PILLARS.find((p) => p.key === selectedPillar) || BENTO_PILLARS[0];
    const activeTech = TECH_STACK.find((t) => t.id === selectedTechId) || TECH_STACK[0];

    const handleShareApp = async () => {
        hapticTap("heavy");
        try {
            await Share.share({
                message: `Check out Bubbly v${APP_VERSION} — real-time messaging, background & lock-screen push alerts, Agora HD voice & video calls, Story Studio, and 20 flagship chat tools built by Arnav: ${GITHUB_URL}`,
            });
        } catch (_) {}
    };

    const handleCopyBuildInfo = async () => {
        const summary = `Bubbly v${APP_VERSION} (Build ${BUILD_NUM}) · ${Platform.OS.toUpperCase()} · Socket.IO + Agora HD + High-Priority Push`;
        try {
            await Clipboard.setStringAsync(summary);
            hapticTap("success");
            setCopiedBuild(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setCopiedBuild(false), 2000);
        } catch (_) {
            hapticTap("error");
        }
    };

    const handleCreatorPress = () => {
        hapticTap("celebration");
        setCelebrateCreator(true);
        if (creatorTimerRef.current) clearTimeout(creatorTimerRef.current);
        creatorTimerRef.current = setTimeout(() => setCelebrateCreator(false), 2200);
    };

    return (
        <ScreenWrapper
            showPattern={true}
            bgOpacity={isDark ? 0.25 : 0.35}
            backgroundColor={colors.neutral900}
            statusBarStyle="light-content"
        >
            {/* ── Obsidian Top Bar ── */}
            <View style={styles.topHeader}>
                <BackButton color={colors.white} iconSize={21} />
                <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                        <View style={styles.headerLogoBadge}>
                            <ExpoImage
                                source={require("@/assets/images/splash-icon.png")}
                                style={styles.headerLogoImg}
                                contentFit="contain"
                            />
                        </View>
                        <Typo size={17} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                            About Bubbly
                        </Typo>
                    </View>
                    <Typo size={11} fontWeight="600" color="rgba(255,255,255,0.65)" textProps={{ numberOfLines: 1 }}>
                        Flagship v{APP_VERSION} · Build {BUILD_NUM}
                    </Typo>
                </View>
                <TouchableOpacity
                    onPress={handleShareApp}
                    activeOpacity={0.75}
                    style={styles.shareTopBtn}
                >
                    <Icons.ShareNetwork size={verticalScale(17)} color={colors.primary} weight="bold" />
                </TouchableOpacity>
            </View>

            {/* ── Rounded Content Surface ── */}
            <View style={[styles.surfaceSheet, { backgroundColor: pageBg }]}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Hero Obsidian & Honey-Gold Gradient Card ── */}
                    <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.heroCardOuter}>
                        <LinearGradient
                            colors={["#1f1914", "#171412", "#0f0d0c"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroOrbTop} pointerEvents="none" />

                            <View style={styles.heroTopRow}>
                                <View style={styles.heroBrandRow}>
                                    <View style={styles.heroLogoBox}>
                                        <ExpoImage
                                            source={require("@/assets/images/splash-icon.png")}
                                            style={styles.heroLogoImg}
                                            contentFit="contain"
                                        />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Typo size={19} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                            Bubbly
                                        </Typo>
                                        <Typo size={11.5} fontWeight="500" color="rgba(255,255,255,0.68)" textProps={{ numberOfLines: 1 }}>
                                            Connect Beyond Messages
                                        </Typo>
                                    </View>
                                </View>
                                <View style={styles.heroVersionPill}>
                                    <View style={styles.livePulseDot} />
                                    <Typo size={11} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                        v{APP_VERSION}
                                    </Typo>
                                </View>
                            </View>

                            <View style={styles.heroCreatorRow}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        hapticTap("medium");
                                        setPhotoModalVisible(true);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="View Arnav Khari full portrait"
                                >
                                    <View style={styles.heroPortraitGlow} />
                                    <LinearGradient
                                        colors={[colors.primary, "#F59E0B", "#EA580C"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.heroPortraitFrame}
                                    >
                                        <View style={styles.heroPortraitInner}>
                                            <ExpoImage
                                                source={require("@/assets/images/developer-photo.png")}
                                                style={styles.heroPortraitImg}
                                                contentFit="cover"
                                                contentPosition={{ top: "5%", left: "48%" }}
                                                transition={220}
                                            />
                                            <LinearGradient
                                                colors={["transparent", "rgba(12,10,8,0.86)"]}
                                                style={styles.heroPortraitScrim}
                                            />
                                            <View style={styles.heroVerifiedPill}>
                                                <Icons.SealCheck size={11} color={colors.primary} weight="fill" />
                                            </View>
                                            <View style={styles.heroZoomPill}>
                                                <Icons.CornersOut size={11} color={colors.primary} weight="bold" />
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={handleCreatorPress}
                                    style={styles.heroCreatorDetails}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <View style={styles.heroCreatorBadge}>
                                            <Typo size={9.5} fontWeight="800" color={colors.primary} textProps={{ numberOfLines: 1 }}>
                                                CREATOR &amp; ARCHITECT
                                            </Typo>
                                        </View>
                                        {celebrateCreator && (
                                            <Animated.View entering={FadeIn.duration(160)} style={styles.thanksChip}>
                                                <Icons.Sparkle size={10} color={colors.neutral900} weight="fill" />
                                                <Typo size={10} fontWeight="800" color={colors.neutral900}>Thanks!</Typo>
                                            </Animated.View>
                                        )}
                                    </View>
                                    <Typo size={18.5} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                        Arnav Khari
                                    </Typo>
                                    <Typo size={11.5} color="rgba(255,255,255,0.78)" textProps={{ numberOfLines: 2 }}>
                                        End-to-end encrypted real-time chat, Agora HD calling, and tactile native craft.
                                    </Typo>
                                    <View style={styles.heroMetaTagsRow}>
                                        <View style={styles.heroMetaTag}>
                                            <Typo size={10} fontWeight="700" color="rgba(255,255,255,0.88)">Full-Stack</Typo>
                                        </View>
                                        <View style={styles.heroMetaTag}>
                                            <Typo size={10} fontWeight="700" color="rgba(255,255,255,0.88)">Expo + Agora</Typo>
                                        </View>
                                        <View style={[styles.heroMetaTag, { borderColor: "rgba(34,197,94,0.4)", backgroundColor: "rgba(34,197,94,0.14)" }]}>
                                            <Typo size={10} fontWeight="700" color="#86EFAC">X25519 E2EE</Typo>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* ── Hero Primary Action Dock ── */}
                            <View style={styles.heroActionRow}>
                                <TouchableOpacity
                                    style={styles.heroActionBtnPrimary}
                                    activeOpacity={0.82}
                                    onPress={() => {
                                        hapticTap("heavy");
                                        openLink(GITHUB_URL);
                                    }}
                                >
                                    <BrandIcon icon={getIcon("siGithub")} fallbackEmoji="🐙" size={14} monochrome={colors.neutral900} />
                                    <Typo size={12} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                        Source Code
                                    </Typo>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.heroActionBtnSecondary}
                                    activeOpacity={0.82}
                                    onPress={() => {
                                        hapticTap("medium");
                                        router.push("/(main)/reportBugModal");
                                    }}
                                >
                                    <Icons.Bug size={14} color={colors.white} weight="bold" />
                                    <Typo size={12} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                        Report Bug
                                    </Typo>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.heroCopyBtn}
                                    activeOpacity={0.82}
                                    onPress={handleCopyBuildInfo}
                                >
                                    {copiedBuild ? (
                                        <Icons.Check size={15} color="#22c55e" weight="bold" />
                                    ) : (
                                        <Icons.Copy size={15} color={colors.primary} weight="bold" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* ── Interactive 2x2 Architecture Bento Grid ── */}
                    <SectionLabel label="Platform Architecture" rightHint="Tap a tile to inspect" isDark={isDark} />
                    <Animated.View entering={FadeInUp.duration(440).delay(40).springify()} style={styles.metricsGrid}>
                        {BENTO_PILLARS.map((tile) => {
                            const active = selectedPillar === tile.key;
                            return (
                                <TouchableOpacity
                                    key={tile.key}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        hapticTap("medium");
                                        setSelectedPillar(tile.key);
                                    }}
                                    style={[
                                        styles.metricTile,
                                        {
                                            backgroundColor: isDark ? colors.neutral800 : colors.white,
                                            borderColor: active
                                                ? tile.accent
                                                : isDark ? colors.neutral700 : colors.neutral200,
                                            borderWidth: active ? 1.8 : 1,
                                        },
                                    ]}
                                >
                                    <View style={styles.metricTopRow}>
                                        <View style={[styles.metricIconWrap, { backgroundColor: tile.badgeBg }]}>
                                            {tile.icon}
                                        </View>
                                        {active && (
                                            <View style={[styles.activeDot, { backgroundColor: tile.accent }]} />
                                        )}
                                    </View>
                                    <Typo size={15.5} fontWeight="800" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>
                                        {tile.title}
                                    </Typo>
                                    <Typo size={11} color={subtleTextColor} textProps={{ numberOfLines: 1 }}>
                                        {tile.subtitle}
                                    </Typo>
                                </TouchableOpacity>
                            );
                        })}
                    </Animated.View>

                    {/* Selected Architecture Spotlight */}
                    <Animated.View layout={LinearTransition.springify()}>
                        <View
                            style={[
                                styles.spotlightCard,
                                {
                                    backgroundColor: isDark ? colors.neutral800 : "#fffbeb",
                                    borderColor: isDark ? colors.neutral700 : colors.primary,
                                },
                            ]}
                        >
                            <View style={styles.spotlightHeader}>
                                <Icons.Sparkle size={14} color={colors.primaryDark} weight="fill" />
                                <Typo size={12.5} fontWeight="800" color={colors.primaryDark}>
                                    {activePillar.specTitle}
                                </Typo>
                            </View>
                            <Typo size={12.5} color={isDark ? colors.neutral200 : colors.neutral700} style={{ lineHeight: verticalScale(18) }}>
                                {activePillar.specBody}
                            </Typo>
                        </View>
                    </Animated.View>

                    {/* ── Interactive Tactile Haptics Playground ── */}
                    <SectionLabel
                        label="Tactile Haptic Engine"
                        rightHint="Tap to feel · Tune in Settings"
                        isDark={isDark}
                    />
                    <SectionCard isDark={isDark}>
                        <View style={styles.hapticsRow}>
                            {HAPTIC_DEMOS.map((h) => (
                                <TouchableOpacity
                                    key={h.kind}
                                    activeOpacity={0.75}
                                    onPress={() => hapticTap(h.kind)}
                                    style={[
                                        styles.hapticChip,
                                        {
                                            backgroundColor: isDark ? colors.neutral900 : colors.neutral100,
                                            borderColor: isDark ? colors.neutral700 : colors.neutral200,
                                        },
                                    ]}
                                >
                                    <Typo size={14}>{h.emoji}</Typo>
                                    <Typo size={11} fontWeight="700" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>
                                        {h.label}
                                    </Typo>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => {
                                hapticTap("medium");
                                router.push("/(main)/settings");
                            }}
                            style={[
                                styles.hapticsFooterBtn,
                                { borderTopColor: isDark ? colors.neutral700 : colors.neutral200 },
                            ]}
                        >
                            <Typo size={12} fontWeight="700" color={colors.primaryDark}>
                                Adjust Haptic Strength & Notification Channels
                            </Typo>
                            <Icons.ArrowRight size={14} color={colors.primaryDark} weight="bold" />
                        </TouchableOpacity>
                    </SectionCard>

                    {/* ── Interactive Feature Explorer ── */}
                    <SectionLabel
                        label={`What's New in v${APP_VERSION}`}
                        rightHint={`${filteredFeatures.length} features`}
                        isDark={isDark}
                    />

                    {/* Feature Search Bar */}
                    <View
                        style={[
                            styles.searchBox,
                            {
                                backgroundColor: isDark ? colors.neutral800 : colors.white,
                                borderColor: isDark ? colors.neutral700 : colors.neutral200,
                            },
                        ]}
                    >
                        <Icons.MagnifyingGlass size={16} color={subtleTextColor} weight="bold" />
                        <TextInput
                            value={featureQuery}
                            onChangeText={setFeatureQuery}
                            placeholder="Search 20 flagship features..."
                            placeholderTextColor={subtleTextColor}
                            style={[styles.searchInput, { color: primaryTextColor }]}
                        />
                        {featureQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    hapticTap("light");
                                    setFeatureQuery("");
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Icons.XCircle size={17} color={subtleTextColor} weight="fill" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterTabsScroll}
                    >
                        {CATEGORY_TABS.map((tab) => {
                            const active = selectedCat === tab.key;
                            const count =
                                tab.key === "all"
                                    ? FLAGSHIP_FEATURES.length
                                    : FLAGSHIP_FEATURES.filter((f) => f.category === tab.key).length;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        hapticTap("medium");
                                        setSelectedCat(tab.key);
                                    }}
                                    style={[
                                        styles.filterTab,
                                        {
                                            backgroundColor: active
                                                ? colors.primary
                                                : isDark ? colors.neutral800 : colors.white,
                                            borderColor: active
                                                ? colors.primaryDark
                                                : isDark ? colors.neutral700 : colors.neutral200,
                                        },
                                    ]}
                                >
                                    <Typo
                                        size={12}
                                        fontWeight={active ? "800" : "600"}
                                        color={active ? colors.neutral900 : subtleTextColor}
                                        textProps={{ numberOfLines: 1 }}
                                    >
                                        {tab.label} ({count})
                                    </Typo>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <SectionCard isDark={isDark} noPadding>
                        {visibleFeatures.length === 0 ? (
                            <View style={styles.emptyFeatures}>
                                <Icons.MagnifyingGlass size={24} color={subtleTextColor} />
                                <Typo size={13} fontWeight="600" color={subtleTextColor}>
                                    No features match "{featureQuery}"
                                </Typo>
                            </View>
                        ) : (
                            visibleFeatures.map((feat, idx) => {
                                const isLastItem =
                                    idx === visibleFeatures.length - 1 &&
                                    (selectedCat !== "all" || !!featureQuery.trim() || showAllFeatures);
                                const isExpanded = expandedFeatureId === feat.id;
                                return (
                                    <TouchableOpacity
                                        key={feat.id}
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            hapticTap("medium");
                                            setExpandedFeatureId(isExpanded ? null : feat.id);
                                        }}
                                        style={[
                                            styles.featureRow,
                                            !isLastItem && {
                                                borderBottomWidth: StyleSheet.hairlineWidth,
                                                borderBottomColor: isDark ? colors.neutral700 : colors.neutral200,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.featureEmojiBox,
                                                { backgroundColor: isDark ? colors.neutral700 : "#fef3c7" },
                                            ]}
                                        >
                                            <Typo size={17}>{feat.emoji}</Typo>
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                                            <View style={styles.featureTitleRow}>
                                                <Typo
                                                    size={13.5}
                                                    fontWeight="700"
                                                    color={primaryTextColor}
                                                    style={{ flex: 1 }}
                                                    textProps={{ numberOfLines: 1 }}
                                                >
                                                    {feat.id}. {feat.title}
                                                </Typo>
                                                <Icons.CaretDown
                                                    size={13}
                                                    color={subtleTextColor}
                                                    weight="bold"
                                                    style={isExpanded ? { transform: [{ rotate: "180deg" }] } : undefined}
                                                />
                                            </View>
                                            <Typo
                                                size={11.5}
                                                color={subtleTextColor}
                                                textProps={{ numberOfLines: 2 }}
                                            >
                                                {feat.subtitle}
                                            </Typo>
                                            {isExpanded && (
                                                <View style={styles.featureTipBox}>
                                                    <Typo size={11} fontWeight="700" color={colors.primaryDark}>
                                                        TIP · {feat.tip}
                                                    </Typo>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        {selectedCat === "all" && !featureQuery.trim() && !showAllFeatures && filteredFeatures.length > 6 && (
                            <TouchableOpacity
                                style={[
                                    styles.expandFeaturesBtn,
                                    { borderTopColor: isDark ? colors.neutral700 : colors.neutral200 },
                                ]}
                                activeOpacity={0.75}
                                onPress={() => {
                                    hapticTap("heavy");
                                    setShowAllFeatures(true);
                                }}
                            >
                                <Typo size={12.5} fontWeight="800" color={colors.primaryDark}>
                                    Show All {filteredFeatures.length} Features
                                </Typo>
                                <Icons.CaretDown size={14} color={colors.primaryDark} weight="bold" />
                            </TouchableOpacity>
                        )}
                        {selectedCat === "all" && !featureQuery.trim() && showAllFeatures && (
                            <TouchableOpacity
                                style={[
                                    styles.expandFeaturesBtn,
                                    { borderTopColor: isDark ? colors.neutral700 : colors.neutral200 },
                                ]}
                                activeOpacity={0.75}
                                onPress={() => {
                                    hapticTap("medium");
                                    setShowAllFeatures(false);
                                }}
                            >
                                <Typo size={12.5} fontWeight="700" color={subtleTextColor}>
                                    Show Less
                                </Typo>
                                <Icons.CaretUp size={14} color={subtleTextColor} weight="bold" />
                            </TouchableOpacity>
                        )}
                    </SectionCard>

                    {/* ── Built With Tech Stack ── */}
                    <SectionLabel label="Architecture Stack" rightHint={activeTech.label} isDark={isDark} />
                    <SectionCard isDark={isDark} noPadding>
                        <View style={styles.techGrid}>
                            {TECH_STACK.map((tech) => {
                                const iconData = getIcon(tech.iconKey);
                                const active = tech.id === selectedTechId;
                                return (
                                    <TouchableOpacity
                                        key={tech.id}
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            hapticTap("medium");
                                            setSelectedTechId(tech.id);
                                        }}
                                        style={[
                                            styles.techPillCard,
                                            {
                                                backgroundColor: active
                                                    ? (isDark ? "rgba(250, 204, 21, 0.14)" : "#fffbeb")
                                                    : (isDark ? colors.neutral900 : colors.neutral50),
                                                borderColor: active
                                                    ? colors.primaryDark
                                                    : (isDark ? colors.neutral700 : colors.neutral200),
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.techIconBox,
                                                {
                                                    backgroundColor: isDark ? colors.neutral800 : colors.white,
                                                    borderColor: isDark ? colors.neutral700 : colors.neutral200,
                                                },
                                            ]}
                                        >
                                            <BrandIcon icon={iconData} fallbackEmoji={tech.fallbackEmoji} size={18} />
                                        </View>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Typo size={12.5} fontWeight="700" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>
                                                {tech.label}
                                            </Typo>
                                            <Typo size={10.5} color={subtleTextColor} textProps={{ numberOfLines: 1 }}>
                                                {tech.role}
                                            </Typo>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={[styles.techDetailBar, { borderTopColor: isDark ? colors.neutral700 : colors.neutral200 }]}>
                            <Icons.Cpu size={14} color={colors.primaryDark} weight="fill" />
                            <Typo size={11.5} fontWeight="600" color={subtleTextColor} style={{ flex: 1 }}>
                                {activeTech.detail}
                            </Typo>
                        </View>
                    </SectionCard>

                    {/* ── Developer & Community Links ── */}
                    <SectionLabel label="Developer & Feedback" isDark={isDark} />
                    <SectionCard isDark={isDark} noPadding>
                        <LinkRow
                            icon={<BrandIcon icon={getIcon("siGithub")} fallbackEmoji="🐙" size={16} monochrome={isDark ? colors.white : colors.neutral800} />}
                            label="GitHub Repository"
                            subtitle="Inspect source code & releases"
                            url={GITHUB_URL}
                            isDark={isDark}
                        />
                        <LinkRow
                            icon={<Icons.Bug size={16} color="#dc2626" weight="bold" />}
                            iconBg={isDark ? "rgba(220,38,38,0.18)" : "#fee2e2"}
                            label="In-App Bug Reporter"
                            subtitle="Attach screenshot & device diagnostics"
                            onPress={() => router.push("/(main)/reportBugModal")}
                            isDark={isDark}
                        />
                        <LinkRow
                            icon={<Icons.EnvelopeSimple size={16} color="#b45309" weight="bold" />}
                            iconBg={isDark ? "rgba(245,158,11,0.18)" : "#fef3c7"}
                            label="Email Arnav Directly"
                            subtitle="Feature ideas & direct bug reports"
                            url={FEEDBACK_EMAIL || BUG_REPORT_URL}
                            isDark={isDark}
                        />
                        <LinkRow
                            icon={<Icons.Sparkle size={16} color="#7c3aed" weight="fill" />}
                            iconBg={isDark ? "rgba(124,58,237,0.2)" : "#ede9fe"}
                            label="Replay Feature Walkthrough"
                            subtitle="Revisit onboarding & permission setup"
                            onPress={() => router.push("/onboarding?replay=true")}
                            isDark={isDark}
                            isLast
                        />
                    </SectionCard>

                    {/* ── Legal & Trust ── */}
                    <SectionLabel label="Legal & Trust" isDark={isDark} />
                    <SectionCard isDark={isDark} noPadding>
                        <LinkRow
                            icon={<Icons.FileText size={16} color="#2563eb" weight="bold" />}
                            iconBg={isDark ? "rgba(37,99,235,0.18)" : "#dbeafe"}
                            label="Privacy Policy"
                            subtitle="How Bubbly respects your data"
                            onPress={() => router.push("/(legal)/privacyPolicy" as any)}
                            isDark={isDark}
                        />
                        <LinkRow
                            icon={<Icons.LockKey size={16} color="#16a34a" weight="bold" />}
                            iconBg={isDark ? "rgba(22,163,74,0.18)" : "#dcfce7"}
                            label="Security & Data Safety"
                            subtitle="Permissions, vault & encryption overview"
                            onPress={() => router.push("/(legal)/security" as any)}
                            isDark={isDark}
                            isLast
                        />
                    </SectionCard>

                    {/* ── Footer ── */}
                    <View style={styles.footer}>
                        <Typo size={12} fontWeight="700" color={subtleTextColor}>
                            Bubbly v{APP_VERSION} · Build {BUILD_NUM} · {Platform.OS.toUpperCase()}
                        </Typo>
                        <Typo size={11} color={subtleTextColor} style={{ marginTop: 2 }}>
                            © 2026 Bubbly · Designed & Built by Arnav
                        </Typo>
                    </View>
                </ScrollView>
            </View>

            <Modal
                visible={photoModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setPhotoModalVisible(false)}
            >
                <Pressable
                    style={styles.photoModalBackdrop}
                    onPress={() => setPhotoModalVisible(false)}
                >
                    <Pressable style={styles.photoModalCard} onPress={() => {}}>
                        <ExpoImage
                            source={require("@/assets/images/developer-photo.png")}
                            style={styles.photoModalImg}
                            contentFit="cover"
                            contentPosition={{ top: "4%", left: "48%" }}
                            transition={200}
                        />
                        <LinearGradient
                            colors={["transparent", "rgba(10,9,8,0.92)"]}
                            style={styles.photoModalFooter}
                        >
                            <View style={{ flex: 1 }}>
                                <Typo size={18} fontWeight="800" color={colors.white}>
                                    Arnav Khari
                                </Typo>
                                <Typo size={12} fontWeight="600" color={colors.primary}>
                                    Creator & Full-Stack Engineer · Bubbly v{APP_VERSION}
                                </Typo>
                            </View>
                            <TouchableOpacity
                                style={styles.photoModalClose}
                                activeOpacity={0.8}
                                onPress={() => {
                                    hapticTap("light");
                                    setPhotoModalVisible(false);
                                }}
                            >
                                <Icons.X size={18} color={colors.white} weight="bold" />
                            </TouchableOpacity>
                        </LinearGradient>
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    topHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingTop: Platform.OS === "android" ? verticalScale(8) : verticalScale(4),
        paddingBottom: verticalScale(14),
        gap: scale(10),
    },
    headerCenter: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(7),
    },
    headerLogoBadge: {
        width: verticalScale(22),
        height: verticalScale(22),
        borderRadius: radius._8,
        backgroundColor: "#14100B",
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.5)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    headerLogoImg: {
        width: verticalScale(16),
        height: verticalScale(16),
    },
    shareTopBtn: {
        width: verticalScale(38),
        height: verticalScale(38),
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.12)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    surfaceSheet: {
        flex: 1,
        borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30,
        overflow: "hidden",
    },
    scrollContent: {
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._17,
        paddingBottom: verticalScale(40),
        gap: verticalScale(12),
    },

    // Hero Card
    heroCardOuter: {
        borderRadius: radius._24,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 7,
    },
    heroCard: {
        borderRadius: radius._24,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: "rgba(250, 204, 21, 0.34)",
        gap: verticalScale(14),
        overflow: "hidden",
        position: "relative",
    },
    heroOrbTop: {
        position: "absolute",
        top: -scale(42),
        right: -scale(42),
        width: scale(140),
        height: scale(140),
        borderRadius: scale(70),
        backgroundColor: "rgba(250, 204, 21, 0.11)",
    },
    heroTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: scale(10),
    },
    heroBrandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
        flex: 1,
        minWidth: 0,
    },
    heroLogoBox: {
        width: verticalScale(44),
        height: verticalScale(44),
        borderRadius: radius._12,
        backgroundColor: "#14100B",
        borderWidth: 1.5,
        borderColor: "rgba(250,204,21,0.55)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
    },
    heroLogoImg: {
        width: verticalScale(31),
        height: verticalScale(31),
    },
    heroVersionPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.full,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        flexShrink: 0,
    },
    livePulseDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#16a34a",
    },
    heroCreatorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(13),
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: radius._20,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.22)",
    },
    heroPortraitGlow: {
        position: "absolute",
        top: -4,
        right: -4,
        bottom: -4,
        left: -4,
        borderRadius: radius._20,
        backgroundColor: "rgba(250,204,21,0.22)",
    },
    heroPortraitFrame: {
        width: scale(104),
        height: verticalScale(132),
        borderRadius: radius._20,
        padding: 2.5,
        flexShrink: 0,
    },
    heroPortraitInner: {
        width: "100%",
        height: "100%",
        borderRadius: radius._15,
        overflow: "hidden",
        backgroundColor: "#14120F",
        borderWidth: 1.5,
        borderColor: "rgba(18,16,13,0.9)",
    },
    heroPortraitImg: {
        width: "100%",
        height: "100%",
    },
    heroPortraitScrim: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: verticalScale(36),
    },
    heroVerifiedPill: {
        position: "absolute",
        left: 6,
        bottom: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "rgba(14,12,10,0.82)",
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    heroZoomPill: {
        position: "absolute",
        right: 6,
        bottom: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "rgba(14,12,10,0.8)",
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    heroCreatorDetails: {
        flex: 1,
        minWidth: 0,
        gap: verticalScale(5),
    },
    heroCreatorBadge: {
        backgroundColor: "rgba(250,204,21,0.14)",
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.34)",
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(3),
        borderRadius: radius.full,
    },
    heroMetaTagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(6),
        marginTop: verticalScale(2),
    },
    heroMetaTag: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2.5),
        borderRadius: radius.full,
    },
    photoModalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(8,7,6,0.9)",
        alignItems: "center",
        justifyContent: "center",
        padding: spacingX._20,
    },
    photoModalCard: {
        width: "100%",
        maxWidth: 390,
        aspectRatio: 1133 / 1432,
        borderRadius: radius._24,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: "#14120F",
    },
    photoModalImg: {
        width: "100%",
        height: "100%",
    },
    photoModalFooter: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingTop: verticalScale(34),
        paddingBottom: verticalScale(16),
        gap: scale(10),
    },
    photoModalClose: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.14)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.24)",
        alignItems: "center",
        justifyContent: "center",
    },
    thanksChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: colors.primary,
        paddingHorizontal: scale(7),
        paddingVertical: 1,
        borderRadius: radius.full,
    },
    heroActionRow: {
        flexDirection: "row",
        gap: scale(8),
        alignItems: "center",
    },
    heroActionBtnPrimary: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        backgroundColor: colors.primary,
        paddingVertical: verticalScale(10),
        borderRadius: radius._12,
    },
    heroActionBtnSecondary: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        backgroundColor: "rgba(255,255,255,0.11)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.22)",
        paddingVertical: verticalScale(10),
        borderRadius: radius._12,
    },
    heroCopyBtn: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius._12,
        backgroundColor: "rgba(255,255,255,0.11)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },

    // Metrics 2x2 Bento Grid
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(10),
    },
    metricTile: {
        width: "48%",
        flexGrow: 1,
        borderRadius: radius._17,
        padding: spacingX._12,
        gap: verticalScale(4),
    },
    metricTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: verticalScale(2),
    },
    metricIconWrap: {
        width: verticalScale(34),
        height: verticalScale(34),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    spotlightCard: {
        borderRadius: radius._17,
        borderWidth: 1,
        padding: spacingX._15,
        gap: verticalScale(5),
    },
    spotlightHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    // Haptics Demo
    hapticsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(8),
    },
    hapticChip: {
        flex: 1,
        minWidth: "17%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: verticalScale(9),
        paddingHorizontal: scale(4),
        borderRadius: radius._12,
        borderWidth: 1,
        gap: 3,
    },
    hapticsFooterBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: verticalScale(12),
        paddingTop: verticalScale(10),
        borderTopWidth: StyleSheet.hairlineWidth,
    },

    // Section Label & Cards
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._5,
        marginTop: verticalScale(6),
    },
    sectionLabelLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
    },
    sectionAccentBar: {
        width: 3.5,
        height: 12,
        borderRadius: 2,
        backgroundColor: colors.primary,
    },
    sectionLabel: {
        letterSpacing: 0.7,
    },
    card: {
        borderRadius: radius._20,
        borderWidth: 1,
        overflow: "hidden",
    },

    // Search & Filter Tabs & Features
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        borderRadius: radius._15,
        borderWidth: 1,
        paddingHorizontal: spacingX._12,
        paddingVertical: Platform.OS === "ios" ? verticalScale(9) : verticalScale(6),
    },
    searchInput: {
        flex: 1,
        fontSize: verticalScale(13),
        paddingVertical: 0,
    },
    filterTabsScroll: {
        gap: scale(8),
        paddingVertical: verticalScale(2),
    },
    filterTab: {
        paddingHorizontal: scale(13),
        paddingVertical: verticalScale(7),
        borderRadius: radius.full,
        borderWidth: 1,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: scale(12),
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(11),
    },
    featureEmojiBox: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius._12,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
    },
    featureTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
    },
    featureTipBox: {
        marginTop: verticalScale(4),
        backgroundColor: "rgba(250, 204, 21, 0.16)",
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: radius._8,
    },
    emptyFeatures: {
        padding: spacingY._20,
        alignItems: "center",
        gap: 6,
    },
    expandFeaturesBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        paddingVertical: verticalScale(12),
        borderTopWidth: StyleSheet.hairlineWidth,
    },

    // Tech Stack
    techGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: spacingX._12,
        gap: scale(8),
    },
    techPillCard: {
        width: "48%",
        flexGrow: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: scale(9),
        paddingHorizontal: spacingX._10,
        paddingVertical: verticalScale(9),
        borderRadius: radius._12,
        borderWidth: 1,
    },
    techIconBox: {
        width: verticalScale(32),
        height: verticalScale(32),
        borderRadius: radius._10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    techDetailBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(10),
        borderTopWidth: StyleSheet.hairlineWidth,
    },

    // Link Rows
    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(12),
        gap: scale(10),
    },
    linkRowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        flex: 1,
        minWidth: 0,
    },
    linkIconBadge: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius._10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },

    // Footer
    footer: {
        alignItems: "center",
        paddingTop: verticalScale(14),
        paddingBottom: verticalScale(10),
    },
});
