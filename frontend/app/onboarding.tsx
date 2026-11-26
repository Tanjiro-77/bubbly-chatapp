import React, { useRef, useState, useCallback, useEffect } from "react";
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
    AppState,
    AppStateStatus,
} from "react-native";
import { BubblyAlert } from "../components/BubblyAlert";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@react-native-vector-icons/material-icons";

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
import { markOnboardingCompleted } from "../hooks/useOnboarding";
import {
    checkAllPermissions,
    requestPermissionByKey,
    openDeviceSettings,
    AllPermissionsStatus,
    PermissionKey,
    PERMISSION_METADATA,
} from "../services/permissionService";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DOT_SMALL_WIDTH = scale(7);
const DOT_ACTIVE_WIDTH = scale(22);
const ARROW_SHIFT = scale(4);

interface Slide {
    id: string;
    icon: IconName;
    title: string;
    subtitle: string;
    type?: "intro" | "permissions" | "complete";
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
            "A modern, warm, real-time messaging space built for personal, genuine connection.",
        type: "intro",
        accentColor: "#facc15",
        bgGradient: ["#fffbeb", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "✨ Welcome",
    },
    {
        id: "messaging",
        icon: "send",
        title: "Instant Messaging",
        subtitle:
            "Send messages in real time with typing indicators, delivery receipts, replies, and 1-tap Spanish translations.",
        type: "intro",
        accentColor: "#f59e0b",
        bgGradient: ["#fffbeb", "#fef3c7", "#fde68a"],
        illustrationBg: "#fde68a",
        badge: "⚡ Real-Time",
    },
    {
        id: "calls",
        icon: "call",
        title: "Voice & Video Calls",
        subtitle:
            "Crystal-clear audio and video calls powered by Agora — connect face-to-face with your contacts anywhere.",
        type: "intro",
        accentColor: "#eab308",
        bgGradient: ["#fefce8", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "📞 HD Calls",
    },
    {
        id: "stories",
        icon: "auto-awesome",
        title: "Stories, Polls & Groups",
        subtitle:
            "Share 24-hour visual stories, run group polls, and browse shared media galleries effortlessly.",
        type: "intro",
        accentColor: "#d97706",
        bgGradient: ["#fffbeb", "#fef9c3", "#fef08a"],
        illustrationBg: "#fef08a",
        badge: "📸 Moments",
    },
    {
        id: "permissions",
        icon: "security",
        title: "Permission Setup",
        subtitle:
            "Choose the permissions you want to enable for calling, voice notes, media sharing, and instant alerts.",
        type: "permissions",
        accentColor: "#ca8a04",
        bgGradient: ["#fefce8", "#fef3c7", "#fde68a"],
        illustrationBg: "#fde68a",
        badge: "🔒 Permissions",
    },
    {
        id: "complete",
        icon: "check-circle",
        title: "You're All Set!",
        subtitle:
            "Your Bubbly space is prepared and ready. Let's jump in and start connecting.",
        type: "complete",
        accentColor: "#16a34a",
        bgGradient: ["#f0fdf4", "#dcfce7", "#bbf7d0"],
        illustrationBg: "#bbf7d0",
        badge: "🚀 Ready",
    },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

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
        const floatY = Math.sin(scrollX.value / 100 + delay) * 8;
        const opacity = interpolate(
            progress,
            [0, 0.5, 1],
            [0.15, 0.4, 0.15],
            Extrapolation.CLAMP
        );
        return { transform: [{ translateY: floatY }], opacity };
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

const BackgroundGradient: React.FC<{ scrollX: SharedValue<number> }> = ({
    scrollX,
}) => {
    const animStyle = useAnimatedStyle(() => {
        const index = scrollX.value / SCREEN_WIDTH;
        const opacity = interpolate(
            index % 1,
            [0, 0.5, 1],
            [1, 0.85, 1],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    return (
        <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
            <LinearGradient
                colors={["#fffbeb", "#fef9c3", "#fefce8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar
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
        return { width: progress };
    });

    return (
        <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { width: TRACK_WIDTH }]}>
                <Animated.View style={[styles.progressGlow, animatedFillStyle]} />
                <Animated.View style={[styles.progressFill, animatedFillStyle]}>
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
        const widthVal = interpolate(
            scrollX.value,
            inputRange,
            [DOT_SMALL_WIDTH, DOT_ACTIVE_WIDTH, DOT_SMALL_WIDTH],
            Extrapolation.CLAMP
        );
        const opacityVal = interpolate(
            scrollX.value,
            inputRange,
            [0.35, 1, 0.35],
            Extrapolation.CLAMP
        );
        return { width: widthVal, opacity: opacityVal };
    });

    return (
        <Animated.View
            style={[
                styles.dot,
                animStyle,
                { backgroundColor: colors.primary },
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
// Permission Item Card for Onboarding Slide 5
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionSetupCardProps {
    permissions: AllPermissionsStatus;
    onRequestPermission: (key: PermissionKey) => void;
    onEnableAll: () => void;
}

const PermissionSetupCard: React.FC<PermissionSetupCardProps> = ({
    permissions,
    onRequestPermission,
    onEnableAll,
}) => {
    const permKeys: PermissionKey[] = [
        "camera",
        "microphone",
        "mediaLibrary",
        "notifications",
        "contacts",
    ];

    const allGranted = permKeys.every((k) => permissions[k]?.granted);

    return (
        <View style={styles.permCardWrapper}>
            <View style={styles.permCard}>
                {permKeys.map((key, i) => {
                    const meta = PERMISSION_METADATA[key];
                    const isGranted = permissions[key]?.granted;
                    const canAsk = permissions[key]?.canAskAgain;

                    let iconName: IconName = "security";
                    if (key === "camera") iconName = "camera-alt";
                    if (key === "microphone") iconName = "mic";
                    if (key === "mediaLibrary") iconName = "photo-library";
                    if (key === "notifications") iconName = "notifications";
                    if (key === "contacts") iconName = "contacts";

                    return (
                        <View
                            key={key}
                            style={[
                                styles.permItemRow,
                                i < permKeys.length - 1 && styles.permItemBorder,
                            ]}
                        >
                            <View
                                style={[
                                    styles.permIconBadge,
                                    {
                                        backgroundColor: isGranted
                                            ? "#dcfce7"
                                            : "#fef3c7",
                                    },
                                ]}
                            >
                                <MaterialIcons
                                    name={iconName}
                                    size={scale(18)}
                                    color={isGranted ? "#16a34a" : "#d97706"}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Typo size={13.5} fontWeight="700" color={colors.neutral900}>
                                    {meta.title}
                                </Typo>
                                <Typo size={11} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                                    {meta.subtitle}
                                </Typo>
                            </View>

                            {isGranted ? (
                                <View style={styles.permGrantedBadge}>
                                    <MaterialIcons name="check" size={13} color="#16a34a" />
                                    <Typo size={11} fontWeight="700" color="#16a34a">
                                        Allowed
                                    </Typo>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.permAllowBtn}
                                    onPress={() => onRequestPermission(key)}
                                    activeOpacity={0.75}
                                >
                                    <Typo
                                        size={11}
                                        fontWeight="700"
                                        color={colors.neutral900}
                                    >
                                        {canAsk ? "Allow" : "Settings"}
                                    </Typo>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </View>

            {!allGranted && (
                <TouchableOpacity
                    style={styles.enableAllBtn}
                    onPress={onEnableAll}
                    activeOpacity={0.8}
                >
                    <MaterialIcons
                        name="check-circle"
                        size={scale(16)}
                        color={colors.neutral900}
                    />
                    <Typo size={13} fontWeight="700" color={colors.neutral900}>
                        Enable All Permissions
                    </Typo>
                </TouchableOpacity>
            )}
        </View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Slide Item
// ─────────────────────────────────────────────────────────────────────────────

const SlideItem: React.FC<{
    item: Slide;
    index: number;
    scrollX: SharedValue<number>;
    permissions: AllPermissionsStatus;
    onRequestPermission: (key: PermissionKey) => void;
    onEnableAll: () => void;
}> = ({
    item,
    index,
    scrollX,
    permissions,
    onRequestPermission,
    onEnableAll,
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
            transform: [{ scale: scaleVal }, { rotate: `${rotateVal}deg` }],
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
        return { transform: [{ translateY }], opacity };
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
        return { transform: [{ translateY }], opacity };
    });

    const ICON_SIZE = scale(100);

    return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Main Visual */}
            <Animated.View style={[iconContainerStyle, styles.iconWrapper]}>
                <View
                    style={[
                        styles.iconCard,
                        { width: ICON_SIZE, height: ICON_SIZE },
                    ]}
                >
                    <LinearGradient
                        colors={["#fffbeb", "#fef3c7"]}
                        style={[
                            StyleSheet.absoluteFill,
                            { borderRadius: radius._30 },
                        ]}
                    />
                    <View
                        style={[
                            styles.iconInnerGlow,
                            { backgroundColor: item.accentColor + "25" },
                        ]}
                    />
                    <MaterialIcons
                        name={item.icon}
                        size={scale(44)}
                        color={item.accentColor}
                    />
                </View>
            </Animated.View>

            {/* Badge */}
            {item.badge && (
                <View style={styles.badge}>
                    <LinearGradient
                        colors={[colors.primaryLight, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeGradient}
                    >
                        <Typo size={11} fontWeight="700" color={colors.neutral800}>
                            {item.badge}
                        </Typo>
                    </LinearGradient>
                </View>
            )}

            {/* Header Text */}
            <View style={styles.textContainer}>
                <Animated.View style={titleStyle}>
                    <Typo
                        size={25}
                        fontWeight="800"
                        color={colors.neutral900}
                        style={styles.slideTitle}
                    >
                        {item.title}
                    </Typo>
                </Animated.View>

                <Animated.View style={subtitleStyle}>
                    <Typo
                        size={14.5}
                        color={colors.neutral500}
                        fontWeight="400"
                        style={styles.slideSubtitle}
                    >
                        {item.subtitle}
                    </Typo>
                </Animated.View>
            </View>

            {/* Interactive Permissions List on Slide 5 */}
            {item.type === "permissions" && (
                <PermissionSetupCard
                    permissions={permissions}
                    onRequestPermission={onRequestPermission}
                    onEnableAll={onEnableAll}
                />
            )}
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
}> = ({ isLast, isReplay, onPress, scrollX, total }) => {
    const buttonScale = useSharedValue(1);

    const handlePress = () => {
        buttonScale.value = withSequence(
            withSpring(0.95, { damping: 10 }),
            withSpring(1, { damping: 10 })
        );
        onPress();
    };

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const arrowStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            scrollX.value,
            [0, SCREEN_WIDTH * (total - 1)],
            [0, 1],
            Extrapolation.CLAMP
        );
        const translateX = interpolate(
            progress,
            [0.85, 1],
            [0, ARROW_SHIFT],
            Extrapolation.CLAMP
        );
        return { transform: [{ translateX }] };
    });

    return (
        <Animated.View style={[styles.nextBtnWrapper, animStyle]}>
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
                        <Animated.View style={arrowStyle}>
                            <MaterialIcons
                                name="arrow-forward"
                                size={scale(20)}
                                color={colors.neutral900}
                            />
                        </Animated.View>
                    )}
                </LinearGradient>
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
}> = ({ isReplay, onSkip, scrollX }) => {
    const logoStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            [0, SCREEN_WIDTH],
            [1, 0.7],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    return (
        <View style={styles.header}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
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
                    style={{ letterSpacing: 0.5 }}
                >
                    Bubbly
                </Typo>
            </Animated.View>

            {!isReplay && (
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={onSkip}
                    activeOpacity={0.65}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <View style={styles.skipBtnInner}>
                        <Typo size={13} fontWeight="600" color={colors.neutral500}>
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
    const params = useLocalSearchParams<{ replay?: string }>();
    const isReplay = params.replay === "true";

    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList<Slide>>(null);
    const scrollX = useSharedValue(0);

    const isLast = activeIndex === SLIDES.length - 1;

    // Live permissions status
    const [permissions, setPermissions] = useState<AllPermissionsStatus>({
        camera: { granted: false, canAskAgain: true, status: "undetermined" },
        microphone: { granted: false, canAskAgain: true, status: "undetermined" },
        mediaLibrary: { granted: false, canAskAgain: true, status: "undetermined" },
        notifications: { granted: false, canAskAgain: true, status: "undetermined" },
        contacts: { granted: false, canAskAgain: true, status: "undetermined" },
    });

    const refreshPermissions = useCallback(async () => {
        try {
            const status = await checkAllPermissions();
            setPermissions(status);
        } catch (_) { }
    }, []);

    useEffect(() => {
        refreshPermissions();
        const sub = AppState.addEventListener(
            "change",
            (nextState: AppStateStatus) => {
                if (nextState === "active") refreshPermissions();
            }
        );
        return () => sub.remove();
    }, [refreshPermissions]);

    const handleRequestPermission = useCallback(
        async (key: PermissionKey) => {
            const current = permissions[key];
            if (!current.canAskAgain && !current.granted) {
                BubblyAlert.alert(
                    `${PERMISSION_METADATA[key].title} Permission`,
                    `Permission was previously denied. Please open Settings to grant access.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Open Settings",
                            onPress: () => openDeviceSettings(),
                        },
                    ]
                );
                return;
            }

            const updated = await requestPermissionByKey(key);
            setPermissions((prev) => ({ ...prev, [key]: updated }));
        },
        [permissions]
    );

    const handleEnableAllPermissions = useCallback(async () => {
        const keys: PermissionKey[] = [
            "camera",
            "microphone",
            "mediaLibrary",
            "notifications",
            "contacts",
        ];
        for (const k of keys) {
            if (!permissions[k].granted && permissions[k].canAskAgain) {
                const res = await requestPermissionByKey(k);
                setPermissions((prev) => ({ ...prev, [k]: res }));
            }
        }
    }, [permissions]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollX.value = e.contentOffset.x;
        },
    });

    const handleMomentumEnd = useCallback((e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(index);
    }, []);

    const handleFinish = useCallback(async () => {
        await markOnboardingCompleted();
        if (isReplay) {
            router.back();
        } else {
            router.replace("/(auth)/welcome");
        }
    }, [isReplay, router]);

    const handleNext = useCallback(() => {
        if (isLast) {
            handleFinish();
            return;
        }
        const nextIndex = activeIndex + 1;
        setActiveIndex(nextIndex);
        flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
        });
    }, [isLast, activeIndex, handleFinish]);

    const handleSkip = useCallback(async () => {
        await markOnboardingCompleted();
        if (isReplay) {
            router.back();
        } else {
            router.replace("/(auth)/welcome");
        }
    }, [isReplay, router]);

    const particles = [
        { size: scale(8), left: scale(20), top: verticalScale(120), delay: 0 },
        { size: scale(5), left: scale(60), top: verticalScale(200), delay: 1 },
        {
            size: scale(10),
            left: SCREEN_WIDTH - scale(40),
            top: verticalScale(150),
            delay: 2,
        },
        {
            size: scale(6),
            left: SCREEN_WIDTH - scale(80),
            top: verticalScale(250),
            delay: 0.5,
        },
        { size: scale(7), left: scale(40), top: verticalScale(320), delay: 1.5 },
    ];

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent
            />

            <BackgroundGradient scrollX={scrollX} />

            {/* Subtle floating particles */}
            {particles.map((p, i) => (
                <FloatingParticle
                    key={i}
                    size={p.size}
                    left={p.left}
                    top={p.top}
                    delay={p.delay}
                    scrollX={scrollX}
                    index={i}
                />
            ))}

            <Image
                source={require("@/assets/images/bgPattern.png")}
                style={styles.bgPattern}
                resizeMode="cover"
            />

            <Header
                isReplay={isReplay}
                onSkip={handleSkip}
                scrollX={scrollX}
            />

            <AnimatedFlatList
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }: ListRenderItemInfo<Slide>) => (
                    <SlideItem
                        item={item}
                        index={index}
                        scrollX={scrollX}
                        permissions={permissions}
                        onRequestPermission={handleRequestPermission}
                        onEnableAll={handleEnableAllPermissions}
                    />
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                onMomentumScrollEnd={handleMomentumEnd}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                onScrollToIndexFailed={({ index }) => {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index, animated: false });
                    }, 100);
                }}
                bounces={false}
                style={styles.flatList}
            />

            {/* Bottom Navigation Dock */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomCard}>
                    <LinearGradient
                        colors={[
                            "rgba(255,255,255,0.96)",
                            "rgba(255,251,235,0.98)",
                        ]}
                        style={StyleSheet.absoluteFill}
                    />

                    <ProgressBar
                        scrollX={scrollX}
                        total={SLIDES.length}
                        activeIndex={activeIndex}
                    />

                    <Dots
                        total={SLIDES.length}
                        activeIndex={activeIndex}
                        scrollX={scrollX}
                    />

                    <NextButton
                        isLast={isLast}
                        isReplay={isReplay}
                        onPress={handleNext}
                        scrollX={scrollX}
                        total={SLIDES.length}
                    />
                </View>
            </View>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fffbeb",
    },

    bgPattern: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "55%",
        opacity: 0.04,
    },

    particle: {
        position: "absolute",
        zIndex: 1,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._12,
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
                shadowColor: colors.primaryDark,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
            },
            android: { elevation: 4 },
        }),
    },

    skipBtn: {
        zIndex: 10,
    },

    skipBtnInner: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(6),
        paddingHorizontal: spacingX._10,
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },

    flatList: {
        flex: 1,
    },

    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._25,
        gap: spacingY._15,
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
        borderColor: colors.primary + "40",
        ...Platform.select({
            ios: {
                shadowColor: colors.primaryDark,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
            },
            android: { elevation: 8 },
        }),
    },

    iconInnerGlow: {
        position: "absolute",
        width: "70%",
        height: "70%",
        borderRadius: radius._20,
    },

    badge: {
        alignSelf: "center",
    },

    badgeGradient: {
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.primary + "40",
    },

    textContainer: {
        alignItems: "center",
        gap: spacingY._7,
    },

    slideTitle: {
        textAlign: "center",
        letterSpacing: 0.3,
        lineHeight: verticalScale(30),
    },

    slideSubtitle: {
        textAlign: "center",
        lineHeight: verticalScale(21),
        maxWidth: scale(300),
    },

    // ── Permission Setup Card ──
    permCardWrapper: {
        width: "100%",
        gap: spacingY._10,
        marginTop: spacingY._5,
    },

    permCard: {
        backgroundColor: colors.white,
        borderRadius: radius._20,
        borderWidth: 1,
        borderColor: colors.neutral200,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._8,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: { elevation: 2 },
        }),
    },

    permItemRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(10),
        gap: scale(10),
    },

    permItemBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.neutral200,
    },

    permIconBadge: {
        width: scale(32),
        height: scale(32),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
    },

    permGrantedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingVertical: verticalScale(3),
        paddingHorizontal: scale(8),
        borderRadius: radius.full,
        backgroundColor: "#dcfce7",
    },

    permAllowBtn: {
        paddingVertical: verticalScale(5),
        paddingHorizontal: scale(12),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },

    enableAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        paddingVertical: verticalScale(10),
        backgroundColor: colors.white,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.primary,
    },

    // ── Bottom Dock ──
    bottomBar: {
        paddingHorizontal: spacingX._20,
        paddingBottom: verticalScale(12),
        paddingTop: verticalScale(8),
    },

    bottomCard: {
        borderRadius: radius._20,
        overflow: "hidden",
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._15,
        gap: spacingY._12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary + "25",
        ...Platform.select({
            ios: {
                shadowColor: colors.primaryDark,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: { elevation: 8 },
        }),
    },

    progressContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._10,
        width: "100%",
    },

    progressTrack: {
        height: scale(4),
        borderRadius: radius.full,
        backgroundColor: colors.neutral200,
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
        backgroundColor: colors.primary + "30",
        zIndex: 0,
    },

    progressLabel: {
        minWidth: scale(32),
        textAlign: "right",
    },

    dotsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(5),
    },

    dot: {
        height: scale(7),
        borderRadius: radius.full,
    },

    nextBtnWrapper: {
        width: "100%",
    },

    nextBtnTouchable: {
        borderRadius: radius.full,
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: colors.primaryDark,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
            },
            android: { elevation: 6 },
        }),
    },

    nextBtnGradient: {
        height: verticalScale(54),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacingX._8,
        borderRadius: radius.full,
    },

    nextBtnText: {
        letterSpacing: 0.5,
    },
});
