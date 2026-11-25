import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { AuthContextProps, DecodedTokenProps, UserProps } from "../types";
import { useRouter } from "expo-router";
import { login, loginWithPhone, register, registerWithPhone, googleLogin } from "../services/authService";
import { updateUserPhoneNumber } from "../services/contactService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from 'jwt-decode';
import { connectSocket, disconnectSocket } from "../socket/socket";
import { markOnboardingCompleted } from "../hooks/useOnboarding";
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
    }, [])

    const loadToken = async () => {
        try {
            const storedToken = await AsyncStorage.getItem("token");
            if (storedToken) {
                const decoded = jwtDecode<DecodedTokenProps>(storedToken);
                if (decoded.exp && decoded.exp < Date.now() / 1000) {
                    // token has expired
                    await AsyncStorage.removeItem('token');
                } else {
                    // user is logged in
                    setToken(storedToken);
                    await connectSocket();
                    setUser(decoded.user);
                    registerForPushNotificationsAsync(storedToken).catch(() => {});
                }
            }
        } catch (error) {
            console.log('failed to decode token:', error);
        } finally {
            // Keep splash visible briefly (900ms) for smooth brand presentation
            setTimeout(() => {
                setIsLoading(false);
            }, 900);
        }
    };

    const updateToken = async (token: string) => {
        if (token) {
            setToken(token);
            await AsyncStorage.setItem("token", token);
            // decode token (user)
            const decoded = jwtDecode<DecodedTokenProps>(token);
            console.log("decoded token:", decoded);
            setUser(decoded.user);
        }
    }

    const signIn = async (email: string, password: string) => {
        const response = await login(email, password);
        await updateToken(response.token);
        await connectSocket();
        await markOnboardingCompleted();
        registerForPushNotificationsAsync(response.token).catch(() => {});
        router.replace("/(main)/home");
    };

    const signInWithPhone = async (phoneNumber: string, password: string) => {
        const response = await loginWithPhone(phoneNumber, password);
        await updateToken(response.token);
        await connectSocket();
        await markOnboardingCompleted();
        registerForPushNotificationsAsync(response.token).catch(() => {});
        router.replace("/(main)/home");
    };

    const signInWithGoogle = async (payload: {
        idToken?: string;
        accessToken?: string;
        email?: string;
        name?: string;
        avatar?: string;
        googleId?: string;
    }) => {
        const response = await googleLogin(payload);
        await updateToken(response.token);
        await connectSocket();
        await markOnboardingCompleted();
        registerForPushNotificationsAsync(response.token).catch(() => {});
        router.replace("/(main)/home");
    };

    const updateUserPhone = async (phoneNumber: string) => {
        if (!token) return;
        const res = await updateUserPhoneNumber(phoneNumber, token);
        if (res.success) {
            if (res.token) {
                await updateToken(res.token);
            } else if (res.phoneNumber) {
                setUser(prev => prev ? { ...prev, phoneNumber: res.phoneNumber } : prev);
            }
        }
    };

    const signUp = async (email: string, password: string, name: string, avatar?: string | null) => {
        const response = await register(email, password, name, avatar);
        await updateToken(response.token);
        await connectSocket();
        await markOnboardingCompleted();
        registerForPushNotificationsAsync(response.token).catch(() => {});
        router.replace("/(main)/home");
    };

    const signUpWithPhone = async (phoneNumber: string, password: string, name: string, avatar?: string | null) => {
        const response = await registerWithPhone(phoneNumber, password, name, avatar);
        await updateToken(response.token);
        await connectSocket();
        await markOnboardingCompleted();
        registerForPushNotificationsAsync(response.token).catch(() => {});
        router.replace("/(main)/home");
    };

    const signOut = async () => {
        const currentToken = token;
        setToken(null);
        setUser(null);
        await unregisterPushTokenAsync(currentToken).catch(() => {});
        await AsyncStorage.removeItem('token');
        // Clear transient drafts/outbox/scheduled caches so a second number on the same phone starts clean
        try {
            const keys = await AsyncStorage.getAllKeys();
            const sessionKeys = keys.filter(k =>
                k.startsWith('@bubbly_draft_') ||
                k.startsWith('@bubbly_outbox_') ||
                k.startsWith('@bubbly_scheduled_')
            );
            if (sessionKeys.length > 0) {
                await AsyncStorage.multiRemove(sessionKeys);
            }
        } catch {}
        disconnectSocket();
        router.replace("/(auth)/welcome");
    };

    return (
        <AuthContext.Provider value={{ token, user, isLoading, signIn, signInWithPhone, signInWithGoogle, signUp, signUpWithPhone, signOut, updateToken, updateUserPhone }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);   
