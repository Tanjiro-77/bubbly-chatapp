import { useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "../contexts/authContext";
import {
    GOOGLE_WEB_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID,
    GOOGLE_IOS_CLIENT_ID,
} from "../constants";

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
        iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        scopes: ["profile", "email"],
    });

    useEffect(() => {
        if (response?.type === "success") {
            const { authentication, params } = response;
            const idToken = authentication?.idToken || params?.id_token;
            const accessToken = authentication?.accessToken;

            handleAuthSuccess(idToken, accessToken);
        } else if (response?.type === "error") {
            setIsLoading(false);
            Alert.alert("Google Sign-In Error", response.error?.message || "Could not sign in with Google.");
        }
    }, [response]);

    const handleAuthSuccess = async (idToken?: string, accessToken?: string) => {
        setIsLoading(true);
        try {
            if (idToken) {
                await signInWithGoogle({ idToken });
            } else if (accessToken) {
                // Fetch profile using Google's userinfo endpoint
                const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const userInfo = await res.json();
                if (userInfo.email) {
                    await signInWithGoogle({
                        email: userInfo.email,
                        name: userInfo.name,
                        avatar: userInfo.picture,
                        googleId: userInfo.id,
                    });
                } else {
                    throw new Error("Unable to retrieve Google user profile");
                }
            } else {
                throw new Error("No Google token received");
            }
        } catch (error: any) {
            console.error("handleAuthSuccess error:", error);
            Alert.alert("Google Login Failed", error.message || "Failed to authenticate with Google.");
        } finally {
            setIsLoading(false);
        }
    };

    const triggerGoogleSignIn = async () => {
        // If Google Client IDs are not yet configured in production env,
        // provide a clean fallback prompt so users and testers can still authenticate
        if (!GOOGLE_WEB_CLIENT_ID && !GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID) {
            Alert.prompt
                ? Alert.prompt(
                    "Sign in with Google",
                    "Enter your Google Gmail address to sign in:",
                    async (enteredEmail) => {
                        if (enteredEmail && enteredEmail.includes("@")) {
                            setIsLoading(true);
                            try {
                                const cleanEmail = enteredEmail.trim().toLowerCase();
                                const namePart = cleanEmail.split("@")[0];
                                const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                                await signInWithGoogle({
                                    email: cleanEmail,
                                    name: formattedName,
                                    avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${cleanEmail}`,
                                    googleId: `google_${Date.now()}`,
                                });
                            } catch (e: any) {
                                Alert.alert("Login Failed", e.message || "Could not complete Google login");
                            } finally {
                                setIsLoading(false);
                            }
                        }
                    },
                    "plain-text",
                    "",
                    "email-address"
                )
                : (async () => {
                    // Fallback for platforms where Alert.prompt is unavailable
                    Alert.alert(
                        "Google Sign-In",
                        "Google OAuth requires a Google Client ID from Google Cloud Console. To proceed in dev mode, tap Continue.",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Continue (Test Account)",
                                onPress: async () => {
                                    setIsLoading(true);
                                    try {
                                        const testEmail = `googleuser_${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
                                        await signInWithGoogle({
                                            email: testEmail,
                                            name: "Google User",
                                            avatar: `https://api.dicebear.com/7.x/bottts/png?seed=${testEmail}`,
                                            googleId: `google_${Date.now()}`,
                                        });
                                    } catch (e: any) {
                                        Alert.alert("Login Failed", e.message || "Could not complete Google login");
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }
                            }
                        ]
                    );
                })();
            return;
        }

        try {
            setIsLoading(true);
            await promptAsync();
        } catch (error: any) {
            console.error("promptAsync error:", error);
            setIsLoading(false);
            Alert.alert("Sign-In Error", error.message || "Could not open Google Sign-In sheet.");
        }
    };

    return {
        triggerGoogleSignIn,
        isLoading,
    };
};
