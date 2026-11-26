import React, { useEffect, useRef, useState } from "react";
import {
    AlertButton,
    AlertOptions,
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { FullWindowOverlay } from "react-native-screens";
import { colors, gradients, radius } from "../constants/theme";
import { verticalScale } from "../utils/styling";
import Typo from "./Typo";

export type BubblyAlertTone = "amber" | "success" | "danger" | "info";

export interface BubblyAlertOptions extends AlertOptions {
    tone?: BubblyAlertTone;
}

interface QueuedAlert {
    id: number;
    title: string;
    message?: string;
    buttons: AlertButton[];
    options?: BubblyAlertOptions;
}

type Listener = () => void;

const queue: QueuedAlert[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function notify() {
    listeners.forEach((fn) => fn());
}

/**
 * Drop-in replacement for React Native's native Alert.alert
 * with Bubbly's Honey Amber glass card UI, contextual icon medallions,
 * smooth spring animation, and queued presentation.
 */
export function showBubblyAlert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: BubblyAlertOptions
) {
    const resolvedButtons: AlertButton[] =
        buttons && buttons.length > 0 ? buttons : [{ text: "Got it", style: "default" }];

    queue.push({
        id: nextId++,
        title,
        message,
        buttons: resolvedButtons,
        options,
    });
    notify();
}

export const BubblyAlert = {
    alert: showBubblyAlert,
};

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

function resolveAppearance(item: QueuedAlert): {
    tone: BubblyAlertTone;
    icon: IconName;
    gradient: readonly [string, string];
    haloBg: string;
    borderTint: string;
    badgeBg: string;
    badgeText: string;
    tag: string;
} {
    const title = (item.title || "").toLowerCase();
    const message = (item.message || "").toLowerCase();
    const combined = `${title} ${message}`;
    const hasDestructive = item.buttons.some((b) => b.style === "destructive");

    let tone: BubblyAlertTone = item.options?.tone || "amber";
    if (!item.options?.tone) {
        if (
            hasDestructive ||
            /\b(error|failed|fail|denied|unable|offline|invalid|missing|blocked|mismatch|expired|conflict|delete|remove|clear|leave|exit|report|warning|cannot)\b/.test(
                combined
            )
        ) {
            tone = "danger";
        } else if (
            /\b(success|saved|updated|shared|joined|added|copied|sent|done|cleared|unblocked|unlocked|ready|connected|restored|exported|thank you)\b/.test(
                combined
            )
        ) {
            tone = "success";
        } else if (/\b(info|about|hint|note|status|pin|qr|sync|vault)\b/.test(combined)) {
            tone = "info";
        } else {
            tone = "amber";
        }
    }

    let icon: IconName = "auto-awesome";
    if (/\b(delete|trash|clear|remove)\b/.test(combined)) {
        icon = "delete-outline";
    } else if (/\b(logout|log out|sign out)\b/.test(combined)) {
        icon = "logout";
    } else if (/\b(block|unblock)\b/.test(combined)) {
        icon = "block";
    } else if (/\b(permission|camera|microphone|mic|contacts|storage|gallery|photo)\b/.test(combined)) {
        icon = "admin-panel-settings";
    } else if (/\b(lock|vault|pin|security|password)\b/.test(combined)) {
        icon = "lock-outline";
    } else if (/\b(offline|network|connection|disconnect)\b/.test(combined)) {
        icon = "wifi-off";
    } else if (/\b(call|voice|video|ring)\b/.test(combined)) {
        icon = "call";
    } else if (/\b(star|favorite)\b/.test(combined)) {
        icon = "star";
    } else if (/\b(qr|scan)\b/.test(combined)) {
        icon = "qr-code-2";
    } else if (tone === "danger") {
        icon = "error-outline";
    } else if (tone === "success") {
        icon = "check-circle";
    } else if (tone === "info") {
        icon = "info-outline";
    }

    if (tone === "danger") {
        return {
            tone,
            icon,
            gradient: ["#f87171", "#dc2626"],
            haloBg: "rgba(239, 68, 68, 0.13)",
            borderTint: "rgba(239, 68, 68, 0.20)",
            badgeBg: "#fef2f2",
            badgeText: "#dc2626",
            tag: hasDestructive ? "CONFIRM ACTION" : "ATTENTION",
        };
    }

    if (tone === "success") {
        return {
            tone,
            icon,
            gradient: ["#34d399", "#059669"],
            haloBg: "rgba(16, 185, 129, 0.14)",
            borderTint: "rgba(16, 185, 129, 0.22)",
            badgeBg: "#ecfdf5",
            badgeText: "#059669",
            tag: "SUCCESS",
        };
    }

    if (tone === "info") {
        return {
            tone,
            icon,
            gradient: ["#fbbf24", "#d97706"],
            haloBg: "rgba(245, 158, 11, 0.15)",
            borderTint: "rgba(245, 158, 11, 0.25)",
            badgeBg: "#fef3c7",
            badgeText: "#b45309",
            tag: "BUBBLY",
        };
    }

    return {
        tone,
        icon,
        gradient: ["#fbbf24", "#d97706"],
        haloBg: "rgba(245, 158, 11, 0.16)",
        borderTint: "rgba(245, 158, 11, 0.25)",
        badgeBg: "#fef3c7",
        badgeText: "#b45309",
        tag: "BUBBLY",
    };
}

export const BubblyAlertHost: React.FC = () => {
    const [, setTick] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const translateAnim = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        const update = () => setTick((t) => t + 1);
        listeners.add(update);
        return () => {
            listeners.delete(update);
        };
    }, []);

    const current = queue[0] ?? null;

    useEffect(() => {
        if (!current) return;
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.88);
        translateAnim.setValue(12);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 95,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(translateAnim, {
                toValue: 0,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [current?.id, fadeAnim, scaleAnim, translateAnim]);

    const dismissWithCallback = (cb?: () => void) => {
        if (!current) return;
        queue.shift();
        notify();
        if (cb) {
            requestAnimationFrame(() => cb());
        }
    };

    const handleBackdropOrBack = () => {
        if (!current) return;
        if (current.options?.cancelable === false) return;
        const cancelBtn = current.buttons.find((b) => b.style === "cancel");
        dismissWithCallback(() => {
            if (cancelBtn?.onPress) cancelBtn.onPress();
            current.options?.onDismiss?.();
        });
    };

    if (!current) return null;

    const appearance = resolveAppearance(current);
    const buttons = current.buttons;
    const isRowLayout = buttons.length === 2;

    // Order side-by-side buttons with cancel on the left and primary on the right
    const orderedButtons =
        isRowLayout && buttons[1]?.style === "cancel" && buttons[0]?.style !== "cancel"
            ? [buttons[1], buttons[0]]
            : buttons;

    const overlayContent = (
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropOrBack} />

            <Animated.View
                style={[
                    styles.card,
                    {
                        borderColor: appearance.borderTint,
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
                    },
                ]}
            >
                {/* Top Warm Accent Strip */}
                <LinearGradient
                    colors={appearance.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.topStrip}
                />

                {/* Icon Medallion */}
                <View style={styles.medallionWrap}>
                    <View style={[styles.medallionHalo, { backgroundColor: appearance.haloBg }]}>
                        <LinearGradient
                            colors={appearance.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.medallionCore}
                        >
                            <MaterialIcons name={appearance.icon} size={26} color="#FFFFFF" />
                        </LinearGradient>
                    </View>
                </View>

                {/* Micro Tag Pill */}
                <View style={[styles.tagPill, { backgroundColor: appearance.badgeBg }]}>
                    <Typo
                        size={10}
                        fontWeight="800"
                        color={appearance.badgeText}
                        style={styles.tagText}
                    >
                        {appearance.tag}
                    </Typo>
                </View>

                {/* Title & Body */}
                <Typo size={18} fontWeight="800" color={colors.neutral900} style={styles.title}>
                    {current.title}
                </Typo>

                {!!current.message && (
                    <ScrollView
                        style={styles.messageScroll}
                        contentContainerStyle={styles.messageContainer}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <Typo size={14} color={colors.neutral600} style={styles.message}>
                            {current.message}
                        </Typo>
                    </ScrollView>
                )}

                {/* Action Buttons */}
                {buttons.length > 3 ? (
                    <ScrollView
                        style={styles.actionsScroll}
                        contentContainerStyle={styles.actionsStack}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {orderedButtons.map((btn, idx) => {
                            const isCancel = btn.style === "cancel";
                            const isDestructive = btn.style === "destructive";
                            const label = btn.text || (isCancel ? "Cancel" : "OK");

                            if (isCancel) {
                                return (
                                    <TouchableOpacity
                                        key={`${idx}-${label}`}
                                        activeOpacity={0.78}
                                        onPress={() => dismissWithCallback(() => btn.onPress?.())}
                                        style={[styles.btnBase, styles.btnCancel, styles.menuCancelSpacer]}
                                    >
                                        <Typo size={14} fontWeight="700" color={colors.neutral600}>
                                            {label}
                                        </Typo>
                                    </TouchableOpacity>
                                );
                            }

                            if (isDestructive) {
                                return (
                                    <TouchableOpacity
                                        key={`${idx}-${label}`}
                                        activeOpacity={0.82}
                                        onPress={() => dismissWithCallback(() => btn.onPress?.())}
                                        style={[styles.btnBase, styles.btnMenuDestructive]}
                                    >
                                        <Typo size={14} fontWeight="700" color={colors.rose}>
                                            {label}
                                        </Typo>
                                    </TouchableOpacity>
                                );
                            }

                            return (
                                <TouchableOpacity
                                    key={`${idx}-${label}`}
                                    activeOpacity={0.8}
                                    onPress={() => dismissWithCallback(() => btn.onPress?.())}
                                    style={[styles.btnBase, styles.btnMenuOption]}
                                >
                                    <Typo size={14} fontWeight="700" color={colors.neutral900}>
                                        {label}
                                    </Typo>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View
                        style={[
                            styles.actionsWrap,
                            isRowLayout ? styles.actionsRow : styles.actionsStack,
                        ]}
                    >
                        {orderedButtons.map((btn, idx) => {
                            const isCancel = btn.style === "cancel";
                            const isDestructive = btn.style === "destructive";
                            const label = btn.text || (isCancel ? "Cancel" : "OK");

                            if (isCancel) {
                                return (
                                    <TouchableOpacity
                                        key={`${idx}-${label}`}
                                        activeOpacity={0.78}
                                        onPress={() => dismissWithCallback(() => btn.onPress?.())}
                                        style={[styles.btnBase, styles.btnCancel, isRowLayout && styles.btnFlex]}
                                    >
                                        <Typo size={14} fontWeight="700" color={colors.neutral600}>
                                            {label}
                                        </Typo>
                                    </TouchableOpacity>
                                );
                            }

                            const btnGradient: readonly [string, string] = isDestructive
                                ? ["#ef4444", "#dc2626"]
                                : appearance.tone === "success"
                                ? ["#10b981", "#059669"]
                                : gradients.primary;

                            const textColor = isDestructive || appearance.tone === "success"
                                ? colors.white
                                : colors.neutral900;

                            return (
                                <TouchableOpacity
                                    key={`${idx}-${label}`}
                                    activeOpacity={0.85}
                                    onPress={() => dismissWithCallback(() => btn.onPress?.())}
                                    style={[
                                        styles.btnBase,
                                        styles.btnPrimaryWrap,
                                        isRowLayout && styles.btnFlex,
                                        isDestructive ? styles.btnDangerShadow : styles.btnAmberShadow,
                                    ]}
                                >
                                    <LinearGradient
                                        colors={btnGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.btnGradient}
                                    >
                                        <Typo size={14} fontWeight="800" color={textColor}>
                                            {label}
                                        </Typo>
                                    </LinearGradient>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </Animated.View>
        </Animated.View>
    );

    if (Platform.OS === "ios") {
        return <FullWindowOverlay>{overlayContent}</FullWindowOverlay>;
    }

    return (
        <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleBackdropOrBack}
        >
            {overlayContent}
        </Modal>
    );
};

export default BubblyAlert;

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(12, 10, 9, 0.62)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 22,
    },
    card: {
        width: "100%",
        maxWidth: 344,
        backgroundColor: "#FFFFFF",
        borderRadius: radius._30,
        borderCurve: "continuous",
        borderWidth: 1.5,
        overflow: "hidden",
        alignItems: "center",
        paddingTop: 22,
        paddingBottom: 20,
        paddingHorizontal: 20,
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.24,
        shadowRadius: 32,
        elevation: 20,
    },
    topStrip: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    medallionWrap: {
        marginBottom: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    medallionHalo: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: "center",
        justifyContent: "center",
    },
    medallionCore: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#d97706",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    tagPill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.full,
        marginBottom: 8,
    },
    tagText: {
        letterSpacing: 1.2,
    },
    title: {
        textAlign: "center",
        marginBottom: 6,
    },
    messageScroll: {
        maxHeight: verticalScale(180),
        width: "100%",
    },
    messageContainer: {
        paddingHorizontal: 4,
    },
    message: {
        textAlign: "center",
        lineHeight: 21,
    },
    actionsWrap: {
        width: "100%",
        marginTop: 20,
        gap: 10,
    },
    actionsScroll: {
        width: "100%",
        maxHeight: verticalScale(300),
        marginTop: 18,
    },
    menuCancelSpacer: {
        marginTop: 4,
    },
    btnMenuOption: {
        backgroundColor: "#fffbeb",
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.28)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
    },
    btnMenuDestructive: {
        backgroundColor: "#fef2f2",
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.25)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    actionsStack: {
        flexDirection: "column",
        gap: 10,
    },
    btnFlex: {
        flex: 1,
    },
    btnBase: {
        height: 48,
        borderRadius: radius.full,
        borderCurve: "continuous",
        overflow: "hidden",
    },
    btnCancel: {
        backgroundColor: colors.neutral100,
        borderWidth: 1,
        borderColor: colors.neutral200,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 14,
    },
    btnPrimaryWrap: {
        justifyContent: "center",
    },
    btnAmberShadow: {
        shadowColor: "#f59e0b",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 5,
    },
    btnDangerShadow: {
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 5,
    },
    btnGradient: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },
});
