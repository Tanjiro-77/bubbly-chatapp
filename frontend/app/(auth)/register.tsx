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

const Register = () => {

    const nameRef = useRef("");
    const emailRef = useRef("");
    const passwordRef = useRef("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { signUp } = useAuth();

    const handleSubmit = async () => {
        if (!emailRef.current || !passwordRef.current || !nameRef.current) {
            Alert.alert('Sign Up', "Please fill all the fields");
            return;
        }
        try {
            setIsLoading(true);
            await signUp(emailRef.current, passwordRef.current, nameRef.current, "");
        } catch (error: any) {
            Alert.alert("Registration Error", error.message)
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
                                    <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                        PASSWORD
                                    </Typo>
                                    <Input
                                        placeholder="Min. 8 characters"
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
    label: {
        letterSpacing: 1.2,
        marginLeft: 4,
    },

    // CTA
    ctaBlock: {
        gap: spacingY._20,
        marginTop: spacingY._10,
    },
    signUpBtn: {
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