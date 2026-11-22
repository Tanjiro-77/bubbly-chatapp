import React, { useRef, useState, useCallback } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
    Image,
    FlatList,
    ListRenderItemInfo,
    StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import * as Notifications from "expo-notifications";

import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolation,
    SharedValue,
    withSpring,
    withSequence,
} from "react-native-reanimated";

import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import Typo from "../components/Typo";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");

/*
 * IMPORTANT:
 * These values are calculated outside Reanimated worklets.
 * Calling scale() directly inside useAnimatedStyle can cause:
 *
 * [Worklets] Tried to synchronously call a Remote Function
 *
 * on newer Reanimated/Worklets versions.
 */
const DOT_SMALL_WIDTH = scale(7);
const DOT_ACTIVE_WIDTH = scale(22);
const ARROW_SHIFT = scale(4);

const AnimatedFlatList =
    Animated.createAnimatedComponent(FlatList<Slide>);

interface Slide {
    id: string;
    icon: IconName;
    title: string;
    subtitle: string;
    type?: "permission";
    accentColor: string;
    bgGradient: [string, string, string];
    illustrationBg: string;
    badge?: string;
}

const SLIDES: Slide[] = [
    {
        id: "welcome",
        icon: "chat-bubble",
        title: "Welcome to Bubbly",
        subtitle:
            "A real-time communication app built for seamless, personal connection.",
        accentColor: "#facc15",
        bgGradient: ["#fffbeb", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "✨ New",
    },
    {
        id: "messaging",
        icon: "send",
        title: "Instant Messaging",
        subtitle:
            "Send and receive messages in real time. Your conversations, always in sync.",
        accentColor: "#f59e0b",
        bgGradient: ["#fffbeb", "#fef3c7", "#fde68a"],
        illustrationBg: "#fde68a",
        badge: "⚡ Fast",
    },
    {
        id: "calls",
        icon: "call",
        title: "Voice & Video Calls",
        subtitle:
            "Crystal-clear voice and video calls — connect face to face, anywhere.",
        accentColor: "#eab308",
        bgGradient: ["#fefce8", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "📞 HD",
    },
    {
        id: "groups",
        icon: "group",
        title: "Group Chats",
        subtitle:
            "Create groups, share updates, and stay in sync with everyone at once.",
        accentColor: "#ca8a04",
        bgGradient: ["#fffbeb", "#fef3c7", "#fde68a"],
        illustrationBg: "#fde68a",
        badge: "👥 Social",
    },
    {
        id: "stories",
        icon: "auto-awesome",
        title: "Stories",
        subtitle:
            "Share moments with your contacts through photos and short stories.",
        accentColor: "#d97706",
        bgGradient: ["#fffbeb", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "📸 Live",
    },
    {
        id: "translation",
        icon: "translate",
        title: "Smart Translation",
        subtitle:
            "Chat across languages effortlessly — Bubbly translates messages for you.",
        accentColor: "#b45309",
        bgGradient: ["#fefce8", "#fef3c7", "#fde68a"],
        illustrationBg: "#fde68a",
        badge: "🌍 Global",
    },
    {
        id: "saved-scheduled",
        icon: "schedule",
        title: "Save & Schedule",
        subtitle:
            "Bookmark important messages, or schedule them to send at the perfect time.",
        accentColor: "#a16207",
        bgGradient: ["#fffbeb", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "⏰ Smart",
    },
    {
        id: "notifications",
        icon: "notifications-active",
        title: "Stay in the Loop",
        subtitle:
            "Turn on notifications so you never miss a message, call, or story.",
        type: "permission",
        accentColor: "#facc15",
        bgGradient: ["#fffbeb", "#fef3c7", "#fde68a"],
        illustrationBg: "#fde68a",
        badge: "🔔 Alerts",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Floating Particle
// ─────────────────────────────────────────────────────────────────────────────

const FloatingParticle: React.FC<{
    size: number;
    left: number;
    top: number;
    delay: number;
    scrollX: SharedValue<number>;
    index: number;
}> = ({ size, left, top, delay, scrollX }) => {
    const animStyle = useAnimatedStyle(() => {
        const progress = (scrollX.value / SCREEN_WIDTH) % 1;

        const floatY =
            Math.sin(scrollX.value / 100 + delay) * 8;

        const opacity = interpolate(
            progress,
            [0, 0.5, 1],
            [0.15, 0.4, 0.15],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ translateY: floatY }],
            opacity,
        };
    });

    return (
        <Animated.View
            style={[
                styles.particle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left,
                    top,
                    backgroundColor: colors.primary,
                },
                animStyle,
            ]}
        />
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Background Gradient
// ─────────────────────────────────────────────────────────────────────────────

const BackgroundGradient: React.FC<{
    scrollX: SharedValue<number>;
}> = ({ scrollX }) => {
    const animStyle = useAnimatedStyle(() => {
        const index = scrollX.value / SCREEN_WIDTH;

        const opacity = interpolate(
            index % 1,
            [0, 0.5, 1],
            [1, 0.85, 1],
            Extrapolation.CLAMP
        );

        return {
            opacity,
        };
    });

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                animStyle,
            ]}
        >
            <LinearGradient
                colors={[
                    "#fffbeb",
                    "#fef9c3",
                    "#fefce8",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress Indicator
// ─────────────────────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{
    scrollX: SharedValue<number>;
    total: number;
    activeIndex: number;
}> = ({ scrollX, total, activeIndex }) => {
    const TRACK_WIDTH = SCREEN_WIDTH - scale(48);

    const animatedFillStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            scrollX.value,
            [0, SCREEN_WIDTH * (total - 1)],
            [0, TRACK_WIDTH],
            Extrapolation.CLAMP
        );

        return {
            width: progress,
        };
    });

    return (
        <View style={styles.progressContainer}>
            <View
                style={[
                    styles.progressTrack,
                    {
                        width: TRACK_WIDTH,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.progressGlow,
                        animatedFillStyle,
                    ]}
                />

                <Animated.View
                    style={[
                        styles.progressFill,
                        animatedFillStyle,
                    ]}
                >
                    <LinearGradient
                        colors={[
                            colors.primaryLight,
                            colors.primary,
                            colors.primaryDark,
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </View>

            <Typo
                size={11}
                fontWeight="600"
                color={colors.neutral400}
                style={styles.progressLabel}
            >
                {activeIndex + 1} / {total}
            </Typo>
        </View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Dot Indicators
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedDot: React.FC<{
    index: number;
    activeIndex: number;
    scrollX: SharedValue<number>;
}> = ({ index, scrollX }) => {
    const animStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        /*
         * IMPORTANT:
         * Do NOT call scale() here.
         * Use pre-calculated constants instead.
         */
        const widthVal = interpolate(
            scrollX.value,
            inputRange,
            [
                DOT_SMALL_WIDTH,
                DOT_ACTIVE_WIDTH,
                DOT_SMALL_WIDTH,
            ],
            Extrapolation.CLAMP
        );

        const opacityVal = interpolate(
            scrollX.value,
            inputRange,
            [0.35, 1, 0.35],
            Extrapolation.CLAMP
        );

        return {
            width: widthVal,
            opacity: opacityVal,
        };
    });

    return (
        <Animated.View
            style={[
                styles.dot,
                animStyle,
                {
                    backgroundColor: colors.primary,
                },
            ]}
        />
    );
};

const Dots: React.FC<{
    total: number;
    activeIndex: number;
    scrollX: SharedValue<number>;
}> = ({ total, activeIndex, scrollX }) => (
    <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
            <AnimatedDot
                key={i}
                index={i}
                activeIndex={activeIndex}
                scrollX={scrollX}
            />
        ))}
    </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Illustration Rings
// ─────────────────────────────────────────────────────────────────────────────

const IllustrationRings: React.FC<{
    scrollX: SharedValue<number>;
    index: number;
    accentColor: string;
}> = ({ scrollX, index, accentColor }) => {
    const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
    ];

    const ring1Style = useAnimatedStyle(() => {
        const scale1 = interpolate(
            scrollX.value,
            inputRange,
            [0.7, 1, 0.7],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0, 0.12, 0],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale: scale1 }],
            opacity,
        };
    });

    const ring2Style = useAnimatedStyle(() => {
        const scale2 = interpolate(
            scrollX.value,
            inputRange,
            [0.6, 1, 0.6],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0, 0.08, 0],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale: scale2 }],
            opacity,
        };
    });

    const ICON_SIZE = scale(120);

    return (
        <>
            <Animated.View
                style={[
                    styles.ring,
                    {
                        width: ICON_SIZE * 2.1,
                        height: ICON_SIZE * 2.1,
                        borderRadius: ICON_SIZE * 2.1,
                        borderColor: accentColor,
                        top: -ICON_SIZE * 0.55,
                        left: -ICON_SIZE * 0.55,
                    },
                    ring1Style,
                ]}
            />

            <Animated.View
                style={[
                    styles.ring,
                    {
                        width: ICON_SIZE * 2.9,
                        height: ICON_SIZE * 2.9,
                        borderRadius: ICON_SIZE * 2.9,
                        borderColor: accentColor,
                        top: -ICON_SIZE * 0.95,
                        left: -ICON_SIZE * 0.95,
                    },
                    ring2Style,
                ]}
            />
        </>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Slide Item
// ─────────────────────────────────────────────────────────────────────────────

const SlideItem: React.FC<{
    item: Slide;
    index: number;
    scrollX: SharedValue<number>;
    notifGranted: boolean;
    onRequestNotifications: () => void;
}> = ({
    item,
    index,
    scrollX,
    notifGranted,
    onRequestNotifications,
}) => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const iconContainerStyle = useAnimatedStyle(() => {
            const scaleVal = interpolate(
                scrollX.value,
                inputRange,
                [0.6, 1, 0.6],
                Extrapolation.CLAMP
            );

            const rotateVal = interpolate(
                scrollX.value,
                inputRange,
                [-15, 0, 15],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0, 1, 0],
                Extrapolation.CLAMP
            );

            return {
                transform: [
                    { scale: scaleVal },
                    { rotate: `${rotateVal}deg` },
                ],
                opacity,
            };
        });

        const titleStyle = useAnimatedStyle(() => {
            const translateY = interpolate(
                scrollX.value,
                inputRange,
                [30, 0, -30],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0, 1, 0],
                Extrapolation.CLAMP
            );

            return {
                transform: [{ translateY }],
                opacity,
            };
        });

        const subtitleStyle = useAnimatedStyle(() => {
            const translateY = interpolate(
                scrollX.value,
                inputRange,
                [50, 0, -50],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0, 1, 0],
                Extrapolation.CLAMP
            );

            return {
                transform: [{ translateY }],
                opacity,
            };
        });

        const badgeStyle = useAnimatedStyle(() => {
            const translateX = interpolate(
                scrollX.value,
                inputRange,
                [-20, 0, 20],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0, 1, 0],
                Extrapolation.CLAMP
            );

            return {
                transform: [{ translateX }],
                opacity,
            };
        });

        const ICON_SIZE = scale(120);

        return (
            <View
                style={[
                    styles.slide,
                    {
                        width: SCREEN_WIDTH,
                    },
                ]}
            >
                {/* Icon Illustration */}
                <Animated.View
                    style={[
                        iconContainerStyle,
                        styles.iconWrapper,
                    ]}
                >
                    {/* Decorative Rings */}
                    <View style={{ position: "relative" }}>
                        <IllustrationRings
                            scrollX={scrollX}
                            index={index}
                            accentColor={item.accentColor}
                        />

                        {/* Main Icon Card */}
                        <View
                            style={[
                                styles.iconCard,
                                {
                                    width: ICON_SIZE,
                                    height: ICON_SIZE,
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={[
                                    "#fffbeb",
                                    "#fef3c7",
                                ]}
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        borderRadius: radius._30,
                                    },
                                ]}
                            />

                            {/* Inner glow */}
                            <View
                                style={[
                                    styles.iconInnerGlow,
                                    {
                                        backgroundColor:
                                            item.accentColor + "25",
                                    },
                                ]}
                            />

                            <MaterialIcons
                                name={item.icon}
                                size={scale(48)}
                                color={item.accentColor}
                            />

                            {/* Top-right sparkle */}
                            <View style={styles.sparkle}>
                                <MaterialIcons
                                    name="star"
                                    size={scale(10)}
                                    color={item.accentColor}
                                />
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Badge */}
                {item.badge && (
                    <Animated.View
                        style={[
                            styles.badge,
                            badgeStyle,
                        ]}
                    >
                        <LinearGradient
                            colors={[
                                colors.primaryLight,
                                colors.primary,
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.badgeGradient}
                        >
                            <Typo
                                size={11}
                                fontWeight="700"
                                color={colors.neutral800}
                            >
                                {item.badge}
                            </Typo>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Animated.View style={titleStyle}>
                        <Typo
                            size={26}
                            fontWeight="800"
                            color={colors.neutral900}
                            style={styles.slideTitle}
                        >
                            {item.title}
                        </Typo>
                    </Animated.View>

                    <Animated.View style={subtitleStyle}>
                        <Typo
                            size={15}
                            color={colors.neutral500}
                            fontWeight="400"
                            style={styles.slideSubtitle}
                        >
                            {item.subtitle}
                        </Typo>

                        {item.type === "permission" && (
                            <TouchableOpacity
                                style={[
                                    styles.permissionBtn,
                                    notifGranted &&
                                    styles.permissionBtnGranted,
                                ]}
                                onPress={onRequestNotifications}
                                activeOpacity={0.8}
                                disabled={notifGranted}
                            >
                                {notifGranted ? (
                                    <>
                                        <LinearGradient
                                            colors={[
                                                "#d1fae5",
                                                "#a7f3d0",
                                            ]}
                                            style={
                                                StyleSheet.absoluteFill
                                            }
                                        />

                                        <MaterialIcons
                                            name="check-circle"
                                            size={scale(18)}
                                            color="#16a34a"
                                        />

                                        <Typo
                                            size={13.5}
                                            fontWeight="700"
                                            color="#16a34a"
                                        >
                                            Notifications Enabled!
                                        </Typo>
                                    </>
                                ) : (
                                    <>
                                        <LinearGradient
                                            colors={[
                                                colors.primary,
                                                colors.primaryDark,
                                            ]}
                                            start={{
                                                x: 0,
                                                y: 0,
                                            }}
                                            end={{
                                                x: 1,
                                                y: 0,
                                            }}
                                            style={
                                                StyleSheet.absoluteFill
                                            }
                                        />

                                        <MaterialIcons
                                            name="notifications-active"
                                            size={scale(18)}
                                            color={
                                                colors.neutral900
                                            }
                                        />

                                        <Typo
                                            size={13.5}
                                            fontWeight="700"
                                            color={
                                                colors.neutral900
                                            }
                                        >
                                            Enable Notifications
                                        </Typo>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </View>
            </View>
        );
    };

// ─────────────────────────────────────────────────────────────────────────────
// Next Button
// ─────────────────────────────────────────────────────────────────────────────

const NextButton: React.FC<{
    isLast: boolean;
    isReplay: boolean;
    onPress: () => void;
    scrollX: SharedValue<number>;
    total: number;
}> = ({
    isLast,
    isReplay,
    onPress,
    scrollX,
    total,
}) => {
        const buttonScale = useSharedValue(1);

        const handlePress = () => {
            buttonScale.value = withSequence(
                withSpring(0.95, {
                    damping: 10,
                }),
                withSpring(1, {
                    damping: 10,
                })
            );

            onPress();
        };

        const animStyle = useAnimatedStyle(() => ({
            transform: [
                {
                    scale: buttonScale.value,
                },
            ],
        }));

        const arrowStyle = useAnimatedStyle(() => {
            const progress = interpolate(
                scrollX.value,
                [0, SCREEN_WIDTH * (total - 1)],
                [0, 1],
                Extrapolation.CLAMP
            );

            /*
             * IMPORTANT:
             * ARROW_SHIFT is calculated outside the worklet.
             */
            const translateX = interpolate(
                progress,
                [0.85, 1],
                [0, ARROW_SHIFT],
                Extrapolation.CLAMP
            );

            return {
                transform: [
                    {
                        translateX,
                    },
                ],
            };
        });

        return (
            <Animated.View
                style={[
                    styles.nextBtnWrapper,
                    animStyle,
                ]}
            >
                <TouchableOpacity
                    onPress={handlePress}
                    activeOpacity={0.9}
                    style={styles.nextBtnTouchable}
                >
                    <LinearGradient
                        colors={[
                            colors.primaryLight,
                            colors.primary,
                            colors.primaryDark,
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.nextBtnGradient}
                    >
                        <Typo
                            size={16}
                            fontWeight="800"
                            color={colors.neutral900}
                            style={styles.nextBtnText}
                        >
                            {isLast
                                ? isReplay
                                    ? "Done ✓"
                                    : "Get Started 🚀"
                                : "Continue"}
                        </Typo>

                        {!isLast && (
                            <Animated.View
                                style={arrowStyle}
                            >
                                <MaterialIcons
                                    name="arrow-forward"
                                    size={scale(20)}
                                    color={colors.neutral900}
                                />
                            </Animated.View>
                        )}
                    </LinearGradient>

                    {/* Button shine effect */}
                    <View style={styles.nextBtnShine} />
                </TouchableOpacity>
            </Animated.View>
        );
    };

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

const Header: React.FC<{
    isReplay: boolean;
    onSkip: () => void;
    scrollX: SharedValue<number>;
    total: number;
}> = ({
    isReplay,
    onSkip,
    scrollX,
}) => {
        const logoStyle = useAnimatedStyle(() => {
            const opacity = interpolate(
                scrollX.value,
                [0, SCREEN_WIDTH],
                [1, 0.7],
                Extrapolation.CLAMP
            );

            return {
                opacity,
            };
        });

        return (
            <View style={styles.header}>
                <Animated.View
                    style={[
                        styles.logoContainer,
                        logoStyle,
                    ]}
                >
                    <LinearGradient
                        colors={[
                            colors.primary,
                            colors.primaryDark,
                        ]}
                        style={styles.logoGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <MaterialIcons
                            name="chat-bubble"
                            size={scale(18)}
                            color={colors.neutral900}
                        />
                    </LinearGradient>

                    <Typo
                        size={16}
                        fontWeight="800"
                        color={colors.neutral900}
                        style={{
                            letterSpacing: 0.5,
                        }}
                    >
                        Bubbly
                    </Typo>
                </Animated.View>

                {!isReplay && (
                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={onSkip}
                        activeOpacity={0.65}
                        hitSlop={{
                            top: 12,
                            bottom: 12,
                            left: 12,
                            right: 12,
                        }}
                    >
                        <View style={styles.skipBtnInner}>
                            <Typo
                                size={13}
                                fontWeight="600"
                                color={colors.neutral500}
                            >
                                Skip
                            </Typo>

                            <MaterialIcons
                                name="chevron-right"
                                size={scale(16)}
                                color={colors.neutral400}
                            />
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const params =
        useLocalSearchParams<{
            replay?: string;
        }>();

    const isReplay = params.replay === "true";

    const [activeIndex, setActiveIndex] =
        useState(0);

    const [notifGranted, setNotifGranted] =
        useState(false);

    const flatListRef =
        useRef<FlatList<Slide>>(null);

    const scrollX = useSharedValue(0);

    const isLast =
        activeIndex === SLIDES.length - 1;

    const scrollHandler =
        useAnimatedScrollHandler({
            onScroll: (e) => {
                scrollX.value =
                    e.contentOffset.x;
            },
        });

    const handleMomentumEnd =
        useCallback((e: any) => {
            const index = Math.round(
                e.nativeEvent.contentOffset.x /
                SCREEN_WIDTH
            );

            setActiveIndex(index);
        }, []);

    const requestNotificationPermission =
        useCallback(async () => {
            try {
                const {
                    status: existing,
                } =
                    await Notifications.getPermissionsAsync();

                let finalStatus = existing;

                if (existing !== "granted") {
                    const {
                        status,
                    } =
                        await Notifications.requestPermissionsAsync();

                    finalStatus = status;
                }

                setNotifGranted(
                    finalStatus === "granted"
                );
            } catch (_) {
                // Ignore permission errors.
            }
        }, []);

    const handleFinish =
        useCallback(() => {
            if (isReplay) {
                router.back();
            } else {
                router.replace(
                    "/(auth)/welcome"
                );
            }
        }, [
            isReplay,
            router,
        ]);

    const handleNext =
        useCallback(() => {
            if (isLast) {
                handleFinish();
                return;
            }

            flatListRef.current?.scrollToIndex(
                {
                    index:
                        activeIndex + 1,
                    animated: true,
                }
            );
        }, [
            isLast,
            activeIndex,
            handleFinish,
        ]);

    const handleSkip =
        useCallback(() => {
            router.replace(
                "/(auth)/welcome"
            );
        }, [router]);

    const particles = [
        {
            size: scale(8),
            left: scale(20),
            top: verticalScale(120),
            delay: 0,
        },
        {
            size: scale(5),
            left: scale(60),
            top: verticalScale(200),
            delay: 1,
        },
        {
            size: scale(10),
            left:
                SCREEN_WIDTH -
                scale(40),
            top: verticalScale(150),
            delay: 2,
        },
        {
            size: scale(6),
            left:
                SCREEN_WIDTH -
                scale(80),
            top: verticalScale(250),
            delay: 0.5,
        },
        {
            size: scale(7),
            left: scale(40),
            top: verticalScale(320),
            delay: 1.5,
        },
    ];

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop:
                        insets.top,
                    paddingBottom:
                        insets.bottom,
                },
            ]}
        >
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent
            />

            {/* Background */}
            <BackgroundGradient
                scrollX={scrollX}
            />

            {/* Decorative top wave */}
            <View
                style={
                    styles.topDecoration
                }
            >
                <LinearGradient
                    colors={[
                        colors.primary +
                        "30",
                        colors.primaryLight +
                        "15",
                        "transparent",
                    ]}
                    style={
                        styles.topWave
                    }
                    start={{
                        x: 0,
                        y: 0,
                    }}
                    end={{
                        x: 1,
                        y: 1,
                    }}
                />
            </View>

            {/* Floating particles */}
            {particles.map(
                (p, i) => (
                    <FloatingParticle
                        key={i}
                        size={p.size}
                        left={p.left}
                        top={p.top}
                        delay={p.delay}
                        scrollX={
                            scrollX
                        }
                        index={i}
                    />
                )
            )}

            {/* Subtle bg image */}
            <Image
                source={require("@/assets/images/bgPattern.png")}
                style={
                    styles.bgPattern
                }
                resizeMode="cover"
            />

            {/* Header */}
            <Header
                isReplay={isReplay}
                onSkip={handleSkip}
                scrollX={scrollX}
                total={
                    SLIDES.length
                }
            />

            {/* Slides */}
            <AnimatedFlatList
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={(item) =>
                    item.id
                }
                renderItem={({
                    item,
                    index,
                }: ListRenderItemInfo<Slide>) => (
                    <SlideItem
                        item={item}
                        index={index}
                        scrollX={
                            scrollX
                        }
                        notifGranted={
                            notifGranted
                        }
                        onRequestNotifications={
                            requestNotificationPermission
                        }
                    />
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={
                    false
                }
                onScroll={
                    scrollHandler
                }
                onMomentumScrollEnd={
                    handleMomentumEnd
                }
                scrollEventThrottle={
                    16
                }
                bounces={false}
                style={
                    styles.flatList
                }
            />

            {/* Bottom Bar */}
            <View
                style={
                    styles.bottomBar
                }
            >
                {/* Glass card effect */}
                <View
                    style={
                        styles.bottomCard
                    }
                >
                    <LinearGradient
                        colors={[
                            "rgba(255,255,255,0.95)",
                            "rgba(255,251,235,0.98)",
                        ]}
                        style={
                            StyleSheet.absoluteFill
                        }
                    />

                    <ProgressBar
                        scrollX={
                            scrollX
                        }
                        total={
                            SLIDES.length
                        }
                        activeIndex={
                            activeIndex
                        }
                    />

                    <Dots
                        total={
                            SLIDES.length
                        }
                        activeIndex={
                            activeIndex
                        }
                        scrollX={
                            scrollX
                        }
                    />

                    <NextButton
                        isLast={isLast}
                        isReplay={
                            isReplay
                        }
                        onPress={
                            handleNext
                        }
                        scrollX={
                            scrollX
                        }
                        total={
                            SLIDES.length
                        }
                    />
                </View>
            </View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const ICON_BOX = scale(120);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fffbeb",
    },

    // Background
    bgPattern: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "55%",
        opacity: 0.04,
    },

    topDecoration: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: verticalScale(220),
        zIndex: 0,
    },

    topWave: {
        flex: 1,
        borderBottomLeftRadius:
            radius._60,
        borderBottomRightRadius:
            radius._60,
    },

    particle: {
        position: "absolute",
        zIndex: 1,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal:
            spacingX._20,
        paddingVertical:
            spacingY._12,
        zIndex: 10,
    },

    logoContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._8,
    },

    logoGradient: {
        width: scale(32),
        height: scale(32),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",

        ...Platform.select({
            ios: {
                shadowColor:
                    colors.primaryDark,
                shadowOffset: {
                    width: 0,
                    height: 3,
                },
                shadowOpacity: 0.3,
                shadowRadius: 6,
            },

            android: {
                elevation: 4,
            },
        }),
    },

    skipBtn: {
        zIndex: 10,
    },

    skipBtnInner: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical:
            verticalScale(6),
        paddingHorizontal:
            spacingX._8,
        backgroundColor:
            colors.neutral100,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor:
            colors.neutral200,
    },

    // Slide
    flatList: {
        flex: 1,
    },

    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal:
            spacingX._30,
        gap: spacingY._20,
    },

    iconWrapper: {
        alignItems: "center",
        justifyContent: "center",
    },

    iconCard: {
        borderRadius: radius._30,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor:
            colors.primary + "40",

        ...Platform.select({
            ios: {
                shadowColor:
                    colors.primaryDark,
                shadowOffset: {
                    width: 0,
                    height: 12,
                },
                shadowOpacity: 0.2,
                shadowRadius: 20,
            },

            android: {
                elevation: 8,
            },
        }),
    },

    iconInnerGlow: {
        position: "absolute",
        width: "70%",
        height: "70%",
        borderRadius:
            radius._20,
    },

    ring: {
        position: "absolute",
        borderWidth: 1.5,
        borderStyle: "dashed",
    },

    sparkle: {
        position: "absolute",
        top: scale(10),
        right: scale(10),
    },

    // Badge
    badge: {
        alignSelf: "center",
        marginTop:
            -spacingY._10,
    },

    badgeGradient: {
        paddingHorizontal:
            spacingX._12,
        paddingVertical:
            verticalScale(5),
        borderRadius:
            radius.full,
        borderWidth: 1,
        borderColor:
            colors.primary + "40",
    },

    // Text
    textContainer: {
        alignItems: "center",
        gap: spacingY._10,
    },

    slideTitle: {
        textAlign: "center",
        letterSpacing: 0.3,
        lineHeight:
            verticalScale(33),
    },

    slideSubtitle: {
        textAlign: "center",
        lineHeight:
            verticalScale(23),
        maxWidth: scale(290),
        marginTop:
            verticalScale(4),
    },

    // Permission Button
    permissionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(8),
        marginTop:
            spacingY._20,
        paddingVertical:
            verticalScale(14),
        paddingHorizontal:
            scale(28),
        borderRadius:
            radius.full,
        alignSelf: "center",
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor:
            colors.primary + "60",

        ...Platform.select({
            ios: {
                shadowColor:
                    colors.primaryDark,
                shadowOffset: {
                    width: 0,
                    height: 4,
                },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },

            android: {
                elevation: 4,
            },
        }),
    },

    permissionBtnGranted: {
        borderColor:
            "#16a34a40",
    },

    // Bottom Bar
    bottomBar: {
        paddingHorizontal:
            spacingX._20,
        paddingBottom:
            verticalScale(12),
        paddingTop:
            verticalScale(8),
    },

    bottomCard: {
        borderRadius:
            radius._20,
        overflow: "hidden",
        paddingHorizontal:
            spacingX._20,
        paddingVertical:
            spacingY._15,
        gap: spacingY._12,
        alignItems: "center",
        borderWidth: 1,
        borderColor:
            colors.primary + "25",

        ...Platform.select({
            ios: {
                shadowColor:
                    colors.primaryDark,
                shadowOffset: {
                    width: 0,
                    height: -4,
                },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },

            android: {
                elevation: 8,
            },
        }),
    },

    // Progress Bar
    progressContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._10,
        width: "100%",
    },

    progressTrack: {
        height: scale(4),
        borderRadius: radius.full,
        backgroundColor:
            colors.neutral200,
        overflow: "visible",
        flex: 1,
    },

    progressFill: {
        height: "100%",
        borderRadius: radius.full,
        overflow: "hidden",
    },

    progressGlow: {
        position: "absolute",
        top: -scale(2),
        height: scale(8),
        borderRadius: radius.full,
        backgroundColor:
            colors.primary + "30",
        zIndex: 0,
    },

    progressLabel: {
        minWidth: scale(32),
        textAlign: "right",
    },

    // Dots
    dotsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(5),
    },

    dot: {
        height: scale(7),
        borderRadius: radius.full,
    },

    // Next Button
    nextBtnWrapper: {
        width: "100%",
    },

    nextBtnTouchable: {
        borderRadius: radius.full,
        overflow: "hidden",

        ...Platform.select({
            ios: {
                shadowColor:
                    colors.primaryDark,
                shadowOffset: {
                    width: 0,
                    height: 6,
                },
                shadowOpacity: 0.35,
                shadowRadius: 12,
            },

            android: {
                elevation: 6,
            },
        }),
    },

    nextBtnGradient: {
        height: verticalScale(56),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacingX._8,
        borderRadius: radius.full,
    },

    nextBtnText: {
        letterSpacing: 0.5,
    },

    nextBtnShine: {
        position: "absolute",
        top: 0,
        left: "10%",
        width: "35%",
        height: "50%",
        backgroundColor:
            "rgba(255,255,255,0.2)",
        borderBottomLeftRadius:
            radius.full,
        borderBottomRightRadius:
            radius.full,
    },
});