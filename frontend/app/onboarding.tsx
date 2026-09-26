/**
 * frontend/app/onboarding.tsx
 *
 * First-time onboarding experience.
 * Expanded with real feature highlights (groups, translation, saved &
 * scheduled messages) pulled from actual backend capabilities, plus a
 * functional notification permission request slide.
 *
 * Uses Reanimated for scroll-driven per-slide animations and an animated
 * progress bar instead of static dots only.
 */

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
} from "react-native-reanimated";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import Typo from "../components/Typo";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

interface Slide {
    id: string;
    icon: IconName;
    title: string;
    subtitle: string;
    type?: "permission";
}

const SLIDES: Slide[] = [
    {
        id: "welcome",
        icon: "chat-bubble",
        title: "Welcome to Bubbly",
        subtitle:
            "A real-time communication app built for seamless, personal connection.",
    },
    {
        id: "messaging",
        icon: "send",
        title: "Instant Messaging",
        subtitle:
            "Send and receive messages in real time. Your conversations, always in sync.",
    },
    {
        id: "calls",
        icon: "call",
        title: "Voice & Video Calls",
        subtitle:
            "Crystal-clear voice and video calls — connect face to face, anywhere.",
    },
    {
        id: "groups",
        icon: "group",
        title: "Group Chats",
        subtitle:
            "Create groups, share updates, and stay in sync with everyone at once.",
    },
    {
        id: "stories",
        icon: "auto-awesome",
        title: "Stories",
        subtitle:
            "Share moments with your contacts through photos and short stories.",
    },
    {
        id: "translation",
        icon: "translate",
        title: "Smart Translation",
        subtitle:
            "Chat across languages effortlessly — Bubbly translates messages for you.",
    },
    {
        id: "saved-scheduled",
        icon: "schedule",
        title: "Save & Schedule",
        subtitle:
            "Bookmark important messages, or schedule them to send at the perfect time.",
    },
    {
        id: "notifications",
        icon: "notifications-active",
        title: "Stay in the Loop",
        subtitle:
            "Turn on notifications so you never miss a message, call, or story.",
        type: "permission",
    },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

const PROGRESS_TRACK_WIDTH = SCREEN_WIDTH - scale(50) * 2;

const ProgressBar: React.FC<{ scrollX: SharedValue<number> }> = ({
    scrollX,
}) => {
    const total = SLIDES.length;

    const animatedStyle = useAnimatedStyle(() => {
        const progress = interpolate(
            scrollX.value,
            [0, SCREEN_WIDTH * (total - 1)],
            [0, PROGRESS_TRACK_WIDTH],
            Extrapolation.CLAMP
        );
        return { width: progress };
    });

    return (
        <View style={[styles.progressTrack, { width: PROGRESS_TRACK_WIDTH }]}>
            <Animated.View style={[styles.progressFill, animatedStyle]} />
        </View>
    );
};

// ─── Individual animated slide ────────────────────────────────────────────────

const SlideItem: React.FC<{
    item: Slide;
    index: number;
    scrollX: SharedValue<number>;
    notifGranted: boolean;
    onRequestNotifications: () => void;
}> = ({ item, index, scrollX, notifGranted, onRequestNotifications }) => {
    const inputRange = [
        (index - 1) * SCREEN_WIDTH,
        index * SCREEN_WIDTH,
        (index + 1) * SCREEN_WIDTH,
    ];

    const animatedIconStyle = useAnimatedStyle(() => {
        const scaleVal = interpolate(
            scrollX.value,
            inputRange,
            [0.75, 1, 0.75],
            Extrapolation.CLAMP
        );
        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
        );
        return { transform: [{ scale: scaleVal }], opacity };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollX.value,
            inputRange,
            [16, 0, 16],
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

    return (
        <View style={styles.slide}>
            <Animated.View style={[styles.iconBox, animatedIconStyle]}>
                <MaterialIcons name={item.icon} size={46} color={colors.primaryDark} />
            </Animated.View>

            <Animated.View style={animatedTextStyle}>
                <Typo
                    size={23}
                    fontWeight="700"
                    color={colors.neutral900}
                    style={styles.slideTitle}
                >
                    {item.title}
                </Typo>
                <Typo
                    size={14}
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
                            notifGranted && styles.permissionBtnGranted,
                        ]}
                        onPress={onRequestNotifications}
                        activeOpacity={0.8}
                        disabled={notifGranted}
                    >
                        <MaterialIcons
                            name={notifGranted ? "check-circle" : "notifications"}
                            size={18}
                            color={notifGranted ? "#16a34a" : colors.neutral900}
                        />
                        <Typo
                            size={13.5}
                            fontWeight="600"
                            color={notifGranted ? "#16a34a" : colors.neutral900}
                        >
                            {notifGranted ? "Notifications Enabled" : "Enable Notifications"}
                        </Typo>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
};

// ─── Dot indicator ────────────────────────────────────────────────────────────

const Dots: React.FC<{ total: number; activeIndex: number }> = ({
    total,
    activeIndex,
}) => (
    <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
            <View
                key={i}
                style={[
                    styles.dot,
                    {
                        backgroundColor:
                            i === activeIndex ? colors.primary : colors.neutral300,
                        width: i === activeIndex ? scale(20) : scale(7),
                    },
                ]}
            />
        ))}
    </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ replay?: string }>();
    const isReplay = params.replay === "true";

    const [activeIndex, setActiveIndex] = useState(0);
    const [notifGranted, setNotifGranted] = useState(false);
    const flatListRef = useRef<FlatList<Slide>>(null);
    const scrollX = useSharedValue(0);

    const isLast = activeIndex === SLIDES.length - 1;

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollX.value = e.contentOffset.x;
        },
    });

    const handleMomentumEnd = useCallback((e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(index);
    }, []);

    const requestNotificationPermission = useCallback(async () => {
        try {
            const { status: existing } = await Notifications.getPermissionsAsync();
            let finalStatus = existing;
            if (existing !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            setNotifGranted(finalStatus === "granted");
        } catch (_) {
            // Device/simulator may not support push — fail silently
        }
    }, []);

    const handleFinish = useCallback(() => {
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
        flatListRef.current?.scrollToIndex({
            index: activeIndex + 1,
            animated: true,
        });
    }, [isLast, activeIndex, handleFinish]);

    const handleSkip = useCallback(() => {
        router.replace("/(auth)/welcome");
    }, [router]);

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <Image
                source={require("@/assets/images/bgPattern.png")}
                style={styles.bgPattern}
                resizeMode="cover"
            />

            {!isReplay && (
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handleSkip}
                    activeOpacity={0.65}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Typo size={13.5} fontWeight="500" color={colors.neutral400}>
                        Skip
                    </Typo>
                </TouchableOpacity>
            )}

            <AnimatedFlatList
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }: ListRenderItemInfo<Slide>) => (
                    <SlideItem
                        item={item}
                        index={index}
                        scrollX={scrollX}
                        notifGranted={notifGranted}
                        onRequestNotifications={requestNotificationPermission}
                    />
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                onMomentumScrollEnd={handleMomentumEnd}
                scrollEventThrottle={16}
                bounces={false}
                style={styles.flatList}
            />

            <View style={styles.bottomBar}>
                <ProgressBar scrollX={scrollX} />
                <Dots total={SLIDES.length} activeIndex={activeIndex} />

                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Typo size={15.5} fontWeight="700" color={colors.neutral900}>
                        {isLast ? (isReplay ? "Done" : "Get Started") : "Next"}
                    </Typo>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ICON_BOX = scale(120);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.neutral100 },
    bgPattern: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "45%",
        opacity: 0.06,
    },
    skipBtn: {
        position: "absolute",
        top: verticalScale(56),
        right: spacingX._20,
        zIndex: 10,
        paddingVertical: verticalScale(6),
        paddingHorizontal: spacingX._8,
    },
    flatList: { flex: 1 },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacingX._30,
        gap: spacingY._17,
    },
    iconBox: {
        width: ICON_BOX,
        height: ICON_BOX,
        borderRadius: radius._30,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primaryLight + "3D",
        borderWidth: 1,
        borderColor: colors.primary + "33",
        marginBottom: spacingY._10,
    },
    slideTitle: { textAlign: "center", letterSpacing: 0.2 },
    slideSubtitle: {
        textAlign: "center",
        lineHeight: verticalScale(21),
        maxWidth: scale(290),
        marginTop: verticalScale(6),
    },
    permissionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(8),
        marginTop: spacingY._20,
        paddingVertical: verticalScale(11),
        paddingHorizontal: scale(20),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignSelf: "center",
    },
    permissionBtnGranted: {
        backgroundColor: "#16a34a1F",
    },

    bottomBar: {
        paddingHorizontal: spacingX._25,
        paddingBottom: verticalScale(20),
        paddingTop: verticalScale(16),
        gap: spacingY._15,
        alignItems: "center",
    },
    progressTrack: {
        height: scale(3),
        borderRadius: radius.full,
        backgroundColor: colors.neutral200,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radius.full,
    },
    dotsRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
    dot: { height: scale(7), borderRadius: radius.full },
    nextBtn: {
        width: "100%",
        height: verticalScale(54),
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: colors.primaryDark,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: { elevation: 4 },
        }),
    },
});