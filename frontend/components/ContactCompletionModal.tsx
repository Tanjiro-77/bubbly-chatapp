import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useSegments } from "expo-router";
import * as Icons from "phosphor-react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import Typo from "./Typo";
import Input from "./Input";
import Button from "./Button";
import { BubblyAlert } from "./BubblyAlert";
import { useAuth } from "../contexts/authContext";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Dynamic pop-up shown to already-logged-in users who are missing either their
 * phone number (signed in with email) or their email address (signed in with phone).
 */
export const ContactCompletionModal = () => {
    const { user, isLoading, updateUserPhone, signOut } = useAuth();
    const segments = useSegments();

    const hasPhone = Boolean(user?.phoneNumber?.trim());
    const hasEmail = Boolean(user?.email?.trim());
    const needsPhone = !hasPhone;
    const needsEmail = !hasEmail;
    const inMain = segments[0] === "(main)";
    const visible = Boolean(!isLoading && user && inMain && (needsPhone || needsEmail));

    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
    const [email, setEmail] = useState(user?.email || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setPhoneNumber(user?.phoneNumber || "");
        setEmail(user?.email || "");
    }, [user?.phoneNumber, user?.email, visible]);

    if (!visible) return null;

    const isEmailUserMissingPhone = hasEmail && needsPhone;
    const isPhoneUserMissingEmail = hasPhone && needsEmail;

    const title = isEmailUserMissingPhone
        ? "Add Your Phone Number"
        : isPhoneUserMissingEmail
        ? "Add Your Email Address"
        : "Complete Contact Info";

    const subtitle = isEmailUserMissingPhone
        ? "You signed in with your email. Add your phone number so friends on Bubbly can find you via contact sync."
        : isPhoneUserMissingEmail
        ? "You signed in with your phone number. Add your email address to keep your account protected and synced."
        : "Both your phone number and email address are required so friends can discover you on Bubbly.";

    const handleSave = async () => {
        const finalPhone = needsPhone ? phoneNumber.trim() : (user?.phoneNumber || "").trim();
        const phoneDigits = finalPhone.replace(/\D/g, "");
        const finalEmail = needsEmail ? email.trim().toLowerCase() : undefined;

        if (!finalPhone || phoneDigits.length < 7 || phoneDigits.length > 18) {
            hapticTap("error");
            BubblyAlert.alert(
                "Phone Number Required",
                "Please enter a valid phone number (7 to 18 digits) so friends on Bubbly can find you."
            );
            return;
        }

        if (needsEmail && (!finalEmail || !EMAIL_REGEX.test(finalEmail))) {
            hapticTap("error");
            BubblyAlert.alert("Email Required", "Please enter a valid email address to continue.");
            return;
        }

        try {
            setIsSaving(true);
            await updateUserPhone(finalPhone, finalEmail);
            hapticTap("celebration");
        } catch (err: any) {
            hapticTap("error");
            BubblyAlert.alert(
                "Could Not Save",
                err?.message || "Please verify your details and try again."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => {}}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.overlay}
            >
                <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
                    <Animated.View entering={FadeInUp.duration(260)} style={styles.card}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* Top Badge + Icon */}
                            <View style={styles.topRow}>
                                <View style={styles.badgePill}>
                                    <Icons.ShieldCheck size={13} color={colors.primaryDark} weight="fill" />
                                    <Typo size={10.5} fontWeight="800" color={colors.primaryDark}>
                                        {isEmailUserMissingPhone
                                            ? "PHONE REQUIRED"
                                            : isPhoneUserMissingEmail
                                            ? "EMAIL REQUIRED"
                                            : "SETUP REQUIRED"}
                                    </Typo>
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        hapticTap("light");
                                        signOut();
                                    }}
                                    style={styles.signOutPill}
                                    activeOpacity={0.75}
                                >
                                    <Typo size={11.5} fontWeight="700" color={colors.neutral500}>
                                        Sign Out
                                    </Typo>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.iconCircle}>
                                {isPhoneUserMissingEmail ? (
                                    <Icons.At size={26} color={colors.primaryDark} weight="bold" />
                                ) : (
                                    <Icons.PhoneCall size={26} color={colors.primaryDark} weight="fill" />
                                )}
                            </View>

                            <View style={styles.textBlock}>
                                <Typo size={21} fontWeight="800" color={colors.neutral900}>
                                    {title}
                                </Typo>
                                <Typo size={13} color={colors.neutral500} style={styles.subtitle}>
                                    {subtitle}
                                </Typo>
                            </View>

                            {/* Show already-verified credential pill for clarity */}
                            {isEmailUserMissingPhone && user?.email ? (
                                <View style={styles.verifiedChip}>
                                    <Icons.CheckCircle size={15} color="#16a34a" weight="fill" />
                                    <Typo
                                        size={12}
                                        fontWeight="600"
                                        color={colors.neutral700}
                                        style={{ flex: 1 }}
                                        textProps={{ numberOfLines: 1, ellipsizeMode: "tail" }}
                                    >
                                        Signed in as {user.email}
                                    </Typo>
                                </View>
                            ) : null}

                            {isPhoneUserMissingEmail && user?.phoneNumber ? (
                                <View style={styles.verifiedChip}>
                                    <Icons.CheckCircle size={15} color="#16a34a" weight="fill" />
                                    <Typo
                                        size={12}
                                        fontWeight="600"
                                        color={colors.neutral700}
                                        style={{ flex: 1 }}
                                        textProps={{ numberOfLines: 1, ellipsizeMode: "tail" }}
                                    >
                                        Signed in with {user.phoneNumber}
                                    </Typo>
                                </View>
                            ) : null}

                            {/* Dynamic Missing Field(s) */}
                            <View style={styles.fields}>
                                {needsPhone && (
                                    <View style={styles.fieldGroup}>
                                        <Typo size={11.5} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                            PHONE NUMBER *
                                        </Typo>
                                        <Input
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            placeholder="+91 98765 43210"
                                            keyboardType="phone-pad"
                                            autoCapitalize="none"
                                            autoComplete="tel"
                                            returnKeyType={needsEmail ? "next" : "done"}
                                            onSubmitEditing={!needsEmail ? handleSave : undefined}
                                            icon={
                                                <Icons.PhoneCall
                                                    size={verticalScale(19)}
                                                    color={colors.primaryDark}
                                                    weight="bold"
                                                />
                                            }
                                        />
                                        <Typo size={11} color={colors.neutral400} style={{ marginLeft: 4 }}>
                                            Include country code (e.g. +91 or +1)
                                        </Typo>
                                    </View>
                                )}

                                {needsEmail && (
                                    <View style={styles.fieldGroup}>
                                        <Typo size={11.5} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                            EMAIL ADDRESS *
                                        </Typo>
                                        <Input
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="you@email.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            autoComplete="email"
                                            returnKeyType="done"
                                            onSubmitEditing={handleSave}
                                            icon={
                                                <Icons.At
                                                    size={verticalScale(19)}
                                                    color={colors.primaryDark}
                                                    weight="bold"
                                                />
                                            }
                                        />
                                    </View>
                                )}
                            </View>

                            <Button
                                loading={isSaving}
                                onPress={handleSave}
                                style={styles.saveBtn}
                            >
                                <Typo size={15.5} fontWeight="800" color={colors.neutral900}>
                                    {isEmailUserMissingPhone
                                        ? "Save Phone Number"
                                        : isPhoneUserMissingEmail
                                        ? "Save Email Address"
                                        : "Save & Continue"}
                                </Typo>
                            </Button>
                        </ScrollView>
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(9, 8, 7, 0.72)",
        justifyContent: "center",
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._20,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radius._30,
        borderCurve: "continuous",
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._20,
        maxHeight: "88%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
        elevation: 18,
    },
    scrollContent: {
        gap: spacingY._15,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    badgePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(5),
        backgroundColor: "#fef3c7",
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: radius.full,
    },
    signOutPill: {
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
    },
    iconCircle: {
        width: scale(50),
        height: scale(50),
        borderRadius: radius._18,
        backgroundColor: "#fef3c7",
        alignItems: "center",
        justifyContent: "center",
    },
    textBlock: {
        gap: verticalScale(5),
    },
    subtitle: {
        lineHeight: verticalScale(19),
    },
    verifiedChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(7),
        backgroundColor: "#f0fdf4",
        borderWidth: 1,
        borderColor: "#bbf7d0",
        borderRadius: radius._12,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
    },
    fields: {
        gap: spacingY._12,
    },
    fieldGroup: {
        gap: spacingY._5,
    },
    label: {
        marginLeft: scale(4),
        letterSpacing: 0.5,
    },
    saveBtn: {
        height: verticalScale(52),
        borderRadius: radius._15,
        marginTop: spacingY._5,
    },
});
