import { StyleSheet, Platform } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Stack, useRouter, useSegments } from "expo-router"
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from "../contexts/authContext";
import { isOnboardingCompleted } from '../hooks/useOnboarding';
import { initSentry, setupGlobalErrorHandlers, setSentryUser } from '../services/errorReporter';
import AppErrorBoundary from '../components/ErrorBoundary';
import { BubblyAlertHost } from '../components/BubblyAlert';
import { AppLockGate } from '../components/AppLockGate';
import { ContactCompletionModal } from '../components/ContactCompletionModal';
import { RealtimeNotifier } from '../components/RealtimeNotifier';
import { initHapticStrength } from '../utils/haptics';
import { initIncomingRingtone } from '../services/soundService';
import { onSocketConnectionChange } from '../socket/socketEvents';
import {
    getWarmupSnapshot,
    startServerWarmup,
    subscribeWarmupState,
    WarmupSnapshot,
} from '../utils/serverWarmup';
import {
    claimIncomingCallScreen,
    configureNotificationHandler,
    handleNotificationResponse,
    markCallHandledFromNotification,
    registerForPushNotificationsAsync,
    setupNotificationChannelsAndCategories,
    subscribePushTokenUpdates,
} from '../services/notificationService';

// Initialize Sentry, Global Unhandled Exception Handlers, Channels, and Foreground Notification Handler
initSentry();
setupGlobalErrorHandlers();
configureNotificationHandler();
setupNotificationChannelsAndCategories().catch(() => {});
initHapticStrength().catch(() => {});
initIncomingRingtone().catch(() => {});

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
    const [warmup, setWarmup] = useState<WarmupSnapshot>(() => getWarmupSnapshot());

    useEffect(() => {
        startServerWarmup();
        return subscribeWarmupState(setWarmup);
    }, []);

    // Check onboarding completion on mount and whenever route/user changes while incomplete
    useEffect(() => {
        if (onboardingDone === true) return;
        isOnboardingCompleted().then(setOnboardingDone);
    }, [onboardingDone, segments[0], user]);

    // Sync authenticated user context with Sentry
    useEffect(() => {
        setSentryUser(user);
    }, [user]);

    // Route guard — runs when auth state and onboarding state are both determined
    useEffect(() => {
        // Hold on splash screen while auth, onboarding, or server wake-up is running
        const onSplash = !segments[0];
        if (isLoading || onboardingDone === null) return;
        if (onSplash && warmup.status === "warming") return;

        if (!onboardingDone) {
            // First install — show onboarding
            const inOnboarding = segments[0] === "onboarding";
            if (!inOnboarding) {
                router.replace("/onboarding");
            }
            return;
        }

        const inLegal = segments[0] === "(legal)";
        const inOnboarding = segments[0] === "onboarding";

        // Onboarding is done. Now check auth state.
        if (user) {
            // Authenticated — go to main app; if phone or email is missing, ContactCompletionModal prompts in-app
            const inMain = segments[0] === "(main)";
            if (!inMain && !inLegal && !inOnboarding) {
                router.replace("/(main)/home");
            }
        } else {
            // Not authenticated, onboarding done — go to auth
            const inAuth = segments[0] === "(auth)";
            if (!inAuth && !inLegal && segments[0] !== "oauthredirect") {
                router.replace("/(auth)/welcome");
            }
        }
    }, [isLoading, onboardingDone, user, segments, warmup.status]);

    return null;
};

// ─── Stack layout ─────────────────────────────────────────────────────────────

const StackLayout = () => {
    const router = useRouter();
    const segments = useSegments();
    const { user, token, isLoading } = useAuth();
    const lastHandledNotifIdRef = useRef<string | null>(null);
    const pendingResponseRef = useRef<Notifications.NotificationResponse | null>(null);
    const inMainRef = useRef<boolean>(false);
    const tokenRef = useRef<string | null>(token);
    tokenRef.current = token;
    inMainRef.current = segments[0] === "(main)";
    const lastNotificationResponse = Notifications.useLastNotificationResponse();

    const preClaimCallAction = (response: Notifications.NotificationResponse) => {
        const data = (response.notification.request.content.data || {}) as Record<string, any>;
        if (data?.type === "call" && data?.callId) {
            if (response.actionIdentifier === "ACCEPT" || response.actionIdentifier === "DECLINE") {
                markCallHandledFromNotification(String(data.callId));
            }
        }
    };

    const openIncomingCallScreen = (data: {
        callId: string;
        callerId?: string;
        callerName: string;
        callerAvatar?: string;
        kind: string;
        conversationId: string;
    }) => {
        if (!claimIncomingCallScreen(data.callId)) return;

        router.push({
            pathname: '/(main)/incomingCall',
            params: {
                callId: data.callId,
                callerId: data.callerId || '',
                callerName: data.callerName,
                callerAvatar: data.callerAvatar || '',
                kind: data.kind,
                conversationId: data.conversationId,
            },
        });
    };

    useEffect(() => {
        if (!user) return;

        // Keep push token synchronized whenever socket connects or OS rotates the token
        const unsubTokenRefresh = subscribePushTokenUpdates(() => tokenRef.current);
        const unsubConn = onSocketConnectionChange((connected) => {
            if (connected && tokenRef.current) {
                registerForPushNotificationsAsync(tokenRef.current).catch(() => {});
            }
        });

        // Capture any cold-start notification launch immediately before pending-call fallbacks race
        if (Platform.OS !== "web") {
            Notifications.getLastNotificationResponseAsync()
                .then((launchResponse) => {
                    if (!launchResponse) return;
                    const id = launchResponse.notification.request.identifier;
                    if (lastHandledNotifIdRef.current === id) return;
                    preClaimCallAction(launchResponse);
                    if (inMainRef.current) {
                        lastHandledNotifIdRef.current = id;
                        handleNotificationResponse(launchResponse, router).catch(() => {});
                        Notifications.clearLastNotificationResponseAsync().catch(() => {});
                    } else {
                        pendingResponseRef.current = launchResponse;
                    }
                })
                .catch(() => {});
        }

        // Foreground push fallback if socket missed incoming call event
        const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
            const data = (notification.request.content.data || {}) as Record<string, any>;
            if (data?.type === 'call' && data?.callId) {
                openIncomingCallScreen({
                    callId: String(data.callId),
                    callerId: String(data.callerId || ''),
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
            preClaimCallAction(response);

            const data = (response.notification.request.content.data || {}) as Record<string, any>;
            if (response.actionIdentifier === "DECLINE" && data?.type === "call") {
                lastHandledNotifIdRef.current = id;
                handleNotificationResponse(response, router).catch(() => {});
                Notifications.clearLastNotificationResponseAsync().catch(() => {});
                return;
            }

            if (inMainRef.current) {
                lastHandledNotifIdRef.current = id;
                handleNotificationResponse(response, router).catch(() => {});
                Notifications.clearLastNotificationResponseAsync().catch(() => {});
            } else {
                pendingResponseRef.current = response;
            }
        });

        return () => {
            unsubTokenRefresh();
            unsubConn();
            receivedSub.remove();
            responseSub.remove();
        };
    }, [user?.id]);

    // Handle cold-start or deferred notification tap once authenticated inside (main)
    useEffect(() => {
        if (isLoading || !user) return;

        const response = pendingResponseRef.current || lastNotificationResponse;
        if (!response) return;

        const id = response.notification.request.identifier;
        if (lastHandledNotifIdRef.current === id) return;
        preClaimCallAction(response);

        const data = (response.notification.request.content.data || {}) as Record<string, any>;
        if (response.actionIdentifier === "DECLINE" && data?.type === "call") {
            lastHandledNotifIdRef.current = id;
            pendingResponseRef.current = null;
            handleNotificationResponse(response, router).catch(() => {});
            Notifications.clearLastNotificationResponseAsync().catch(() => {});
            return;
        }

        if (segments[0] !== "(main)") return;

        lastHandledNotifIdRef.current = id;
        pendingResponseRef.current = null;

        handleNotificationResponse(response, router).catch(() => {});
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }, [isLoading, user, segments, lastNotificationResponse]);

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#0c0a09" },
            }}
        >
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
                    <RealtimeNotifier />
                    <AppLockGate />
                    <ContactCompletionModal />
                    <BubblyAlertHost />
                </AuthProvider>
            </SafeAreaProvider>
        </AppErrorBoundary>
    );
};

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({});