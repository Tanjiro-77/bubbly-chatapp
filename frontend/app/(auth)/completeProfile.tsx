import React, { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useAuth } from "../../contexts/authContext";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { hapticTap } from "../../utils/haptics";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Ensures Google-authenticated and legacy users always provide both a verified
 * email and phone number so contact sync can discover every active account.
 */
const CompleteProfileScreen = () => {
    const { user, updateUserPhone, signOut } = useAuth();
    const router = useRouter();

    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
    const [email, setEmail] = useState(user?.email || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user?.phoneNumber) setPhoneNumber(user.phoneNumber);
        if (user?.email) setEmail(user.email);
    }, [user?.phoneNumber, user?.email]);

    const missingEmail = !user?.email?.trim();
    const missingPhone = !user?.phoneNumber?.trim();

    const handleComplete = async () => {
        const trimmedPhone = missingPhone ? phoneNumber.trim() : (user?.phoneNumber || "").trim();
        const digitsOnly = trimmedPhone.replace(/\D/g, "");
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedPhone || digitsOnly.length < 7 || digitsOnly.length > 18) {
            hapticTap("error");
            BubblyAlert.alert(
                "Phone Number Required",
                "Please enter a valid phone number (7 to 18 digits) so contacts on Bubbly can find you."
            );
            return;
        }

        if (missingEmail && (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail))) {
            hapticTap("error");
            BubblyAlert.alert("Email Required", "Please enter a valid email address to continue.");
            return;
        }

        try {
            setIsSaving(true);
            await updateUserPhone(trimmedPhone, missingEmail ? trimmedEmail : undefined);
            hapticTap("celebration");
            router.replace("/(main)/home");
        } catch (err: any) {
            hapticTap("error");
            BubblyAlert.alert("Could Not Save", err?.message || "Please verify your details and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScreenWrapper showPattern={true}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <Animated.View entering={FadeInDown.duration(240)} style={styles.header}>
                    <View style={styles.stepPill}>
                        <Icons.ShieldCheck size={14} color={colors.primaryDark} weight="fill" />
                        <Typo size={11.5} fontWeight="800" color={colors.primaryDark}>
                            {missingPhone && !missingEmail
                                ? "ADD PHONE NUMBER"
                                : missingEmail && !missingPhone
                                ? "ADD EMAIL ADDRESS"
                                : "REQUIRED DISCOVERY SETUP"}
                        </Typo>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            hapticTap("medium");
                            signOut();
                        }}
                        style={styles.signOutBtn}
                        activeOpacity={0.75}
                    >
                        <Typo size={12.5} fontWeight="700" color={colors.white}>
                            Sign Out
                        </Typo>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInUp.duration(280).delay(40)} style={styles.sheet}>
                    <ScrollView
                        contentContainerStyle={styles.form}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.heroIconWrap}>
                            {missingEmail && !missingPhone ? (
                                <Icons.At size={28} color={colors.primaryDark} weight="bold" />
                            ) : (
                                <Icons.AddressBook size={28} color={colors.primaryDark} weight="duotone" />
                            )}
                        </View>

                        <View style={styles.titleBlock}>
                            <Typo size={26} fontWeight="800" color={colors.neutral900}>
                                {missingPhone && !missingEmail
                                    ? "Add Your Phone Number"
                                    : missingEmail && !missingPhone
                                    ? "Add Your Email Address"
                                    : "Link Required Contact Info"}
                            </Typo>
                            <Typo size={13.5} color={colors.neutral500} style={{ lineHeight: 20 }}>
                                {missingPhone && !missingEmail
                                    ? "You're signed in with email. Add your phone number so friends on Bubbly can discover you via contact sync."
                                    : missingEmail && !missingPhone
                                    ? "You're signed in with your phone number. Add your email address to protect and sync your account."
                                    : "Bubbly syncs contacts by phone number — never email alone. Add both your phone number and email so friends find you automatically."}
                            </Typo>
                        </View>

                        <View style={styles.fields}>
                            {missingPhone && (
                                <View style={styles.fieldGroup}>
                                    <Typo size={12} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                        PHONE NUMBER *
                                    </Typo>
                                    <Input
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        placeholder="+91 98765 43210"
                                        keyboardType="phone-pad"
                                        autoCapitalize="none"
                                        icon={
                                            <Icons.PhoneCall
                                                size={verticalScale(20)}
                                                color={colors.primaryDark}
                                                weight="bold"
                                            />
                                        }
                                    />
                                    <Typo size={11} color={colors.neutral400} style={{ marginLeft: 4 }}>
                                        Include your country code (e.g. +91 or +1)
                                    </Typo>
                                </View>
                            )}

                            {missingEmail && (
                                <View style={styles.fieldGroup}>
                                    <Typo size={12} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                        EMAIL ADDRESS *
                                    </Typo>
                                    <Input
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="you@email.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        icon={
                                            <Icons.At size={verticalScale(20)} color={colors.primaryDark} weight="bold" />
                                        }
                                    />
                                </View>
                            )}
                        </View>

                        <Button
                            loading={isSaving}
                            onPress={handleComplete}
                            style={styles.submitBtn}
                        >
                            <Typo size={16} fontWeight="800" color={colors.neutral900}>
                                Save & Continue
                            </Typo>
                        </Button>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

export default CompleteProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "space-between",
    },
    header: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    stepPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fef3c7",
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
    },
    signOutBtn: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.14)",
    },
    sheet: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._40,
        borderTopRightRadius: radius._40,
        borderCurve: "continuous",
        paddingHorizontal: spacingX._25,
        paddingTop: spacingY._30,
    },
    form: {
        gap: spacingY._20,
        paddingBottom: spacingY._30,
    },
    heroIconWrap: {
        width: scale(54),
        height: scale(54),
        borderRadius: radius._18,
        backgroundColor: "#fef3c7",
        alignItems: "center",
        justifyContent: "center",
    },
    titleBlock: {
        gap: spacingY._7,
    },
    fields: {
        gap: spacingY._15,
    },
    fieldGroup: {
        gap: spacingY._5,
    },
    label: {
        letterSpacing: 1,
        marginLeft: 4,
    },
    lockedInput: {
        backgroundColor: colors.neutral100,
    },
    submitBtn: {
        borderRadius: radius._15,
        height: verticalScale(52),
        marginTop: spacingY._10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
});
