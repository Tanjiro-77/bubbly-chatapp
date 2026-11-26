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

const Login = () => {

    const emailRef = useRef("");
    const phoneRef = useRef("");
    const passwordRef = useRef("");
    const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { signIn, signInWithPhone } = useAuth();
    const { triggerGoogleSignIn, isLoading: isGoogleLoading } = useGoogleAuth();

    const handleSubmit = async () => {
        const cleanPassword = passwordRef.current;

        if (loginMethod === 'phone') {
            const cleanPhone = phoneRef.current.trim();
            if (!cleanPhone || !cleanPassword) {
                BubblyAlert.alert('Log In', "Please enter your phone number and password");
                return;
            }
            try {
                setIsLoading(true);
                await signInWithPhone(cleanPhone, cleanPassword);
            } catch (error: any) {
                BubblyAlert.alert("Login Error", error.message);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        const cleanEmail = emailRef.current.trim().toLowerCase();
        if (!cleanEmail || !cleanPassword) {
            BubblyAlert.alert('Log In', "Please fill all the fields");
            return;
        }
        try {
            setIsLoading(true);
            await signIn(cleanEmail, cleanPassword);
        } catch (error: any) {
            BubblyAlert.alert("Login Error", error.message);
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

                    {/* Header */}
                    <Animated.View
                        entering={FadeInDown.duration(500).springify()}
                        style={styles.header}
                    >
                        <BackButton iconSize={24} />
                    </Animated.View>

                    {/* White sheet */}
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
                                    Welcome Back
                                </Typo>
                                <Typo size={14} color={colors.neutral400} fontWeight="400">
                                    Sign in to continue to Bubbly
                                </Typo>
                            </View>

                            {/* Method Switcher (Phone Number | Email) */}
                            <View style={styles.methodTabs}>
                                <TouchableOpacity
                                    style={[styles.methodTab, loginMethod === 'phone' && styles.methodTabActive]}
                                    onPress={() => {
                                        emailRef.current = "";
                                        setLoginMethod('phone');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Icons.Phone size={15} color={loginMethod === 'phone' ? colors.neutral900 : colors.neutral500} weight="bold" />
                                    <Typo size={13} fontWeight={loginMethod === 'phone' ? "700" : "600"} color={loginMethod === 'phone' ? colors.neutral900 : colors.neutral500}>
                                        Phone Number
                                    </Typo>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.methodTab, loginMethod === 'email' && styles.methodTabActive]}
                                    onPress={() => {
                                        phoneRef.current = "";
                                        setLoginMethod('email');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Icons.At size={15} color={loginMethod === 'email' ? colors.neutral900 : colors.neutral500} weight="bold" />
                                    <Typo size={13} fontWeight={loginMethod === 'email' ? "700" : "600"} color={loginMethod === 'email' ? colors.neutral900 : colors.neutral500}>
                                        Email
                                    </Typo>
                                </TouchableOpacity>
                            </View>

                            {/* Fields */}
                            <View style={styles.fields}>
                                {loginMethod === 'phone' ? (
                                    <View key="phone-group" style={styles.fieldGroup}>
                                        <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                            PHONE NUMBER
                                        </Typo>
                                        <Input
                                            key="phone-input"
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
                                    <View key="email-group" style={styles.fieldGroup}>
                                        <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                            EMAIL
                                        </Typo>
                                        <Input
                                            key="email-input"
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
                                    {/* Label row with forgot password inline */}
                                    <View style={styles.labelRow}>
                                        <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                            PASSWORD
                                        </Typo>
                                        <Pressable
                                            onPress={() => BubblyAlert.alert(
                                                "Reset Password",
                                                "You can sign in instantly with Google using the button below, or contact support at arnavkhari.77@gmail.com to reset your password."
                                            )}
                                            style={({ pressed }) => pressed && { opacity: 0.5 }}
                                        >
                                            <Typo size={12} fontWeight="600" color={colors.neutral400}>
                                                Forgot?
                                            </Typo>
                                        </Pressable>
                                    </View>
                                    <Input
                                        placeholder="Your password"
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
                                    style={styles.loginBtn}
                                >
                                    <Typo fontWeight="700" color={colors.white} size={16}>
                                        Sign In
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

                                {/* Register link */}
                                <View style={styles.footer}>
                                    <Typo size={14} color={colors.neutral500}>
                                        Don't have an account?
                                    </Typo>
                                    <Pressable
                                        onPress={() => router.push("/(auth)/register")}
                                        style={({ pressed }) => pressed && { opacity: 0.6 }}
                                    >
                                        <Typo size={14} fontWeight="700" color={colors.neutral900}>
                                            Sign Up
                                        </Typo>
                                    </Pressable>
                                </View>

                                {/* Privacy Policy & Security */}
                                <AuthLegalFooter actionLabel="By signing in, you agree to our" />
                            </View>

                        </ScrollView>
                    </Animated.View>

                </View>
            </ScreenWrapper>
        </KeyboardAvoidingView>
    )
}

export default Login

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
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: 4,
        marginRight: 2,
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
    loginBtn: {
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