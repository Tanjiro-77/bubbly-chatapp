import {
    StyleSheet, View, KeyboardAvoidingView,
    Platform, ScrollView, Pressable,
    TouchableOpacity, ActivityIndicator
} from 'react-native'
import { BubblyAlert } from "../../components/BubblyAlert"
import React, { useRef, useState } from 'react'
import ScreenWrapper from "../../components/ScreenWrapper"
import Typo from "../../components/Typo"
import { colors, radius, spacingX, spacingY } from "../../constants/theme"
import BackButton from "../../components/BackButton"
import Input from "../../components/Input"
import * as Icons from "phosphor-react-native"
import { verticalScale } from "../../utils/styling"
import { useRouter } from "expo-router"
import Button from "../../components/Button"
import { useAuth } from "../../contexts/authContext"
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import GoogleIcon from "../../components/GoogleIcon"
import { useGoogleAuth } from "../../hooks/useGoogleAuth"
import AuthLegalFooter from "../../components/AuthLegalFooter"

const Register = () => {

    const nameRef = useRef("");
    const emailRef = useRef("");
    const phoneRef = useRef("");
    const passwordRef = useRef("");
    const [signupMethod, setSignupMethod] = useState<'phone' | 'email'>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { signUp, signUpWithPhone } = useAuth();
    const { triggerGoogleSignIn, isLoading: isGoogleLoading } = useGoogleAuth();

    const handleSubmit = async () => {
        const cleanName = nameRef.current.trim();
        const cleanPassword = passwordRef.current;

        if (!cleanName || !cleanPassword) {
            BubblyAlert.alert('Sign Up', "Please fill all required fields");
            return;
        }

        if (cleanPassword.length < 6) {
            BubblyAlert.alert('Sign Up', "Password must be at least 6 characters");
            return;
        }

        if (signupMethod === 'phone') {
            const cleanPhone = phoneRef.current.trim();
            if (!cleanPhone) {
                BubblyAlert.alert('Sign Up', "Please enter your phone number");
                return;
            }
            try {
                setIsLoading(true);
                await signUpWithPhone(cleanPhone, cleanPassword, cleanName, "");
            } catch (error: any) {
                BubblyAlert.alert("Registration Error", error.message);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        const cleanEmail = emailRef.current.trim().toLowerCase();
        if (!cleanEmail) {
            BubblyAlert.alert('Sign Up', "Please enter your email address");
            return;
        }

        try {
            setIsLoading(true);
            await signUp(cleanEmail, cleanPassword, cleanName, "");
        } catch (error: any) {
            BubblyAlert.alert("Registration Error", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? "padding" : "height"}
        >
            <ScreenWrapper showPattern={true}>
                <View style={styles.container}>

                    {/* Header — minimal top bar */}
                    <Animated.View
                        entering={FadeInDown.duration(500).springify()}
                        style={styles.header}
                    >
                        <BackButton iconSize={24} />
                    </Animated.View>

                    {/* White card sheet */}
                    <Animated.View
                        entering={FadeInUp.duration(600).delay(100).springify()}
                        style={styles.content}
                    >
                        <ScrollView
                            contentContainerStyle={styles.form}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >

                            {/* Title block */}
                            <View style={styles.titleBlock}>
                                <Typo size={30} fontWeight="800" color={colors.neutral900}>
                                    Create Account
                                </Typo>
                                <Typo size={14} color={colors.neutral400} fontWeight="400">
                                    Join Bubbly and start connecting
                                </Typo>
                            </View>

                            {/* Signup Method Toggle */}
                            <View style={styles.methodTabs}>
                                <TouchableOpacity
                                    style={[styles.methodTab, signupMethod === 'phone' && styles.methodTabActive]}
                                    onPress={() => {
                                        emailRef.current = "";
                                        setSignupMethod('phone');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Icons.Phone size={15} color={signupMethod === 'phone' ? colors.neutral900 : colors.neutral500} weight="bold" />
                                    <Typo size={13} fontWeight={signupMethod === 'phone' ? "700" : "600"} color={signupMethod === 'phone' ? colors.neutral900 : colors.neutral500}>
                                        Phone Number
                                    </Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.methodTab, signupMethod === 'email' && styles.methodTabActive]}
                                    onPress={() => {
                                        phoneRef.current = "";
                                        setSignupMethod('email');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Icons.At size={15} color={signupMethod === 'email' ? colors.neutral900 : colors.neutral500} weight="bold" />
                                    <Typo size={13} fontWeight={signupMethod === 'email' ? "700" : "600"} color={signupMethod === 'email' ? colors.neutral900 : colors.neutral500}>
                                        Email
                                    </Typo>
                                </TouchableOpacity>
                            </View>

                            {/* Fields */}
                            <View style={styles.fields}>
                                <View style={styles.fieldGroup}>
                                    <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                        FULL NAME
                                    </Typo>
                                    <Input
                                        placeholder="Your name"
                                        onChangeText={(value: string) => nameRef.current = value}
                                        icon={
                                            <Icons.User
                                                size={verticalScale(20)}
                                                color={colors.neutral400}
                                                weight="regular"
                                            />
                                        }
                                    />
                                </View>

                                {signupMethod === 'phone' ? (
                                    <View key="signup-phone-group" style={styles.fieldGroup}>
                                        <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                            PHONE NUMBER
                                        </Typo>
                                        <Input
                                            key="signup-phone-input"
                                            placeholder="+91 98765 43210"
                                            keyboardType="phone-pad"
                                            autoCapitalize="none"
                                            onChangeText={(value: string) => phoneRef.current = value}
                                            icon={
                                                <Icons.Phone
                                                    size={verticalScale(20)}
                                                    color={colors.neutral400}
                                                    weight="regular"
                                                />
                                            }
                                        />
                                    </View>
                                ) : (
                                    <View key="signup-email-group" style={styles.fieldGroup}>
                                        <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                            EMAIL
                                        </Typo>
                                        <Input
                                            key="signup-email-input"
                                            placeholder="you@email.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            onChangeText={(value: string) => emailRef.current = value}
                                            icon={
                                                <Icons.At
                                                    size={verticalScale(20)}
                                                    color={colors.neutral400}
                                                    weight="regular"
                                                />
                                            }
                                        />
                                    </View>
                                )}

                                <View style={styles.fieldGroup}>
                                    <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                        PASSWORD
                                    </Typo>
                                    <Input
                                        placeholder="Min. 6 characters"
                                        secureTextEntry
                                        onChangeText={(value: string) => passwordRef.current = value}
                                        icon={
                                            <Icons.Lock
                                                size={verticalScale(20)}
                                                color={colors.neutral400}
                                                weight="regular"
                                            />
                                        }
                                    />
                                </View>
                            </View>

                            {/* CTA */}
                            <View style={styles.ctaBlock}>
                                <Button
                                    loading={isLoading}
                                    onPress={handleSubmit}
                                    style={styles.signUpBtn}
                                >
                                    <Typo fontWeight="700" color={colors.white} size={16}>
                                        Create Account
                                    </Typo>
                                </Button>

                                {/* Divider */}
                                <View style={styles.dividerRow}>
                                    <View style={styles.dividerLine} />
                                    <Typo size={12} color={colors.neutral400}>or</Typo>
                                    <View style={styles.dividerLine} />
                                </View>

                                {/* Google Sign-In Button */}
                                <TouchableOpacity
                                    style={styles.googleBtn}
                                    onPress={triggerGoogleSignIn}
                                    activeOpacity={0.8}
                                    disabled={isGoogleLoading || isLoading}
                                >
                                    {isGoogleLoading ? (
                                        <ActivityIndicator size="small" color={colors.neutral800} />
                                    ) : (
                                        <>
                                            <GoogleIcon size={20} />
                                            <Typo size={15} fontWeight="700" color={colors.neutral800}>
                                                Continue with Google
                                            </Typo>
                                        </>
                                    )}
                                </TouchableOpacity>

                                {/* Login link */}
                                <View style={styles.footer}>
                                    <Typo size={14} color={colors.neutral500}>
                                        Already have an account?
                                    </Typo>
                                    <Pressable
                                        onPress={() => router.push("/(auth)/login")}
                                        style={({ pressed }) => pressed && { opacity: 0.6 }}
                                    >
                                        <Typo size={14} fontWeight="700" color={colors.neutral900}>
                                            Sign In
                                        </Typo>
                                    </Pressable>
                                </View>

                                {/* Privacy Policy & Security */}
                                <AuthLegalFooter actionLabel="By creating an account, you agree to our" />
                            </View>

                        </ScrollView>
                    </Animated.View>

                </View>
            </ScreenWrapper>
        </KeyboardAvoidingView>
    )
}

export default Register

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "space-between",
    },

    // Header
    header: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._20,
        flexDirection: "row",
        alignItems: "center",
    },

    // White sheet
    content: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._40,
        borderTopRightRadius: radius._40,
        borderCurve: "continuous",
        paddingHorizontal: spacingX._25,
        paddingTop: spacingY._30,
    },

    form: {
        gap: spacingY._25,
        paddingBottom: spacingY._30,
    },

    // Title
    titleBlock: {
        gap: spacingY._5,
    },

    // Method Tabs
    methodTabs: {
        flexDirection: "row",
        backgroundColor: colors.neutral100,
        borderRadius: radius._15,
        padding: 4,
        gap: 4,
    },
    methodTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: verticalScale(10),
        borderRadius: radius._12,
    },
    methodTabActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },

    // Fields
    fields: {
        gap: spacingY._18,
    },
    fieldGroup: {
        gap: spacingY._5,
    },
    label: {
        letterSpacing: 1.2,
        marginLeft: 4,
    },

    // CTA
    ctaBlock: {
        gap: spacingY._18,
        marginTop: spacingY._5,
    },
    signUpBtn: {
        borderRadius: radius._15,
        height: verticalScale(52),
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    googleBtn: {
        height: verticalScale(52),
        borderRadius: radius._15,
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.neutral200,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacingX._10,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },

    // Divider
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.neutral200,
    },

    // Footer
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
})