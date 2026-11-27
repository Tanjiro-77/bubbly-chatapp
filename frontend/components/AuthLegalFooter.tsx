import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import Typo from "./Typo";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";

interface AuthLegalFooterProps {
    variant?: "light" | "dark";
    actionLabel?: string;
}

/**
 * Compact legal links strip displayed on auth screens (Welcome, Login, Register)
 * so users and Play Store reviewers can inspect Privacy Policy and Security before signing in.
 */
const AuthLegalFooter: React.FC<AuthLegalFooterProps> = ({
    variant = "light",
    actionLabel = "By continuing, you agree to our",
}) => {
    const router = useRouter();
    const isDark = variant === "dark";

    const mutedColor = isDark ? "rgba(255,255,255,0.55)" : colors.neutral500;
    const chipBg = isDark ? "rgba(255,255,255,0.08)" : colors.neutral100;
    const chipBorder = isDark ? "rgba(255,255,255,0.16)" : colors.neutral200;
    const chipText = isDark ? colors.white : colors.neutral800;
    const iconColor = isDark ? colors.primary : colors.primaryDark;

    return (
        <View style={styles.wrapper}>
            <Typo size={11.5} color={mutedColor} style={styles.caption}>
                {actionLabel}
            </Typo>
            <View style={styles.linksRow}>
                <Pressable
                    onPress={() => {
                        hapticTap("medium");
                        router.push("/(legal)/privacyPolicy" as any);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={({ pressed }) => [
                        styles.linkChip,
                        { backgroundColor: chipBg, borderColor: chipBorder },
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <Icons.FileText size={verticalScale(13)} color={iconColor} weight="fill" />
                    <Typo size={12} fontWeight="700" color={chipText}>
                        Privacy Policy
                    </Typo>
                </Pressable>

                <Pressable
                    onPress={() => {
                        hapticTap("medium");
                        router.push("/(legal)/security" as any);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={({ pressed }) => [
                        styles.linkChip,
                        { backgroundColor: chipBg, borderColor: chipBorder },
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <Icons.ShieldCheck size={verticalScale(13)} color={iconColor} weight="fill" />
                    <Typo size={12} fontWeight="700" color={chipText}>
                        Security
                    </Typo>
                </Pressable>
            </View>
        </View>
    );
};

export default AuthLegalFooter;

const styles = StyleSheet.create({
    wrapper: {
        alignItems: "center",
        gap: spacingY._8,
        marginTop: spacingY._4,
    },
    caption: {
        textAlign: "center",
    },
    linksRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(10),
        flexWrap: "wrap",
    },
    linkChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(5),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
        borderWidth: 1,
    },
});
