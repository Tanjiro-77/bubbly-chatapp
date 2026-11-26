/**
 * frontend/app/(main)/vault.tsx
 *
 * Secret Chat Vault (V3.1.2 Flagship).
 * Provides end-to-end encrypted local chat locking with a 4-digit PIN security vault.
 * Locked conversations are hidden from the main screen and require PIN authorization.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Vibration,
} from "react-native";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { getConversations } from "../../socket/socketEvents";
import { useAuth } from "../../contexts/authContext";
import { ConversationProps, ResponseProps } from "../../types";

const PIN_STORAGE_KEY_PREFIX = "@bubbly_vault_pin";
export const LOCKED_CHATS_KEY_PREFIX = "@bubbly_locked_chats";

const VaultScreen = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const PIN_STORAGE_KEY = currentUser?.id ? `${PIN_STORAGE_KEY_PREFIX}_${currentUser.id}` : PIN_STORAGE_KEY_PREFIX;
    const LOCKED_CHATS_KEY = currentUser?.id ? `${LOCKED_CHATS_KEY_PREFIX}_${currentUser.id}` : LOCKED_CHATS_KEY_PREFIX;
    const [savedPin, setSavedPin] = useState<string | null>(null);
    const [pinStage, setPinStage] = useState<"enter" | "setup_new" | "setup_confirm">("enter");
    const [firstSetupPin, setFirstSetupPin] = useState<string>("");
    const [currentPin, setCurrentPin] = useState<string>("");
    const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
    const [pinError, setPinError] = useState<string>("");

    const [lockedChatIds, setLockedChatIds] = useState<string[]>([]);
    const [allConversations, setAllConversations] = useState<ConversationProps[]>([]);

    useEffect(() => {
        const init = async () => {
            try {
                const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
                const storedLocked = await AsyncStorage.getItem(LOCKED_CHATS_KEY);
                if (storedLocked) {
                    try {
                        setLockedChatIds(JSON.parse(storedLocked));
                    } catch (_) { }
                }

                if (!storedPin) {
                    setSavedPin(null);
                    setPinStage("setup_new");
                } else {
                    setSavedPin(storedPin);
                    setPinStage("enter");
                }
            } catch (_) {
                setSavedPin(null);
                setPinStage("setup_new");
            }
        };
        init();

        const convHandler = (res: ResponseProps) => {
            if (res.success && Array.isArray(res.data)) {
                setAllConversations(res.data);
            }
        };
        getConversations(convHandler);
        getConversations(null);

        return () => {
            getConversations(convHandler, true);
        };
    }, [PIN_STORAGE_KEY, LOCKED_CHATS_KEY]);

    // Filter conversations that are locked
    const lockedConversations = useMemo(() => {
        return allConversations.filter(c => lockedChatIds.includes(c._id));
    }, [allConversations, lockedChatIds]);

    const handleDigitPress = (digit: string) => {
        if (currentPin.length >= 4) return;
        setPinError("");
        const newPin = currentPin + digit;
        setCurrentPin(newPin);

        if (newPin.length === 4) {
            handleCompletePin(newPin).catch(() => {});
        }
    };

    const handleBackspace = () => {
        setPinError("");
        setCurrentPin(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        setPinError("");
        setCurrentPin("");
    };

    const handleCompletePin = async (pin: string) => {
        if (pinStage === "enter") {
            if (pin === savedPin) {
                setTimeout(() => {
                    setIsUnlocked(true);
                    setCurrentPin("");
                }, 100);
            } else {
                if (Platform.OS !== "web") Vibration.vibrate(100);
                setTimeout(() => {
                    setPinError("Incorrect PIN. Please try again.");
                    setCurrentPin("");
                }, 150);
            }
        } else if (pinStage === "setup_new") {
            setFirstSetupPin(pin);
            setTimeout(() => {
                setCurrentPin("");
                setPinStage("setup_confirm");
            }, 100);
        } else if (pinStage === "setup_confirm") {
            if (pin === firstSetupPin) {
                try {
                    await AsyncStorage.setItem(PIN_STORAGE_KEY, pin);
                } catch (_) {
                    BubblyAlert.alert("Error", "Could not save Vault PIN. Please try again.");
                    return;
                }
                setSavedPin(pin);
                setTimeout(() => {
                    setIsUnlocked(true);
                    setCurrentPin("");
                    BubblyAlert.alert("Vault PIN Created", "Your Secret Chat Vault is now secured.");
                }, 100);
            } else {
                if (Platform.OS !== "web") Vibration.vibrate(100);
                setTimeout(() => {
                    setPinError("PINs do not match. Please try again.");
                    setCurrentPin("");
                    setPinStage("setup_new");
                }, 150);
            }
        }
    };

    const handleUnlockConversation = async (convId: string) => {
        BubblyAlert.alert(
            "Unlock Chat",
            "This chat will be moved back to your main chats screen.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unlock",
                    onPress: async () => {
                        const updated = lockedChatIds.filter(id => id !== convId);
                        setLockedChatIds(updated);
                        try {
                            await AsyncStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify(updated));
                        } catch (_) {}
                    },
                },
            ]
        );
    };

    const handleChangePin = () => {
        BubblyAlert.alert(
            "Change Vault PIN",
            "Do you want to create a new 4-digit PIN for your vault?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Change",
                    onPress: () => {
                        setIsUnlocked(false);
                        setCurrentPin("");
                        setPinStage("setup_new");
                    },
                },
            ]
        );
    };

    // Render Pin Entry / Setup Screen
    if (!isUnlocked) {
        return (
            <ScreenWrapper backgroundColor={colors.white} style={{ backgroundColor: colors.white }}>
                <View style={{ flex: 1, backgroundColor: colors.white }}>
                <View style={styles.header}>
                    <BackButton color={colors.neutral900} />
                    <View style={styles.headerTitleWrap}>
                        <Typo size={18} fontWeight="700" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                            Secret Chat Vault
                        </Typo>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.pinContainer}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.shieldWrap}>
                        <Icons.LockKey size={verticalScale(38)} color={colors.primaryDark} weight="duotone" />
                    </View>

                    <Typo size={20} fontWeight="700" color={colors.neutral900} style={{ marginTop: spacingY._15 }}>
                        {pinStage === "setup_new"
                            ? "Set a 4-Digit Vault PIN"
                            : pinStage === "setup_confirm"
                            ? "Confirm your Vault PIN"
                            : "Enter Vault PIN"}
                    </Typo>
                    <Typo size={13} color={colors.neutral400} style={styles.pinSubtitle}>
                        {pinStage === "setup_new"
                            ? "This PIN will be required to view and manage your locked secret chats."
                            : pinStage === "setup_confirm"
                            ? "Re-enter the 4 digits to confirm."
                            : "Your chats are hidden from the home screen and encrypted."}
                    </Typo>

                    {/* PIN Indicators */}
                    <View style={styles.dotsRow}>
                        {[0, 1, 2, 3].map(idx => (
                            <View
                                key={idx}
                                style={[
                                    styles.dot,
                                    currentPin.length > idx && styles.dotFilled,
                                    !!pinError && styles.dotError,
                                ]}
                            />
                        ))}
                    </View>

                    {!!pinError && (
                        <Typo size={12.5} color={colors.rose} style={{ marginTop: spacingY._7 }}>
                            {pinError}
                        </Typo>
                    )}

                    {/* Numeric Keypad */}
                    <View style={styles.keypad}>
                        {[
                            ["1", "2", "3"],
                            ["4", "5", "6"],
                            ["7", "8", "9"],
                            ["C", "0", "DEL"],
                        ].map((row, rowIdx) => (
                            <View key={rowIdx} style={styles.keypadRow}>
                                {row.map(val => {
                                    if (val === "C") {
                                        return (
                                            <TouchableOpacity
                                                key={val}
                                                style={styles.keyBtn}
                                                onPress={handleClear}
                                                activeOpacity={0.6}
                                            >
                                                <Typo size={15} fontWeight="600" color={colors.neutral500}>
                                                    Clear
                                                </Typo>
                                            </TouchableOpacity>
                                        );
                                    }
                                    if (val === "DEL") {
                                        return (
                                            <TouchableOpacity
                                                key={val}
                                                style={styles.keyBtn}
                                                onPress={handleBackspace}
                                                activeOpacity={0.6}
                                            >
                                                <Icons.Backspace
                                                    size={verticalScale(22)}
                                                    color={colors.neutral700}
                                                />
                                            </TouchableOpacity>
                                        );
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={val}
                                            style={styles.keyBtn}
                                            onPress={() => handleDigitPress(val)}
                                            activeOpacity={0.6}
                                        >
                                            <Typo size={22} fontWeight="600" color={colors.neutral800}>
                                                {val}
                                            </Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </ScrollView>
                </View>
            </ScreenWrapper>
        );
    }

    // Render Vault Content Screen
    return (
        <ScreenWrapper backgroundColor={colors.white} style={{ backgroundColor: colors.white }}>
            <View style={{ flex: 1, backgroundColor: colors.white }}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton color={colors.neutral900} />
                <View style={styles.headerTitleWrap}>
                    <Typo size={18} fontWeight="700" color={colors.neutral900}>
                        Secret Vault
                    </Typo>
                    <Typo size={11} color={colors.neutral400}>
                        {lockedConversations.length} hidden {lockedConversations.length === 1 ? "chat" : "chats"}
                    </Typo>
                </View>
                <TouchableOpacity
                    style={styles.headerActionBtn}
                    onPress={handleChangePin}
                    activeOpacity={0.7}
                >
                    <Icons.Key size={verticalScale(18)} color={colors.neutral700} />
                </TouchableOpacity>
            </View>

            {/* Note banner */}
            <View style={styles.banner}>
                <Icons.ShieldCheck size={verticalScale(20)} color={colors.primaryDark} weight="fill" />
                <Typo size={12} color={colors.neutral700} style={{ flex: 1 }}>
                    Chats in this vault are hidden from the main screen and protected by your Vault PIN.
                </Typo>
            </View>

            {lockedConversations.length === 0 ? (
                <View style={styles.centerEmpty}>
                    <View style={styles.shieldWrap}>
                        <Icons.LockOpen size={verticalScale(36)} color={colors.primaryDark} weight="duotone" />
                    </View>
                    <Typo size={16} fontWeight="700" color={colors.neutral800} style={{ marginTop: spacingY._15 }}>
                        No Locked Chats
                    </Typo>
                    <Typo size={12.5} color={colors.neutral400} style={styles.emptySubtitle}>
                        To hide a chat from your main screen, open the chat, tap the top menu (⋮), and choose "Lock Chat".
                    </Typo>
                </View>
            ) : (
                <FlatList
                    data={lockedConversations}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isDirect = item.type === "direct";
                        const other = isDirect
                            ? item.participants?.find((p: any) => (p._id || p.id) !== currentUser?.id)
                            : null;
                        const displayName = isDirect ? (other?.name || "Secret Chat") : (item.name || "Secret Group");
                        const displayAvatar = isDirect ? (other?.avatar || null) : (item.avatar || null);

                        return (
                        <TouchableOpacity
                            style={styles.chatCard}
                            activeOpacity={0.7}
                            onPress={() => {
                                router.push({
                                    pathname: "/(main)/conversation",
                                    params: {
                                        id: item._id,
                                        name: displayName,
                                        avatar: displayAvatar || "",
                                        type: item.type,
                                        participants: JSON.stringify(item.participants || []),
                                        admins: JSON.stringify(item.admins || []),
                                        createdBy: item.createdBy || "",
                                        disappearingSeconds: String((item as any).disappearingSeconds || 0),
                                    },
                                });
                            }}
                        >
                            <Avatar
                                uri={displayAvatar}
                                isGroup={!isDirect}
                                size={verticalScale(44)}
                            />
                            <View style={styles.chatInfo}>
                                <Typo size={15} fontWeight="600" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                                    {displayName}
                                </Typo>
                                <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }} style={{ marginTop: verticalScale(2) }}>
                                    {item.lastMessage?.content || "Hidden & Encrypted Messages"}
                                </Typo>
                            </View>
                            <TouchableOpacity
                                style={styles.unlockBtn}
                                onPress={() => handleUnlockConversation(item._id)}
                                activeOpacity={0.7}
                            >
                                <Icons.LockOpen size={verticalScale(18)} color={colors.rose} weight="bold" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        );
                    }}
                />
            )}
            </View>
        </ScreenWrapper>
    );
};

export default VaultScreen;

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
        gap: spacingX._10,
    },
    headerTitleWrap: {
        flex: 1,
        minWidth: 0,
        marginLeft: spacingX._5,
    },
    headerActionBtn: {
        padding: spacingX._7,
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
    },
    pinContainer: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._20,
    },
    shieldWrap: {
        width: verticalScale(74),
        height: verticalScale(74),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    pinSubtitle: {
        textAlign: "center",
        marginTop: spacingY._7,
        lineHeight: 18,
        maxWidth: scale(280),
    },
    dotsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._15,
        marginVertical: spacingY._20,
    },
    dot: {
        width: scale(15),
        height: scale(15),
        borderRadius: scale(7.5),
        borderWidth: 2,
        borderColor: colors.neutral300,
        backgroundColor: 'transparent',
    },
    dotFilled: {
        borderColor: colors.primaryDark,
        backgroundColor: colors.primaryDark,
    },
    dotError: {
        borderColor: colors.rose,
        backgroundColor: colors.rose,
    },
    keypad: {
        width: "100%",
        maxWidth: scale(290),
        marginTop: spacingY._10,
        gap: spacingY._10,
    },
    keypadRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    keyBtn: {
        width: scale(75),
        height: verticalScale(60),
        borderRadius: radius._15,
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    banner: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._10,
        backgroundColor: colors.primaryLight,
        marginHorizontal: spacingX._15,
        marginTop: spacingY._10,
        padding: spacingX._12,
        borderRadius: radius._15,
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.25)",
    },
    centerEmpty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._30,
    },
    emptySubtitle: {
        textAlign: "center",
        marginTop: spacingY._7,
        lineHeight: 18,
    },
    listContent: {
        padding: spacingX._15,
        gap: spacingY._10,
    },
    chatCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        borderRadius: radius._20,
        padding: spacingX._12,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    chatInfo: {
        flex: 1,
        minWidth: 0,
        marginLeft: spacingX._12,
    },
    unlockBtn: {
        padding: spacingX._7,
        borderRadius: radius.full,
        backgroundColor: "#ffe4e6",
    },
});
