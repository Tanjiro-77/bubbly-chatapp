import {
    StyleSheet, View, KeyboardAvoidingView,
    Platform, ScrollView, Pressable, Alert
} from 'react-native'
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

const Login = () => {

    const emailRef = useRef("");
    const passwordRef = useRef("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { signIn } = useAuth();

    const handleSubmit = async () => {
        if (!emailRef.current || !passwordRef.current) {
            Alert.alert('Log In', "Please fill all the fields");
            return;
        }
        try {
            setIsLoading(true);
            await signIn(emailRef.current, passwordRef.current);
        } catch (error: any) {
            Alert.alert("Login Error", error.message);
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

                            {/* Fields */}
                            <View style={styles.fields}>
                                <View style={styles.fieldGroup}>
                                    <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                        EMAIL
                                    </Typo>
                                    <Input
                                        placeholder="you@email.com"
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

                                <View style={styles.fieldGroup}>
                                    {/* Label row with forgot password inline */}
                                    <View style={styles.labelRow}>
                                        <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                            PASSWORD
                                        </Typo>
                                        <Pressable
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
        borderTopLeftRadius: radius._50,
        borderTopRightRadius: radius._50,
        borderCurve: "continuous",
        paddingHorizontal: spacingX._25,
        paddingTop: spacingY._30,
    },

    form: {
        gap: spacingY._30,
        paddingBottom: spacingY._30,
    },

    // Title
    titleBlock: {
        gap: spacingY._5,
    },

    // Fields
    fields: {
        gap: spacingY._20,
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
        gap: spacingY._20,
        marginTop: spacingY._10,
    },
    loginBtn: {
        borderRadius: radius._12,
        height: verticalScale(52),
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