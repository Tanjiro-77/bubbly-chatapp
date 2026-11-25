import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Typo from "../components/Typo";
import { useAuth } from "../contexts/authContext";
import { colors } from "../constants/theme";

/**
 * Fallback route for /oauthredirect deep links so Expo Router never renders Unmatched Route
 * if Google OAuth returns directly via URI scheme.
 */
export default function OAuthRedirectFallback() {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        const timer = setTimeout(() => {
            if (user) {
                router.replace("/(main)/home");
            } else {
                router.replace("/(auth)/login");
            }
        }, 1200);
        return () => clearTimeout(timer);
    }, [isLoading, user, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Typo size={14} color={colors.neutral300} fontWeight="600">
                Completing Google Sign-In...
            </Typo>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1c1917",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
    },
});
