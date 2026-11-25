import { StyleSheet } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Stack, useRouter, useSegments } from "expo-router"
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from "../contexts/authContext";
import { onCallIncoming } from '../socket/socketEvents';
import { IncomingCallProps } from '../types';
import { isOnboardingCompleted } from '../hooks/useOnboarding';
import { initSentry, setupGlobalErrorHandlers, setSentryUser } from '../services/errorReporter';
import AppErrorBoundary from '../components/ErrorBoundary';
import {
    configureNotificationHandler,
    handleNotificationResponse,
} from '../services/notificationService';

// Initialize Sentry, Global Unhandled Exception Handlers, and Foreground Notification Handler
initSentry();
setupGlobalErrorHandlers();
configureNotificationHandler();

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

        const inLegal = segments[0] === "(legal)";

        // Onboarding is done. Now check auth state.
        if (user) {
            // Authenticated — go to main app
            // Only navigate if not already in (main) or (legal) to avoid loops
            const inMain = segments[0] === "(main)";
            if (!inMain && !inLegal) {
                router.replace("/(main)/home");
            }
        } else {
            // Not authenticated, onboarding done — go to auth
            const inAuth = segments[0] === "(auth)";
            if (!inAuth && !inLegal) {
                router.replace("/(auth)/welcome");
            }
        }
    }, [isLoading, onboardingDone, user]);

    return null;
};

// ─── Stack layout ─────────────────────────────────────────────────────────────

const StackLayout = () => {
    const router = useRouter();
    const segments = useSegments();
    const { user, isLoading } = useAuth();
    const lastHandledNotifIdRef = useRef<string | null>(null);
    const activeIncomingCallIdRef = useRef<string | null>(null);
    const pendingResponseRef = useRef<Notifications.NotificationResponse | null>(null);
    const inMainRef = useRef<boolean>(false);
    inMainRef.current = segments[0] === "(main)";
    const lastNotificationResponse = Notifications.useLastNotificationResponse();

    const openIncomingCallScreen = (data: {
        callId: string;
        callerName: string;
        callerAvatar?: string;
        kind: string;
        conversationId: string;
    }) => {
        if (!data.callId || activeIncomingCallIdRef.current === data.callId) return;
        activeIncomingCallIdRef.current = data.callId;
        setTimeout(() => {
            if (activeIncomingCallIdRef.current === data.callId) {
                activeIncomingCallIdRef.current = null;
            }
        }, 30000);

        router.push({
            pathname: '/(main)/incomingCall',
            params: {
                callId: data.callId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar || '',
                kind: data.kind,
                conversationId: data.conversationId,
            },
        });
    };

    useEffect(() => {
        if (!user) return;

        const handleIncomingCall = (data: IncomingCallProps) => {
            openIncomingCallScreen({
                callId: data.callId,
                callerName: data.caller.name,
                callerAvatar: data.caller.avatar || '',
                kind: data.kind,
                conversationId: data.conversationId,
            });
        };

        onCallIncoming(handleIncomingCall);

        // Foreground push fallback if socket missed incoming call event
        const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
            const data = (notification.request.content.data || {}) as Record<string, any>;
            if (data?.type === 'call' && data?.callId) {
                openIncomingCallScreen({
                    callId: String(data.callId),
                    callerName: String(data.callerName || 'Unknown'),
                    callerAvatar: String(data.callerAvatar || ''),
                    kind: String(data.kind || 'voice'),
                    conversationId: String(data.conversationId || ''),
                });
            }
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const id = response.notification.request.identifier;
            if (lastHandledNotifIdRef.current === id) return;
            lastHandledNotifIdRef.current = id;

            if (inMainRef.current) {
                handleNotificationResponse(response, router).catch(() => {});
                Notifications.clearLastNotificationResponseAsync().catch(() => {});
            } else {
                pendingResponseRef.current = response;
            }
        });

        return () => {
            onCallIncoming(handleIncomingCall, true);
            receivedSub.remove();
            responseSub.remove();
        };
    }, [user?.id]);

    // Handle cold-start or deferred notification tap once authenticated inside (main)
    useEffect(() => {
        if (isLoading || !user || segments[0] !== "(main)") return;

        const response = pendingResponseRef.current || lastNotificationResponse;
        if (!response) return;

        const id = response.notification.request.identifier;
        if (lastHandledNotifIdRef.current === id) return;

        lastHandledNotifIdRef.current = id;
        pendingResponseRef.current = null;

        handleNotificationResponse(response, router).catch(() => {});
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }, [isLoading, user, segments, lastNotificationResponse]);

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

            {/* ── Legal & Play Store Compliance ── */}
            <Stack.Screen
                name="(legal)/privacyPolicy"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="(legal)/security"
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