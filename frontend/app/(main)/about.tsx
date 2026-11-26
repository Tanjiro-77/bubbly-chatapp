import React, { useMemo, useState } from "react";
import {
    View,
    ScrollView,
    Image,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Platform,
    Share,
    useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as SimpleIcons from "simple-icons";
import * as Icons from "phosphor-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import BrandIcon from "../../components/BrandIcon";
import { scale, verticalScale } from "../../utils/styling";
import { hapticTap } from "../../utils/haptics";

const GITHUB_URL = "https://github.com/Tanjiro-77/bubbly-chatapp";
const BUG_REPORT_URL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20v4.0.2%20Bug%20Report&body=Describe%20the%20bug%20you%20encountered%3A%0A%0A";
const FEEDBACK_EMAIL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20v4.0.2%20Feedback&body=Hi%20Arnav%2C%0A%0A";

const APP_VERSION: string = Constants.expoConfig?.version ?? "4.0.2";

interface TechItem {
    label: string;
    role: string;
    iconKey: string;
    fallbackEmoji: string;
}

const TECH_STACK: TechItem[] = [
    { label: "React Native", role: "Mobile UI", iconKey: "siReact", fallbackEmoji: "⚛️" },
    { label: "Expo SDK", role: "Native Runtime", iconKey: "siExpo", fallbackEmoji: "🔷" },
    { label: "Express", role: "REST API", iconKey: "siExpress", fallbackEmoji: "🚀" },
    { label: "Socket.IO", role: "Live Engine", iconKey: "siSocketdotio", fallbackEmoji: "⚡" },
    { label: "MongoDB", role: "Persistence", iconKey: "siMongodb", fallbackEmoji: "🍃" },
    { label: "Agora RTC", role: "HD Calls", iconKey: "siAgora", fallbackEmoji: "📡" },
    { label: "Cloudinary", role: "Media CDN", iconKey: "siCloudinary", fallbackEmoji: "☁️" },
];

type FeatureCategory = "all" | "messaging" | "productivity" | "privacy" | "media";

interface FlagshipFeature {
    id: number;
    title: string;
    subtitle: string;
    category: Exclude<FeatureCategory, "all">;
    emoji: string;
}

const FLAGSHIP_FEATURES: FlagshipFeature[] = [
    { id: 1, title: "Quick Formatting Toolbar", subtitle: "Bold, italic, strike, inline code & > blockquotes", category: "messaging", emoji: "✍️" },
    { id: 2, title: "Slash Command Quick Replies", subtitle: "Type / for instant reusable reply templates", category: "productivity", emoji: "⚡" },
    { id: 3, title: "Bulk Multi-Select Dock", subtitle: "Copy, star, or delete multiple messages at once", category: "productivity", emoji: "☑️" },
    { id: 4, title: "Silent Send Mode", subtitle: "Long-press Send to deliver without alert chimes", category: "messaging", emoji: "🔕" },
    { id: 5, title: "Message Reminder Alarms", subtitle: "Schedule OS alerts on important chat messages", category: "productivity", emoji: "⏰" },
    { id: 6, title: "Interactive Smart Chips", subtitle: "1-tap @mentions, phone numbers, URLs & emails", category: "messaging", emoji: "🔗" },
    { id: 7, title: "Shared Checklist Cards", subtitle: "Collaborative live to-do lists inside any thread", category: "productivity", emoji: "✅" },
    { id: 8, title: "Icebreaker Mini-Games", subtitle: "Roll Dice, flip Coins, Magic 8-Ball & RPS live", category: "media", emoji: "🎲" },
    { id: 9, title: "Multi-Pinned Carousel", subtitle: "Cycle pinned announcements & jump right to them", category: "messaging", emoji: "📌" },
    { id: 10, title: "Live Countdown Stickers", subtitle: "Animated event timers directly inside chats", category: "media", emoji: "⏳" },
    { id: 11, title: "Chat Archive Vault", subtitle: "Declutter home feed into a collapsible archive", category: "productivity", emoji: "🗄️" },
    { id: 12, title: "Smart Chat Folders", subtitle: "Filter Work, Friends, Family, VIP & Unread chats", category: "productivity", emoji: "🗂️" },
    { id: 13, title: "Private Nicknames & Notes", subtitle: "Per-contact aliases & scratchpad notes stored locally", category: "privacy", emoji: "📝" },
    { id: 14, title: "In-Chat Insights", subtitle: "Live message counts, top senders & media breakdown", category: "productivity", emoji: "📊" },
    { id: 15, title: "Custom Activity Status", subtitle: "Emoji + live status line visible on your chats", category: "messaging", emoji: "🎧" },
    { id: 16, title: "Focus Quiet Mode", subtitle: "Timed Do-Not-Disturb suppressing foreground pings", category: "privacy", emoji: "🌙" },
    { id: 17, title: "Bubble Corner Studio", subtitle: "Pill, Classic & Sharp corners plus font scaling", category: "media", emoji: "🎨" },
    { id: 18, title: "Privacy Notification Shield", subtitle: "Mask sender & message previews on banners", category: "privacy", emoji: "🛡️" },
    { id: 19, title: "Story Studio Typography", subtitle: "7 gradient presets, fonts & mood stickers", category: "media", emoji: "✨" },
    { id: 20, title: "Quick Jump & Offline Outbox", subtitle: "Instant chat switcher & resilient send queue", category: "messaging", emoji: "🚀" },
];

const CATEGORY_TABS: { key: FeatureCategory; label: string }[] = [
    { key: "all", label: "All (20)" },
    { key: "messaging", label: "Messaging" },
    { key: "productivity", label: "Productivity" },
    { key: "privacy", label: "Privacy" },
    { key: "media", label: "Media" },
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
        <Typo
            size={11.5}
            fontWeight="800"
            color={isDark ? colors.neutral400 : colors.neutral500}
            style={styles.sectionLabel}
            textProps={{ numberOfLines: 1 }}
        >
            {label.toUpperCase()}
        </Typo>
        {rightHint ? (
            <Typo size={11} fontWeight="600" color={colors.primaryDark} textProps={{ numberOfLines: 1 }}>
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
    const [showAllFeatures, setShowAllFeatures] = useState(false);

    const pageBg = isDark ? colors.neutral900 : colors.neutral100;
    const primaryTextColor = isDark ? colors.white : colors.neutral900;
    const subtleTextColor = isDark ? colors.neutral400 : colors.neutral500;

    const filteredFeatures = useMemo(() => {
        if (selectedCat === "all") return FLAGSHIP_FEATURES;
        return FLAGSHIP_FEATURES.filter((f) => f.category === selectedCat);
    }, [selectedCat]);

    const visibleFeatures = useMemo(() => {
        if (selectedCat !== "all" || showAllFeatures) return filteredFeatures;
        return filteredFeatures.slice(0, 8);
    }, [filteredFeatures, selectedCat, showAllFeatures]);

    const handleShareApp = async () => {
        hapticTap("medium");
        try {
            await Share.share({
                message: `Check out Bubbly v${APP_VERSION} — real-time messaging, Agora HD voice & video calls, Story Studio, and 20 flagship chat tools built by Arnav: ${GITHUB_URL}`,
            });
        } catch (_) {}
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
                    <Typo size={17} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                        About Bubbly
                    </Typo>
                    <Typo size={11} fontWeight="600" color="rgba(255,255,255,0.6)" textProps={{ numberOfLines: 1 }}>
                        Release v{APP_VERSION} · Flagship Edition
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
                >
                    {/* ── Hero Obsidian Brand & Creator Spotlight Card ── */}
                    <Animated.View entering={FadeInDown.duration(420).springify()} style={styles.heroCard}>
                        <View style={styles.heroTopRow}>
                            <View style={styles.heroBrandRow}>
                                <View style={styles.heroLogoBox}>
                                    <Icons.ChatsCircle size={verticalScale(22)} color={colors.neutral900} weight="fill" />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Typo size={18} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                        Bubbly
                                    </Typo>
                                    <Typo size={11.5} fontWeight="500" color="rgba(255,255,255,0.68)" textProps={{ numberOfLines: 1 }}>
                                        Connect Beyond Messages
                                    </Typo>
                                </View>
                            </View>
                            <View style={styles.heroVersionPill}>
                                <Icons.Sparkle size={12} color={colors.neutral900} weight="fill" />
                                <Typo size={11} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                    v{APP_VERSION}
                                </Typo>
                            </View>
                        </View>

                        <View style={styles.heroCreatorRow}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => hapticTap("success")}
                                style={styles.heroAvatarRing}
                            >
                                <Image
                                    source={require("@/assets/images/developer-photo.png")}
                                    style={styles.heroAvatar}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                            <View style={{ flex: 1, minWidth: 0, gap: verticalScale(3) }}>
                                <Typo size={17} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                    Arnav Khari
                                </Typo>
                                <Typo size={11.5} fontWeight="700" color={colors.primary} textProps={{ numberOfLines: 1 }}>
                                    CREATOR & FULL-STACK ENGINEER
                                </Typo>
                                <Typo size={12} color="rgba(255,255,255,0.72)" textProps={{ numberOfLines: 2 }}>
                                    Crafted from socket layer to pixels for instant chat, HD calls & tactile speed.
                                </Typo>
                            </View>
                        </View>

                        {/* ── Hero Quick Action Pills ── */}
                        <View style={styles.heroActionRow}>
                            <TouchableOpacity
                                style={styles.heroActionBtnPrimary}
                                activeOpacity={0.8}
                                onPress={() => {
                                    hapticTap("medium");
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
                                activeOpacity={0.8}
                                onPress={() => {
                                    hapticTap("medium");
                                    openLink(BUG_REPORT_URL);
                                }}
                            >
                                <Icons.Bug size={14} color={colors.white} weight="bold" />
                                <Typo size={12} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                    Report Bug
                                </Typo>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* ── 2x2 Architecture Highlight Tiles ── */}
                    <Animated.View entering={FadeInUp.duration(460).delay(60).springify()} style={styles.metricsGrid}>
                        <View style={[styles.metricTile, { backgroundColor: isDark ? colors.neutral800 : colors.white, borderColor: isDark ? colors.neutral700 : colors.neutral200 }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: "#fef3c7" }]}>
                                <Icons.RocketLaunch size={verticalScale(16)} color="#b45309" weight="fill" />
                            </View>
                            <Typo size={16} fontWeight="800" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>20+ Tools</Typo>
                            <Typo size={11} color={subtleTextColor} textProps={{ numberOfLines: 1 }}>Flagship Suite</Typo>
                        </View>

                        <View style={[styles.metricTile, { backgroundColor: isDark ? colors.neutral800 : colors.white, borderColor: isDark ? colors.neutral700 : colors.neutral200 }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: "#dcfce7" }]}>
                                <Icons.PhoneCall size={verticalScale(16)} color="#15803d" weight="fill" />
                            </View>
                            <Typo size={16} fontWeight="800" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>Agora HD</Typo>
                            <Typo size={11} color={subtleTextColor} textProps={{ numberOfLines: 1 }}>Voice & Video</Typo>
                        </View>

                        <View style={[styles.metricTile, { backgroundColor: isDark ? colors.neutral800 : colors.white, borderColor: isDark ? colors.neutral700 : colors.neutral200 }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: "#dbeafe" }]}>
                                <Icons.Lightning size={verticalScale(16)} color="#1d4ed8" weight="fill" />
                            </View>
                            <Typo size={16} fontWeight="800" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>Real-Time</Typo>
                            <Typo size={11} color={subtleTextColor} textProps={{ numberOfLines: 1 }}>Socket + Push</Typo>
                        </View>

                        <View style={[styles.metricTile, { backgroundColor: isDark ? colors.neutral800 : colors.white, borderColor: isDark ? colors.neutral700 : colors.neutral200 }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: "#fae8ff" }]}>
                                <Icons.ShieldCheck size={verticalScale(16)} color="#9333ea" weight="fill" />
                            </View>
                            <Typo size={16} fontWeight="800" color={primaryTextColor} textProps={{ numberOfLines: 1 }}>Protected</Typo>
                            <Typo size={11} color={subtleTextColor} textProps={{ numberOfLines: 1 }}>Biometric Vault</Typo>
                        </View>
                    </Animated.View>

                    {/* ── About Mission ── */}
                    <SectionLabel label="Vision & Release Notes" isDark={isDark} />
                    <SectionCard isDark={isDark}>
                        <Typo
                            size={13.5}
                            color={isDark ? colors.neutral200 : colors.neutral700}
                            style={styles.aboutText}
                        >
                            Bubbly v{APP_VERSION} unifies resilient real-time Socket.IO messaging, native high-priority notifications, Agora HD audio & video calling, Story Studio, collaborative checklists, and deep tactile haptics in one focused app with zero ads or trackers.
                        </Typo>
                    </SectionCard>

                    {/* ── Interactive What's New Explorer ── */}
                    <SectionLabel
                        label={`What's New in v${APP_VERSION}`}
                        rightHint={`${filteredFeatures.length} features`}
                        isDark={isDark}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterTabsScroll}
                    >
                        {CATEGORY_TABS.map((tab) => {
                            const active = selectedCat === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        hapticTap("light");
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
                                        {tab.label}
                                    </Typo>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <SectionCard isDark={isDark} noPadding>
                        {visibleFeatures.map((feat, idx) => {
                            const isLastItem = idx === visibleFeatures.length - 1 && (selectedCat !== "all" || showAllFeatures);
                            return (
                                <View
                                    key={feat.id}
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
                                        <Typo size={16}>{feat.emoji}</Typo>
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
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
                                        </View>
                                        <Typo
                                            size={11.5}
                                            color={subtleTextColor}
                                            textProps={{ numberOfLines: 2 }}
                                        >
                                            {feat.subtitle}
                                        </Typo>
                                    </View>
                                </View>
                            );
                        })}

                        {selectedCat === "all" && !showAllFeatures && (
                            <TouchableOpacity
                                style={[
                                    styles.expandFeaturesBtn,
                                    { borderTopColor: isDark ? colors.neutral700 : colors.neutral200 },
                                ]}
                                activeOpacity={0.75}
                                onPress={() => {
                                    hapticTap("medium");
                                    setShowAllFeatures(true);
                                }}
                            >
                                <Typo size={12.5} fontWeight="800" color={colors.primaryDark}>
                                    Show All 20 Features
                                </Typo>
                                <Icons.CaretDown size={14} color={colors.primaryDark} weight="bold" />
                            </TouchableOpacity>
                        )}
                        {selectedCat === "all" && showAllFeatures && (
                            <TouchableOpacity
                                style={[
                                    styles.expandFeaturesBtn,
                                    { borderTopColor: isDark ? colors.neutral700 : colors.neutral200 },
                                ]}
                                activeOpacity={0.75}
                                onPress={() => {
                                    hapticTap("light");
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
                    <SectionLabel label="Architecture Stack" isDark={isDark} />
                    <SectionCard isDark={isDark} noPadding>
                        <View style={styles.techGrid}>
                            {TECH_STACK.map((tech) => {
                                const iconData = getIcon(tech.iconKey);
                                return (
                                    <TouchableOpacity
                                        key={tech.label}
                                        activeOpacity={0.75}
                                        onPress={() => hapticTap("light")}
                                        style={[
                                            styles.techPillCard,
                                            {
                                                backgroundColor: isDark ? colors.neutral900 : colors.neutral50,
                                                borderColor: isDark ? colors.neutral700 : colors.neutral200,
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
                            label="Report a Bug"
                            subtitle="Send diagnostics straight to Arnav"
                            url={BUG_REPORT_URL}
                            isDark={isDark}
                        />
                        <LinkRow
                            icon={<Icons.EnvelopeSimple size={16} color="#b45309" weight="bold" />}
                            iconBg={isDark ? "rgba(245,158,11,0.18)" : "#fef3c7"}
                            label="Send Feedback"
                            subtitle="Feature requests & UI ideas"
                            url={FEEDBACK_EMAIL}
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
                            Bubbly v{APP_VERSION} · Build {Platform.OS === "android" ? "7" : "6"}
                        </Typo>
                        <Typo size={11} color={subtleTextColor} style={{ marginTop: 2 }}>
                            © 2026 Bubbly · Designed & Built by Arnav
                        </Typo>
                    </View>
                </ScrollView>
            </View>
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
    heroCard: {
        backgroundColor: "#181412",
        borderRadius: radius._24,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.28)",
        gap: verticalScale(14),
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
        elevation: 6,
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
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius._12,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    heroVersionPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.full,
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(4),
        flexShrink: 0,
    },
    heroCreatorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: radius._17,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    heroAvatarRing: {
        width: verticalScale(58),
        height: verticalScale(58),
        borderRadius: radius.full,
        padding: 2.5,
        backgroundColor: colors.primary,
        flexShrink: 0,
    },
    heroAvatar: {
        width: "100%",
        height: "100%",
        borderRadius: radius.full,
    },
    heroActionRow: {
        flexDirection: "row",
        gap: scale(10),
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
        borderColor: "rgba(255,255,255,0.2)",
        paddingVertical: verticalScale(10),
        borderRadius: radius._12,
    },

    // Metrics 2x2 Grid
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(10),
    },
    metricTile: {
        width: "48%",
        flexGrow: 1,
        borderRadius: radius._17,
        borderWidth: 1,
        padding: spacingX._12,
        gap: verticalScale(4),
    },
    metricIconWrap: {
        width: verticalScale(32),
        height: verticalScale(32),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: verticalScale(2),
    },

    // Section Label & Cards
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._5,
        marginTop: verticalScale(6),
    },
    sectionLabel: {
        letterSpacing: 0.7,
    },
    card: {
        borderRadius: radius._20,
        borderWidth: 1,
        overflow: "hidden",
    },
    aboutText: {
        lineHeight: verticalScale(20),
    },

    // Filter Tabs & Features
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
        alignItems: "center",
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
    },
    featureTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(6),
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
