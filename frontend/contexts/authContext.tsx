import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { AuthContextProps, DecodedTokenProps, UserProps } from "../types";
import { useRouter } from "expo-router";
import { login, register } from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from 'jwt-decode';
import { connectSocket, disconnectSocket } from "../socket/socket";


export const AuthContext = createContext<AuthContextProps>({
    token: null,
    user: null,
    signIn: async () => { },
    signUp: async () => { },
    signOut: async () => { },
    updateToken: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserProps | null>(null);
    const router = useRouter();

    useEffect(() => {
        loadToken();
    }, [])

    const loadToken = async () => {
        const storedToken = await AsyncStorage.getItem("token");
        if (storedToken) {
            try {
                const decoded = jwtDecode<DecodedTokenProps>(storedToken);
                if (decoded.exp && decoded.exp < Date.now() / 1000) {
                    // token has expired, naviage to welcome page
                    await AsyncStorage.removeItem('token');
                    gotoWelcomePage();
                    return;
                }

                // user is logged in
                setToken(storedToken);
                await connectSocket();
                setUser(decoded.user);

                gotoHomePage();
            } catch (error) {
                gotoWelcomePage();
                console.log('failed to decode token:', error);
            }
        } else {
            gotoWelcomePage();
        }
    };

    const gotoHomePage = () => {

        // wait is only for showing splash screen
        setTimeout(() => {
            router.replace('/(main)/home')
        }, 1500);
    }

    const gotoWelcomePage = () => {
        // wait is only for showing splash screen
        setTimeout(() => {
            router.replace('/(auth)/welcome')
        }, 1500);
    }

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
        router.replace("/(main)/home");
    };

    const signUp = async (email: string, password: string, name: string, avatar?: string | null) => {
        const response = await register(email, password, name, avatar);
        await updateToken(response.token);
        await connectSocket();
        router.replace("/(main)/home");
    };

    const signOut = async () => {
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('token');
        disconnectSocket();
        router.replace("/(auth)/welcome");
    };

    return (
        <AuthContext.Provider value={{ token, user, signIn, signUp, signOut, updateToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);   
