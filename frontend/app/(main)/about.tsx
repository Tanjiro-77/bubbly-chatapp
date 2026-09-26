import React from "react";
import {
    View,
    ScrollView,
    Image,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useColorScheme } from "react-native";
import * as SimpleIcons from "simple-icons";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import BrandIcon from "../../components/BrandIcon";
import { scale, verticalScale } from "../../utils/styling";

// ─── Placeholder URLs — REPLACE THESE ───────────────────────────────────────
const GITHUB_URL = "https://github.com/Tanjiro-77/bubbly-chatapp";
const BUG_REPORT_URL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Bug%20Report&body=Describe%20the%20bug%20you%20encountered%3A%0A%0A";

const FEEDBACK_EMAIL =
    "mailto:arnavkhari.77@gmail.com?subject=Bubbly%20Feedback&body=Hi%20Arnav%2C%0A%0A";
// ─────────────────────────────────────────────────────────────────────────────

const APP_VERSION: string = Constants.expoConfig?.version ?? "1.2.5";

interface TechItem {
    label: string;
    iconKey: string;
    fallbackEmoji: string;
    fallbackColor: string;
}

const TECH_STACK: TechItem[] = [
    { label: "React Native", iconKey: "siReact", fallbackEmoji: "⚛️", fallbackColor: "61DAFB" },
    { label: "Expo", iconKey: "siExpo", fallbackEmoji: "🔷", fallbackColor: "000020" },
    { label: "Express", iconKey: "siExpress", fallbackEmoji: "🚀", fallbackColor: "000000" },
    { label: "Socket.IO", iconKey: "siSocketdotio", fallbackEmoji: "⚡", fallbackColor: "010101" },
    { label: "MongoDB", iconKey: "siMongodb", fallbackEmoji: "🍃", fallbackColor: "47A248" },
    { label: "Agora", iconKey: "siAgora", fallbackEmoji: "📡", fallbackColor: "099DFD" },
    { label: "Cloudinary", iconKey: "siCloudinary", fallbackEmoji: "☁️", fallbackColor: "3448C5" },
];

const openLink = async (url: string) => {
    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        }
    } catch (_) {
        // silently fail — do not crash the app
    }
};

const getIcon = (key: string) => (SimpleIcons as any)[key];

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionLabelProps {
    label: string;
    isDark: boolean;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ label, isDark }) => (
    <Typo
        size={12}
        fontWeight="600"
        color={isDark ? colors.neutral500 : colors.neutral400}
        style={styles.sectionLabel}
    >
        {label.toUpperCase()}
    </Typo>
);

interface SectionCardProps {
    children: React.ReactNode;
    isDark: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, isDark }) => (
    <View
        style={[
            styles.card,
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
    icon?: React.ReactNode;
    label: string;
    url: string;
    isDark: boolean;
    isLast?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({
    icon,
    label,
    url,
    isDark,
    isLast = false,
}) => (
    <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => openLink(url)}
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
                        backgroundColor: isDark ? colors.neutral700 : colors.neutral100,
                        borderColor: isDark ? colors.neutral600 : colors.neutral200,
                    },
                ]}
            >
                {icon}
            </View>
            <Typo
                size={14.5}
                fontWeight="500"
                color={isDark ? colors.neutral100 : colors.neutral800}
            >
                {label}
            </Typo>
        </View>
        <Typo size={18} color={isDark ? colors.neutral600 : colors.neutral350}>
            ›
        </Typo>
    </TouchableOpacity>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AboutScreen() {
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === "dark";

    const pageBg = isDark ? colors.neutral900 : colors.neutral100;
    const primaryTextColor = isDark ? colors.white : colors.neutral900;
    const subtleTextColor = isDark ? colors.neutral400 : colors.neutral500;

    return (
        <ScreenWrapper>
            {/* ── Header ── */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: pageBg,
                        borderBottomColor: isDark
                            ? colors.neutral800
                            : colors.neutral200,
                    },
                ]}
            >
                <BackButton color={colors.black} />
                <Typo
                    size={16}
                    fontWeight="600"
                    color={primaryTextColor}
                    style={styles.headerTitle}
                >
                    About
                </Typo>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={{ backgroundColor: pageBg }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Profile Card ── */}
                <View
                    style={[
                        styles.profileCard,
                        {
                            backgroundColor: isDark ? colors.neutral800 : colors.white,
                            borderColor: isDark ? colors.neutral700 : colors.neutral200,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.avatarRing,
                            { borderColor: isDark ? colors.neutral700 : colors.neutral200 },
                        ]}
                    >
                        <Image
                            source={require("@/assets/images/developer-photo.png")}
                            style={styles.avatar}
                            resizeMode="cover"
                        />
                    </View>

                    <Typo
                        size={19}
                        fontWeight="700"
                        color={primaryTextColor}
                        style={styles.devName}
                    >
                        Arnav
                    </Typo>
                    <Typo
                        size={12.5}
                        fontWeight="600"
                        color={colors.primaryDark}
                        style={styles.devTitle}
                    >
                        CREATOR & DEVELOPER OF BUBBLY
                    </Typo>
                    <Typo size={12} color={subtleTextColor} style={styles.devSubtitle}>
                        Student Developer
                    </Typo>

                    <View
                        style={[
                            styles.divider,
                            { backgroundColor: isDark ? colors.neutral700 : colors.neutral200 },
                        ]}
                    />

                    <View style={styles.appRow}>
                        <Typo
                            size={14}
                            fontWeight="700"
                            color={primaryTextColor}
                        >
                            Bubbly
                        </Typo>
                        <View
                            style={[
                                styles.versionBadge,
                                {
                                    backgroundColor: isDark
                                        ? colors.neutral700
                                        : colors.neutral100,
                                    borderColor: isDark
                                        ? colors.neutral600
                                        : colors.neutral200,
                                },
                            ]}
                        >
                            <Typo
                                size={11}
                                fontWeight="600"
                                color={subtleTextColor}
                            >
                                v{APP_VERSION}
                            </Typo>
                        </View>
                    </View>
                </View>

                {/* ── About Bubbly ── */}
                <SectionLabel label="About" isDark={isDark} />
                <SectionCard isDark={isDark}>
                    <Typo
                        size={13.5}
                        color={isDark ? colors.neutral300 : colors.neutral600}
                        style={styles.aboutText}
                    >
                        Bubbly is a real-time communication app built for seamless
                        connection. Send messages, share Stories, and jump into voice or
                        video calls — all in one place. Built with modern mobile
                        technology, Bubbly keeps your conversations fast, clear, and
                        personal.
                    </Typo>
                </SectionCard>

                {/* ── Built With ── */}
                <SectionLabel label="Built With" isDark={isDark} />
                <SectionCard isDark={isDark}>
                    <View style={styles.techGrid}>
                        {TECH_STACK.map((tech) => {
                            const iconData = getIcon(tech.iconKey);
                            return (
                                <View key={tech.label} style={styles.techItem}>
                                    <View
                                        style={[
                                            styles.techIconBox,
                                            {
                                                backgroundColor: isDark
                                                    ? colors.neutral700
                                                    : colors.neutral100,
                                                borderColor: isDark
                                                    ? colors.neutral600
                                                    : colors.neutral200,
                                            },
                                        ]}
                                    >
                                        <BrandIcon
                                            icon={iconData}
                                            fallbackEmoji={tech.fallbackEmoji}
                                            size={20}
                                        />
                                    </View>
                                    <Typo
                                        size={10.5}
                                        fontWeight="500"
                                        color={isDark ? colors.neutral400 : colors.neutral500}
                                        style={styles.techLabel}
                                    >
                                        {tech.label}
                                    </Typo>
                                </View>
                            );
                        })}
                    </View>
                </SectionCard>

                {/* ── Links ── */}
                <SectionLabel label="Developer" isDark={isDark} />
                <SectionCard isDark={isDark}>
                    <LinkRow
                        icon={
                            <BrandIcon
                                icon={getIcon("siGithub")}
                                fallbackEmoji="🐙"
                                size={16}
                                monochrome={isDark ? colors.neutral200 : colors.neutral700}
                            />
                        }
                        label="GitHub"
                        url={GITHUB_URL}
                        isDark={isDark}
                    />
                    <LinkRow
                        icon={
                            <Typo size={15} color={isDark ? colors.neutral200 : colors.neutral700}>
                                🐛
                            </Typo>
                        }
                        label="Report a Bug"
                        url={BUG_REPORT_URL}
                        isDark={isDark}
                    />
                    <LinkRow
                        icon={
                            <Typo size={15} color={isDark ? colors.neutral200 : colors.neutral700}>
                                ✉️
                            </Typo>
                        }
                        label="Send Feedback"
                        url={FEEDBACK_EMAIL}
                        isDark={isDark}
                        isLast
                    />
                </SectionCard>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <Typo size={11.5} color={subtleTextColor}>
                        © 2026 Bubbly · Built by Arnav
                    </Typo>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = scale(76);
const AVATAR_RING = AVATAR_SIZE + scale(6);

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingTop:
            Platform.OS === "android" ? verticalScale(8) : verticalScale(4),
        paddingBottom: verticalScale(10),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
    },
    headerSpacer: {
        width: scale(36),
    },

    scrollContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._20,
        paddingBottom: spacingY._40,
    },

    // Profile card
    profileCard: {
        alignItems: "center",
        borderRadius: radius._15,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: spacingY._25,
        paddingHorizontal: spacingX._20,
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
    avatarRing: {
        width: AVATAR_RING,
        height: AVATAR_RING,
        borderRadius: AVATAR_RING / 2,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacingY._12,
        overflow: "hidden",
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    devName: {
        marginBottom: verticalScale(4),
    },
    devTitle: {
        letterSpacing: 0.6,
        marginBottom: verticalScale(4),
    },
    devSubtitle: {
        marginBottom: spacingY._17,
    },
    divider: {
        width: "100%",
        height: StyleSheet.hairlineWidth,
        marginBottom: spacingY._15,
    },
    appRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
    },
    versionBadge: {
        paddingVertical: verticalScale(3),
        paddingHorizontal: scale(8),
        borderRadius: radius._6,
        borderWidth: 1,
    },

    // Section label
    sectionLabel: {
        marginTop: spacingY._20,
        marginBottom: spacingY._8,
        marginLeft: spacingX._4,
        letterSpacing: 0.6,
    },

    // Card
    card: {
        borderRadius: radius._15,
        borderWidth: StyleSheet.hairlineWidth,
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

    aboutText: {
        lineHeight: verticalScale(21),
        padding: spacingX._15,
    },

    // Tech grid
    techGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: spacingX._15,
        justifyContent: "flex-start",
    },
    techItem: {
        alignItems: "center",
        width: "25%",
        marginBottom: spacingY._15,
    },
    techIconBox: {
        width: scale(42),
        height: scale(42),
        borderRadius: radius._12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        marginBottom: verticalScale(6),
    },
    techLabel: {
        textAlign: "center",
        lineHeight: verticalScale(13),
    },

    // Link rows
    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: verticalScale(12),
        paddingHorizontal: spacingX._15,
        minHeight: verticalScale(54),
    },
    linkRowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
    },
    linkIconBadge: {
        width: scale(32),
        height: scale(32),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },

    // Footer
    footer: {
        alignItems: "center",
        marginTop: spacingY._30,
        paddingBottom: spacingY._10,
    },
});