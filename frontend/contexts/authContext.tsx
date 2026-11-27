import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContextProps, DecodedTokenProps, UserProps } from "../types";
import { useRouter } from "expo-router";
import { login, loginWithPhone, register, registerWithPhone, googleLogin } from "../services/authService";
import { updateUserPhoneNumber } from "../services/contactService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from 'jwt-decode';
import { connectSocket, disconnectSocket, updateSocketAuth } from "../socket/socket";
import { markOnboardingCompleted } from "../hooks/useOnboarding";
import { clearMemoryChatCache } from "../utils/chatCache";
import { clearFeatureMemoryCache } from "../utils/featureStorage";
import { bootstrapAndSyncPreferences } from "../services/preferencesService";
import {
    registerForPushNotificationsAsync,
    unregisterPushTokenAsync,
} from "../services/notificationService";


export const AuthContext = createContext<AuthContextProps>({
    token: null,
    user: null,
    isLoading: true,
    signIn: async () => { },
    signInWithPhone: async () => { },
    signInWithGoogle: async () => { },
    signUp: async () => { },
    signUpWithPhone: async () => { },
    signOut: async () => { },
    updateToken: async () => { },
    updateUserPhone: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserProps | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        loadToken();
    }, []);

    const loadToken = async () => {
        try {
            const storedToken = await AsyncStorage.getItem("token");
            if (storedToken) {
                const decoded = jwtDecode<DecodedTokenProps>(storedToken);
                if (decoded?.user?.id) {
                    setToken(storedToken);
                    setUser(decoded.user);
                    connectSocket().catch(() => {});
                    bootstrapAndSyncPreferences(storedToken, decoded.user.id).catch(() => {});
                    registerForPushNotificationsAsync(storedToken).catch(() => {});
                } else {
                    await AsyncStorage.removeItem('token');
                }
            }
        } catch (error) {
            console.log('failed to decode token:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateToken = useCallback(async (nextToken: string) => {
        if (!nextToken) return;
        try {
            const decoded = jwtDecode<DecodedTokenProps>(nextToken);
            if (!decoded?.user?.id) return;
            setToken(nextToken);
            await AsyncStorage.setItem("token", nextToken);
            updateSocketAuth(nextToken);
            setUser(decoded.user);
        } catch (err) {
            console.warn("updateToken decode error:", err);
        }
    }, []);

    const establishAuthenticatedSession = useCallback(async (authToken: string): Promise<UserProps | null> => {
        const decoded = jwtDecode<DecodedTokenProps>(authToken);
        if (!decoded?.user?.id) {
            throw new Error("Invalid session token");
        }
        setToken(authToken);
        await AsyncStorage.setItem("token", authToken);
        updateSocketAuth(authToken);
        await markOnboardingCompleted();
        setUser(decoded.user);
        connectSocket().catch(() => {});
        bootstrapAndSyncPreferences(authToken, decoded.user.id).catch(() => {});
        registerForPushNotificationsAsync(authToken).catch(() => {});
        return decoded.user;
    }, []);

    const routeAfterAuth = useCallback((_authUser: UserProps | null) => {
        try {
            router.replace("/(main)/home");
        } catch {}
    }, [router]);

    const signIn = useCallback(async (email: string, password: string) => {
        const response = await login(email, password);
        const nextUser = await establishAuthenticatedSession(response.token);
        routeAfterAuth(nextUser);
    }, [establishAuthenticatedSession, routeAfterAuth]);

    const signInWithPhone = useCallback(async (phoneNumber: string, password: string) => {
        const response = await loginWithPhone(phoneNumber, password);
        const nextUser = await establishAuthenticatedSession(response.token);
        routeAfterAuth(nextUser);
    }, [establishAuthenticatedSession, routeAfterAuth]);

    const signInWithGoogle = useCallback(async (payload: {
        idToken?: string;
        accessToken?: string;
        email?: string;
        name?: string;
        avatar?: string;
        googleId?: string;
    }) => {
        const response = await googleLogin(payload);
        const nextUser = await establishAuthenticatedSession(response.token);
        routeAfterAuth(nextUser);
    }, [establishAuthenticatedSession, routeAfterAuth]);

    const updateUserPhone = useCallback(async (phoneNumber: string, email?: string) => {
        if (!token) return;
        const res = await updateUserPhoneNumber(phoneNumber, token, email);
        if (!res.success) {
            throw new Error(res.msg || "Could not update contact details");
        }
        if (res.token) {
            await updateToken(res.token);
        } else {
            setUser(prev => prev ? {
                ...prev,
                phoneNumber: res.phoneNumber || phoneNumber,
                ...(res.email || email ? { email: res.email || email } : {}),
            } : prev);
        }
    }, [token, updateToken]);

    const signUp = useCallback(async (
        email: string,
        password: string,
        name: string,
        avatar?: string | null,
        phoneNumber?: string
    ) => {
        const response = await register(email, password, name, avatar, phoneNumber);
        const nextUser = await establishAuthenticatedSession(response.token);
        routeAfterAuth(nextUser);
    }, [establishAuthenticatedSession, routeAfterAuth]);

    const signUpWithPhone = useCallback(async (
        phoneNumber: string,
        password: string,
        name: string,
        avatar?: string | null,
        email?: string
    ) => {
        const response = await registerWithPhone(phoneNumber, password, name, avatar, email);
        const nextUser = await establishAuthenticatedSession(response.token);
        routeAfterAuth(nextUser);
    }, [establishAuthenticatedSession, routeAfterAuth]);

    const signOut = useCallback(async () => {
        const currentToken = token;
        setToken(null);
        setUser(null);
        clearMemoryChatCache();
        clearFeatureMemoryCache();
        await unregisterPushTokenAsync(currentToken).catch(() => {});
        await AsyncStorage.removeItem('token');
        try {
            const keys = await AsyncStorage.getAllKeys();
            const sessionKeys = keys.filter(k =>
                k.startsWith('@bubbly_draft_') ||
                k.startsWith('@bubbly_outbox_') ||
                k.startsWith('@bubbly_scheduled_') ||
                k.startsWith('@bubbly_synced_contacts_') ||
                k.startsWith('@bubbly_cache_')
            );
            if (sessionKeys.length > 0) {
                await AsyncStorage.multiRemove(sessionKeys);
            }
        } catch {}
        disconnectSocket();
        try {
            router.replace("/(auth)/welcome");
        } catch {}
    }, [token, router]);

    const value = useMemo<AuthContextProps>(() => ({
        token,
        user,
        isLoading,
        signIn,
        signInWithPhone,
        signInWithGoogle,
        signUp,
        signUpWithPhone,
        signOut,
        updateToken,
        updateUserPhone,
    }), [
        token,
        user,
        isLoading,
        signIn,
        signInWithPhone,
        signInWithGoogle,
        signUp,
        signUpWithPhone,
        signOut,
        updateToken,
        updateUserPhone,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
