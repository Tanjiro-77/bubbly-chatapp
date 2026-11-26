import React from "react";
import {
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Icons from "phosphor-react-native";
import ScreenWrapper from "./ScreenWrapper";
import Typo from "./Typo";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";

export interface LegalHighlight {
    icon: "shield" | "lock" | "eye-slash" | "trash" | "check-circle" | "key";
    label: string;
    value: string;
}

export interface LegalSection {
    title: string;
    paragraphs?: string[];
    bullets?: string[];
}

export interface LegalDocumentViewProps {
    badgeLabel: string;
    title: string;
    subtitle: string;
    lastUpdated: string;
    highlights: LegalHighlight[];
    sections: LegalSection[];
    relatedLink: {
        title: string;
        subtitle: string;
        route: "/(legal)/privacyPolicy" | "/(legal)/security";
    };
    contactSubject: string;
    contactDescription: string;
}

export const SUPPORT_EMAIL = "arnavkhari.77@gmail.com";

const renderHighlightIcon = (icon: LegalHighlight["icon"]) => {
    const size = verticalScale(18);
    const color = colors.primaryDark;
    switch (icon) {
        case "shield":
            return <Icons.ShieldCheck size={size} color={color} weight="fill" />;
        case "lock":
            return <Icons.LockKey size={size} color={color} weight="fill" />;
        case "eye-slash":
            return <Icons.EyeSlash size={size} color={color} weight="fill" />;
        case "trash":
            return <Icons.Trash size={size} color={color} weight="fill" />;
        case "key":
            return <Icons.Key size={size} color={color} weight="fill" />;
        case "check-circle":
        default:
            return <Icons.CheckCircle size={size} color={color} weight="fill" />;
    }
};

/**
 * Shared layout for Bubbly's Play Store Privacy Policy and Security & Data Safety pages.
 */
const LegalDocumentView: React.FC<LegalDocumentViewProps> = ({
    badgeLabel,
    title,
    subtitle,
    lastUpdated,
    highlights,
    sections,
    relatedLink,
    contactSubject,
    contactDescription,
}) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const appVersion = Constants.expoConfig?.version ?? "3.4.0";

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(auth)/login");
        }
    };

    const handleContact = async () => {
        const mailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(contactSubject)}`;
        try {
            const supported = await Linking.canOpenURL(mailUrl);
            if (supported) {
                await Linking.openURL(mailUrl);
            }
        } catch (_) {
            // Do not crash if no mail client is installed
        }
    };

    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.35}>
            <View style={styles.container}>
                {/* ── Dark Hero Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Icons.CaretLeft
                            size={verticalScale(22)}
                            color={colors.white}
                            weight="bold"
                        />
                    </TouchableOpacity>

                    <View style={styles.headerBadge}>
                        <Icons.ShieldCheck
                            size={verticalScale(13)}
                            color={colors.neutral900}
                            weight="fill"
                        />
                        <Typo size={11} fontWeight="800" color={colors.neutral900}>
                            {badgeLabel}
                        </Typo>
                    </View>

                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.heroTextBlock}>
                    <Typo size={26} fontWeight="800" color={colors.white}>
                        {title}
                    </Typo>
                    <Typo
                        size={13}
                        color="rgba(255,255,255,0.7)"
                        style={styles.heroSubtitle}
                    >
                        {subtitle}
                    </Typo>
                    <Typo size={11.5} fontWeight="600" color={colors.primary}>
                        Effective: {lastUpdated} · Bubbly v{appVersion}
                    </Typo>
                </View>

                {/* ── White Sheet Content ── */}
                <View style={styles.sheet}>
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._15 },
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Highlights grid */}
                        <View style={styles.highlightsGrid}>
                            {highlights.map((item, idx) => (
                                <View key={idx} style={styles.highlightCard}>
                                    <View style={styles.highlightIconBox}>
                                        {renderHighlightIcon(item.icon)}
                                    </View>
                                    <Typo
                                        size={11}
                                        fontWeight="600"
                                        color={colors.neutral500}
                                    >
                                        {item.label}
                                    </Typo>
                                    <Typo
                                        size={13}
                                        fontWeight="700"
                                        color={colors.neutral900}
                                    >
                                        {item.value}
                                    </Typo>
                                </View>
                            ))}
                        </View>

                        {/* Policy Sections */}
                        {sections.map((section, idx) => (
                            <View key={idx} style={styles.sectionCard}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionIndexBadge}>
                                        <Typo
                                            size={11}
                                            fontWeight="800"
                                            color={colors.primaryDark}
                                        >
                                            {String(idx + 1).padStart(2, "0")}
                                        </Typo>
                                    </View>
                                    <Typo
                                        size={15.5}
                                        fontWeight="700"
                                        color={colors.neutral900}
                                        style={styles.sectionTitle}
                                    >
                                        {section.title}
                                    </Typo>
                                </View>

                                {section.paragraphs?.map((paragraph, pIdx) => (
                                    <Typo
                                        key={pIdx}
                                        size={13.5}
                                        color={colors.neutral600}
                                        style={styles.paragraph}
                                    >
                                        {paragraph}
                                    </Typo>
                                ))}

                                {section.bullets && section.bullets.length > 0 && (
                                    <View style={styles.bulletList}>
                                        {section.bullets.map((bullet, bIdx) => (
                                            <View key={bIdx} style={styles.bulletRow}>
                                                <View style={styles.bulletDot} />
                                                <Typo
                                                    size={13}
                                                    color={colors.neutral700}
                                                    style={styles.bulletText}
                                                >
                                                    {bullet}
                                                </Typo>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}

                        {/* Cross-navigation Card */}
                        <TouchableOpacity
                            style={styles.relatedCard}
                            activeOpacity={0.75}
                            onPress={() => router.replace(relatedLink.route as any)}
                        >
                            <View style={styles.relatedIconBox}>
                                <Icons.FileText
                                    size={verticalScale(20)}
                                    color={colors.primaryDark}
                                    weight="fill"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Typo size={14} fontWeight="700" color={colors.neutral900}>
                                    {relatedLink.title}
                                </Typo>
                                <Typo size={12} color={colors.neutral500}>
                                    {relatedLink.subtitle}
                                </Typo>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(18)}
                                color={colors.neutral400}
                                weight="bold"
                            />
                        </TouchableOpacity>

                        {/* Contact & Data Rights Card */}
                        <View style={styles.contactCard}>
                            <Typo size={14.5} fontWeight="700" color={colors.neutral900}>
                                Questions or Data Requests?
                            </Typo>
                            <Typo size={12.5} color={colors.neutral600} style={styles.contactDesc}>
                                {contactDescription}
                            </Typo>
                            <TouchableOpacity
                                style={styles.contactBtn}
                                activeOpacity={0.8}
                                onPress={handleContact}
                            >
                                <Icons.EnvelopeSimple
                                    size={verticalScale(16)}
                                    color={colors.white}
                                    weight="bold"
                                />
                                <Typo size={13} fontWeight="700" color={colors.white}>
                                    Email {SUPPORT_EMAIL}
                                </Typo>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Typo size={11.5} color={colors.neutral400}>
                                Bubbly · Package com.arnav5569.chat · Developed by Arnav
                            </Typo>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </ScreenWrapper>
    );
};

export default LegalDocumentView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._20,
        paddingTop: Platform.OS === "android" ? spacingY._10 : spacingY._6,
    },
    backBtn: {
        width: scale(36),
        height: scale(36),
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(5),
        backgroundColor: colors.primary,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
    },
    headerSpacer: {
        width: scale(36),
    },
    heroTextBlock: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        paddingBottom: spacingY._18,
        gap: verticalScale(4),
    },
    heroSubtitle: {
        lineHeight: verticalScale(18),
    },
    sheet: {
        flex: 1,
        backgroundColor: colors.neutral100,
        borderTopLeftRadius: radius._35,
        borderTopRightRadius: radius._35,
        borderCurve: "continuous",
        overflow: "hidden",
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._20,
        paddingBottom: spacingY._35,
        gap: spacingY._15,
    },
    highlightsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(10),
    },
    highlightCard: {
        flexBasis: "47%",
        flexGrow: 1,
        minWidth: 0,
        backgroundColor: colors.white,
        borderRadius: radius._15,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: verticalScale(3),
    },
    highlightIconBox: {
        width: scale(30),
        height: scale(30),
        borderRadius: radius._8,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: verticalScale(2),
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: radius._18,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: spacingY._8,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
    },
    sectionIndexBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(3),
        borderRadius: radius._8,
    },
    sectionTitle: {
        flex: 1,
    },
    paragraph: {
        lineHeight: verticalScale(20),
    },
    bulletList: {
        gap: verticalScale(6),
        marginTop: verticalScale(2),
    },
    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: scale(8),
    },
    bulletDot: {
        width: scale(6),
        height: scale(6),
        borderRadius: scale(3),
        backgroundColor: colors.primary,
        marginTop: verticalScale(7),
    },
    bulletText: {
        flex: 1,
        lineHeight: verticalScale(19),
    },
    relatedCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        backgroundColor: colors.white,
        borderRadius: radius._15,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: colors.primary + "55",
    },
    relatedIconBox: {
        width: scale(38),
        height: scale(38),
        borderRadius: radius._12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    contactCard: {
        backgroundColor: colors.primaryLight + "66",
        borderRadius: radius._18,
        padding: spacingX._15,
        borderWidth: 1,
        borderColor: colors.primary + "44",
        gap: spacingY._8,
    },
    contactDesc: {
        lineHeight: verticalScale(18),
    },
    contactBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(8),
        backgroundColor: colors.neutral900,
        borderRadius: radius._12,
        paddingVertical: verticalScale(11),
        marginTop: verticalScale(2),
    },
    footer: {
        alignItems: "center",
        paddingTop: spacingY._6,
    },
});
