import { StyleSheet } from 'react-native'
import React, { useEffect } from 'react'
import { Stack, useRouter } from "expo-router"
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from "../contexts/authContext";
import { onCallIncoming } from '../socket/socketEvents';
import { IncomingCallProps } from '../types';

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
        </Stack>
    );
};

const RootLayout = () => {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StackLayout />
            </AuthProvider>
        </SafeAreaProvider>
    );
};

export default RootLayout;

const styles = StyleSheet.create({});