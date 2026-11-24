import { StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from "expo-router"
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Sentry from '@sentry/react-native';
import { AuthProvider, useAuth } from "../contexts/authContext";
import { onCallIncoming } from '../socket/socketEvents';
import { IncomingCallProps } from '../types';
import { isOnboardingCompleted } from '../hooks/useOnboarding';
import { initSentry, setupGlobalErrorHandlers, setSentryUser } from '../services/errorReporter';
import AppErrorBoundary from '../components/ErrorBoundary';

// Initialize Sentry and Global Unhandled Exception Handlers
initSentry();
setupGlobalErrorHandlers();

// ─── Navigation guard ─────────────────────────────────────────────────────────
// Runs on every auth state change and on startup.
// Determines whether to show onboarding, auth screens, or the main app.

const NavigationGuard = () => {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    /**
     * Three-state loading:
     *  null    = not yet checked (show nothing — prevents flash)
     *  true    = onboarding has been completed before
     *  false   = onboarding has never been completed
     */
    const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

    // Check onboarding completion once on mount
    useEffect(() => {
        isOnboardingCompleted().then(setOnboardingDone);
    }, []);

    // Sync authenticated user context with Sentry
    useEffect(() => {
        setSentryUser(user);
    }, [user]);

    // Route guard — runs when auth state and onboarding state are both determined
    useEffect(() => {
        // Still loading auth or onboarding state — keep showing splash screen
        if (isLoading || onboardingDone === null) return;

        if (!onboardingDone) {
            // First install — show onboarding
            const inOnboarding = segments[0] === "onboarding";
            if (!inOnboarding) {
                router.replace("/onboarding");
            }
            return;
        }

        // Onboarding is done. Now check auth state.
        if (user) {
            // Authenticated — go to main app
            // Only navigate if not already in (main) to avoid loops
            const inMain = segments[0] === "(main)";
            if (!inMain) {
                router.replace("/(main)/home");
            }
        } else {
            // Not authenticated, onboarding done — go to auth
            const inAuth = segments[0] === "(auth)";
            if (!inAuth) {
                router.replace("/(auth)/welcome");
            }
        }
    }, [isLoading, onboardingDone, user]);

    return null;
};

// ─── Stack layout ─────────────────────────────────────────────────────────────

const StackLayout = () => {
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const handleIncomingCall = (data: IncomingCallProps) => {
            router.push({
                pathname: '/(main)/incomingCall',
                params: {
                    callId: data.callId,
                    callerName: data.caller.name,
                    callerAvatar: data.caller.avatar || '',
                    kind: data.kind,
                    conversationId: data.conversationId,
                },
            });
        };

        onCallIncoming(handleIncomingCall);
        return () => {
            onCallIncoming(handleIncomingCall, true);
        };
    }, [user]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* ── Onboarding ── */}
            <Stack.Screen
                name="onboarding"
                options={{ headerShown: false, animation: "fade" }}
            />

            {/* ── Modals ── */}
            <Stack.Screen
                name="(main)/profileModel"
                options={{ presentation: "modal" }}
            />
            <Stack.Screen
                name="(main)/newConversationModal"
                options={{ presentation: "modal" }}
            />
            <Stack.Screen
                name="(main)/incomingCall"
                options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen
                name="(main)/callScreen"
                options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen
                name="(main)/storyViewer"
                options={{ presentation: "fullScreenModal", animation: "fade" }}
            />
            <Stack.Screen
                name="(main)/createStory"
                options={{ presentation: "modal" }}
            />
            <Stack.Screen
                name="(main)/reportBugModal"
                options={{ presentation: "modal" }}
            />
            {/* ── About ── */}
            <Stack.Screen
                name="(main)/about"
                options={{ headerShown: false }}
            />
        </Stack>
    );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

const RootLayout = () => {
    return (
        <AppErrorBoundary>
            <SafeAreaProvider>
                <AuthProvider>
                    <StackLayout />
                    <NavigationGuard />
                </AuthProvider>
            </SafeAreaProvider>
        </AppErrorBoundary>
    );
};

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({});