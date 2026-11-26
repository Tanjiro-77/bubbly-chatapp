/**
 * frontend/components/AppLockGate.tsx
 *
 * Enforces App Lock + Privacy Shield Auto-Lock Timer across cold launches
 * and background-to-foreground app resume transitions using a 4-digit PIN.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, AppStateStatus, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Icons from "phosphor-react-native";
import { useAuth } from "../contexts/authContext";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { getPrivacyShield, subscribeFeatureUpdates } from "../utils/featureStorage";
import { hapticTap } from "../utils/haptics";
import Typo from "./Typo";
import { BubblyAlert } from "./BubblyAlert";

const APP_LOCK_KEY = "bubbly_app_lock_enabled";
const PIN_STORAGE_KEY_PREFIX = "@bubbly_vault_pin";

export const AppLockGate = () => {
    const { user, isLoading, signOut } = useAuth();
    const [lockEnabled, setLockEnabled] = useState(false);
    const [savedPin, setSavedPin] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [enteredPin, setEnteredPin] = useState("");
    const [setupStep, setSetupStep] = useState<"verify" | "create" | "confirm">("verify");
    const [firstPin, setFirstPin] = useState("");
    const [errorText, setErrorText] = useState("");

    const initialBootCheckedRef = useRef<string | null>(null);
    const leftActiveAtRef = useRef<number | null>(null);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);
    const shakeX = useRef(new Animated.Value(0)).current;

    const triggerShake = useCallback(() => {
        hapticTap("error");
        Animated.sequence([
            Animated.timing(shakeX, { toValue: -12, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 12, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]).start();
    }, [shakeX]);

    const pinStorageKey = user?.id ? `${PIN_STORAGE_KEY_PREFIX}_${user.id}` : PIN_STORAGE_KEY_PREFIX;

    const refreshLockState = useCallback(async (forceLockIfEnabled = false) => {
        if (!user) {
            setLockEnabled(false);
            setIsLocked(false);
            setSavedPin(null);
            initialBootCheckedRef.current = null;
            return;
        }
        try {
            const [enabledRaw, pinRaw] = await Promise.all([
                AsyncStorage.getItem(APP_LOCK_KEY),
                AsyncStorage.getItem(pinStorageKey),
            ]);
            const enabled = enabledRaw === "true";
            setLockEnabled(enabled);
            setSavedPin(pinRaw);

            if (!enabled) {
                setIsLocked(false);
                return;
            }

            if (forceLockIfEnabled || initialBootCheckedRef.current !== (user.id || "__user__")) {
                initialBootCheckedRef.current = user.id || "__user__";
                setSetupStep(pinRaw ? "verify" : "create");
                setEnteredPin("");
                setFirstPin("");
                setErrorText("");
                setIsLocked(true);
            }
        } catch {}
    }, [user, pinStorageKey]);

    useEffect(() => {
        if (isLoading) return;
        refreshLockState(false);
    }, [isLoading, refreshLockState]);

    useEffect(() => {
        return subscribeFeatureUpdates(() => {
            if (!user) return;
            Promise.all([
                AsyncStorage.getItem(APP_LOCK_KEY),
                AsyncStorage.getItem(pinStorageKey),
            ]).then(([enabledRaw, pinRaw]) => {
                const enabled = enabledRaw === "true";
                setLockEnabled(enabled);
                setSavedPin(pinRaw);
                if (!enabled) setIsLocked(false);
            }).catch(() => {});
        });
    }, [user, pinStorageKey]);

    useEffect(() => {
        const sub = AppState.addEventListener("change", async (nextState) => {
            const prevState = appStateRef.current;
            appStateRef.current = nextState;
            if (!user) return;

            if (prevState === "active" && nextState !== "active") {
                if (leftActiveAtRef.current === null) {
                    leftActiveAtRef.current = Date.now();
                }
                return;
            }

            if (prevState !== "active" && nextState === "active") {
                const leftAt = leftActiveAtRef.current;
                leftActiveAtRef.current = null;
                try {
                    const [enabledRaw, shield] = await Promise.all([
                        AsyncStorage.getItem(APP_LOCK_KEY),
                        getPrivacyShield(),
                    ]);
                    if (enabledRaw !== "true") {
                        setIsLocked(false);
                        return;
                    }
                    const elapsed = leftAt ? Date.now() - leftAt : shield.autoLockDelayMs;
                    if (elapsed >= shield.autoLockDelayMs) {
                        await refreshLockState(true);
                    }
                } catch {}
            }
        });

        return () => sub.remove();
    }, [user, refreshLockState]);

    const handleDigitPress = async (digit: string) => {
        if (enteredPin.length >= 4) return;
        hapticTap("light");
        const nextPin = enteredPin + digit;
        setEnteredPin(nextPin);
        setErrorText("");

        if (nextPin.length === 4) {
            if (setupStep === "create") {
                setFirstPin(nextPin);
                setEnteredPin("");
                setSetupStep("confirm");
                return;
            }

            if (setupStep === "confirm") {
                if (nextPin !== firstPin) {
                    triggerShake();
                    setErrorText("PINs did not match. Try again.");
                    setEnteredPin("");
                    setFirstPin("");
                    setSetupStep("create");
                    return;
                }
                await AsyncStorage.setItem(pinStorageKey, nextPin).catch(() => {});
                hapticTap("success");
                setSavedPin(nextPin);
                setEnteredPin("");
                setIsLocked(false);
                return;
            }

            if (nextPin === savedPin) {
                hapticTap("success");
                setEnteredPin("");
                setErrorText("");
                setIsLocked(false);
            } else {
                triggerShake();
                setErrorText("Incorrect PIN. Try again.");
                setEnteredPin("");
            }
        }
    };

    const handleBackspace = () => {
        hapticTap("light");
        setEnteredPin((prev) => prev.slice(0, -1));
        setErrorText("");
    };

    const handleSignOutFromLock = () => {
        BubblyAlert.alert(
            "Sign Out?",
            "Signing out removes your session from this device. You can log back in anytime.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        setIsLocked(false);
                        await signOut().catch(() => {});
                    },
                },
            ]
        );
    };

    if (!user || !lockEnabled || !isLocked) return null;

    const titleText =
        setupStep === "create"
            ? "Create App Lock PIN"
            : setupStep === "confirm"
            ? "Confirm Your 4-Digit PIN"
            : "Bubbly is Locked";
    const subText =
        setupStep === "create"
            ? "Set a 4-digit PIN (shared with Secret Vault) to lock Bubbly"
            : setupStep === "confirm"
            ? "Re-enter your 4-digit PIN to activate lock protection"
            : "Enter your 4-digit passcode to unlock your chats";

    const rows = [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        ["", "0", "back"],
    ];

    return (
        <View style={styles.overlay} accessibilityViewIsModal>
            <View style={styles.shieldCircle}>
                <Icons.LockKey size={verticalScale(34)} color={colors.primary} weight="fill" />
            </View>

            <Typo size={22} fontWeight="800" color={colors.white} style={{ marginTop: spacingY._15 }}>
                {titleText}
            </Typo>
            <Typo
                size={13}
                color="rgba(255,255,255,0.65)"
                style={{ textAlign: "center", marginTop: spacingY._5, paddingHorizontal: spacingX._25 }}
            >
                {subText}
            </Typo>

            <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeX }] }]}>
                {[0, 1, 2, 3].map((idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.dot,
                            idx < enteredPin.length && styles.dotFilled,
                            !!errorText && { borderColor: colors.rose },
                        ]}
                    />
                ))}
            </Animated.View>

            {!!errorText && (
                <Typo size={12.5} fontWeight="600" color={colors.rose} style={{ marginTop: spacingY._8 }}>
                    {errorText}
                </Typo>
            )}

            <View style={styles.keypad}>
                {rows.map((row, rIdx) => (
                    <View key={rIdx} style={styles.keyRow}>
                        {row.map((key, kIdx) => {
                            if (key === "") {
                                return <View key={kIdx} style={styles.keyEmpty} />;
                            }
                            if (key === "back") {
                                return (
                                    <TouchableOpacity
                                        key={kIdx}
                                        style={styles.keyBtn}
                                        onPress={handleBackspace}
                                        activeOpacity={0.7}
                                    >
                                        <Icons.Backspace size={24} color={colors.white} weight="bold" />
                                    </TouchableOpacity>
                                );
                            }
                            return (
                                <TouchableOpacity
                                    key={kIdx}
                                    style={styles.keyBtn}
                                    onPress={() => handleDigitPress(key)}
                                    activeOpacity={0.7}
                                >
                                    <Typo size={24} fontWeight="700" color={colors.white}>
                                        {key}
                                    </Typo>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </View>

            <TouchableOpacity onPress={handleSignOutFromLock} style={styles.signOutLink} activeOpacity={0.7}>
                <Typo size={13} fontWeight="600" color={colors.primary}>
                    Forgot PIN? Sign Out
                </Typo>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFill,
        zIndex: 9999,
        backgroundColor: "#0c0a09",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._20,
        paddingTop: Platform.OS === "ios" ? verticalScale(24) : 0,
    },
    shieldCircle: {
        width: scale(74),
        height: scale(74),
        borderRadius: radius.full,
        backgroundColor: "rgba(245, 158, 11, 0.16)",
        borderWidth: 1.5,
        borderColor: "rgba(245, 158, 11, 0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    dotsRow: {
        flexDirection: "row",
        gap: scale(16),
        marginTop: spacingY._25,
        marginBottom: spacingY._8,
    },
    dot: {
        width: scale(15),
        height: scale(15),
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.45)",
        backgroundColor: "transparent",
    },
    dotFilled: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    keypad: {
        marginTop: spacingY._25,
        gap: verticalScale(12),
        width: "100%",
        maxWidth: scale(280),
    },
    keyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: scale(12),
    },
    keyBtn: {
        flex: 1,
        height: scale(62),
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.09)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    keyEmpty: {
        flex: 1,
        height: scale(62),
    },
    signOutLink: {
        marginTop: spacingY._25,
        paddingVertical: spacingY._8,
        paddingHorizontal: spacingX._15,
    },
});
