import React, { useRef, useState, useCallback, useEffect } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Image,
    StatusBar,
    ScrollView,
    useWindowDimensions,
    AppState,
    AppStateStatus,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import * as Icons from "phosphor-react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolation,
    SharedValue,
    withSpring,
    withSequence,
    FadeInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BubblyAlert } from "../components/BubblyAlert";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import Typo from "../components/Typo";
import { markOnboardingCompleted } from "../hooks/useOnboarding";
import { hapticTap } from "../utils/haptics";
import {
    checkAllPermissions,
    requestPermissionByKey,
    openDeviceSettings,
    AllPermissionsStatus,
    PermissionKey,
    PERMISSION_METADATA,
} from "../services/permissionService";
import { registerForPushNotificationsAsync } from "../services/notificationService";

interface GuideRow {
    icon: "slash" | "bellSlash" | "handTap" | "microphone" | "sparkle" | "lock" | "palette" | "grid";
    title: string;
    detail: string;
}

interface Slide {
    id: string;
    badge: string;
    title: string;
    subtitle: string;
    type: "welcome" | "messaging" | "calls" | "features" | "permissions" | "complete";
    accent: string;
    guides?: GuideRow[];
}

const SLIDES: Slide[] = [
    {
        id: "welcome",
        badge: "FLAGSHIP MESSENGER",
        title: "Welcome to Bubbly",
        subtitle:
            "Obsidian craft meets instant connection. Fast chats, high-definition calls, and thoughtful controls in one cohesive home.",
        type: "welcome",
        accent: "#FACC15",
    },
    {
        id: "messaging",
        badge: "HOW TO CHAT FASTER",
        title: "Smart Messaging & Gestures",
        subtitle:
            "Every bubble hides helpful tools designed for effortless daily conversations:",
        type: "messaging",
        accent: "#F59E0B",
        guides: [
            { icon: "slash", title: "Type / for Quick Replies", detail: "Insert saved snippets like /omw, /busy, or /thx instantly." },
            { icon: "bellSlash", title: "Hold Send for Silent Mode", detail: "Deliver late-night messages without pinging the other phone." },
            { icon: "handTap", title: "Hold or Swipe Any Bubble", detail: "Swipe to reply, react cleanly, copy, star, or 1-tap translate." },
            { icon: "microphone", title: "Voice Speed & Seeking", detail: "Skip -5s/+5s or toggle 1x/1.5x/2x playback speed." },
        ],
    },
    {
        id: "calls",
        badge: "AGORA HD VOICE & VIDEO",
        title: "Calls That Never Miss",
        subtitle:
            "Crystal-clear voice and video calls with custom ringtones, speaker routing, and high-priority wake alerts even when Bubbly is closed.",
        type: "calls",
        accent: "#38BDF8",
    },
    {
        id: "features",
        badge: "EXPLORE MORE TOOLS",
        title: "Stories, Vault & Studio",
        subtitle:
            "Tap + inside any chat or explore Settings to unlock Bubbly's complete toolkit:",
        type: "features",
        accent: "#FB923C",
        guides: [
            { icon: "sparkle", title: "24h Story Studio", detail: "Share rich photo & gradient stories from the Home bar." },
            { icon: "lock", title: "Secret PIN Vault", detail: "Long-press a conversation on Home to hide it behind your Vault PIN." },
            { icon: "grid", title: "Live Interactive Cards", detail: "Send polls, shared checklists, bill splits, doodles & countdowns." },
            { icon: "palette", title: "Bubble Corner Studio", detail: "Customize corner styles, text size & accent swatches in Settings." },
        ],
    },
    {
        id: "permissions",
        badge: "SYSTEM ACCESS",
        title: "Enable Key Permissions",
        subtitle:
            "Grant access below so calling, voice messages, media sharing, and closed-app notifications work seamlessly.",
        type: "permissions",
        accent: "#FACC15",
    },
    {
        id: "complete",
        badge: "ALL SYSTEMS READY",
        title: "You're Ready to Connect",
        subtitle:
            "Your Bubbly workspace is tuned and ready. Jump right into real-time messaging and HD calling.",
        type: "complete",
        accent: "#22C55E",
    },
];

const renderGuideIcon = (kind: GuideRow["icon"], accent: string) => {
    const size = scale(16);
    switch (kind) {
        case "slash":
            return <Icons.Lightning size={size} color={accent} weight="fill" />;
        case "bellSlash":
            return <Icons.BellSlash size={size} color={accent} weight="fill" />;
        case "handTap":
            return <Icons.ChatsCircle size={size} color={accent} weight="fill" />;
        case "microphone":
            return <Icons.Waveform size={size} color={accent} weight="bold" />;
        case "sparkle":
            return <Icons.Sparkle size={size} color={accent} weight="fill" />;
        case "lock":
            return <Icons.LockKey size={size} color={accent} weight="fill" />;
        case "palette":
            return <Icons.Palette size={size} color={accent} weight="fill" />;
        case "grid":
            return <Icons.SquaresFour size={size} color={accent} weight="fill" />;
    }
};

const renderPermissionIcon = (key: PermissionKey, granted: boolean) => {
    const color = granted ? "#22C55E" : "#FACC15";
    const size = scale(17);
    switch (key) {
        case "camera":
            return <Icons.Camera size={size} color={color} weight="fill" />;
        case "microphone":
            return <Icons.Microphone size={size} color={color} weight="fill" />;
        case "mediaLibrary":
            return <Icons.Images size={size} color={color} weight="fill" />;
        case "notifications":
            return <Icons.BellRinging size={size} color={color} weight="fill" />;
        case "contacts":
            return <Icons.AddressBook size={size} color={color} weight="fill" />;
    }
};

const SlideVisualCard: React.FC<{
    item: Slide;
    isCompactHeight: boolean;
    permissions: AllPermissionsStatus;
    onRequestPermission: (key: PermissionKey) => void;
    onEnableAll: () => void;
}> = ({ item, isCompactHeight, permissions, onRequestPermission, onEnableAll }) => {
    if (item.type === "welcome") {
        return (
            <View style={styles.heroStage}>
                <LinearGradient
                    colors={["rgba(250, 204, 21, 0.55)", "rgba(245, 158, 11, 0.2)", "rgba(255,255,255,0.08)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.welcomeLogoOuter}
                >
                    <View style={styles.welcomeLogoInner}>
                        <ExpoImage
                            source={require("@/assets/images/splash-icon.png")}
                            style={styles.welcomeLogoImg}
                            contentFit="contain"
                        />
                    </View>
                </LinearGradient>

                <View style={styles.welcomePillarsRow}>
                    {[
                        { icon: Icons.Lightning, label: "Instant Sync" },
                        { icon: Icons.PhoneCall, label: "HD Calling" },
                        { icon: Icons.ShieldCheck, label: "Vault PIN" },
                    ].map(({ icon: IconCmp, label }) => (
                        <View key={label} style={styles.welcomePillarChip}>
                            <IconCmp size={scale(13)} color={colors.primary} weight="fill" />
                            <Typo size={11} fontWeight="700" color="rgba(255,255,255,0.9)">
                                {label}
                            </Typo>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    if (item.type === "calls") {
        return (
            <View style={styles.callStageCard}>
                <View style={styles.callMockHeader}>
                    <View style={styles.callStatusBadge}>
                        <View style={styles.callLiveDot} />
                        <Typo size={10.5} fontWeight="800" color="#38BDF8">
                            HD AGORA CHANNEL
                        </Typo>
                    </View>
                    <Typo size={11} fontWeight="600" color="rgba(255,255,255,0.55)">
                        4 Ringtones
                    </Typo>
                </View>

                <View style={styles.callMockCenter}>
                    <View style={styles.callAvatarRing}>
                        <Icons.PhoneCall size={scale(28)} color={colors.primary} weight="fill" />
                    </View>
                    <Typo size={14} fontWeight="700" color={colors.white} style={{ marginTop: verticalScale(8) }}>
                        Crystal Voice & Face-to-Face Video
                    </Typo>
                    <Typo size={11.5} color="rgba(255,255,255,0.62)" style={{ textAlign: "center" }}>
                        Smart audio handoff plays dial tones cleanly and keeps active calls steady across Wi-Fi & 4G switches.
                    </Typo>
                </View>

                <View style={styles.callControlsPreview}>
                    {[
                        { icon: Icons.Microphone, label: "Mute" },
                        { icon: Icons.SpeakerHigh, label: "Speaker" },
                        { icon: Icons.VideoCamera, label: "Video" },
                    ].map(({ icon: IconCmp, label }) => (
                        <View key={label} style={styles.callPreviewChip}>
                            <IconCmp size={scale(14)} color={colors.white} weight="bold" />
                            <Typo size={10.5} fontWeight="600" color="rgba(255,255,255,0.8)">
                                {label}
                            </Typo>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    if (item.type === "complete") {
        return (
            <View style={styles.completeStage}>
                <LinearGradient
                    colors={["rgba(34, 197, 94, 0.35)", "rgba(250, 204, 21, 0.25)"]}
                    style={styles.completeHalo}
                >
                    <View style={styles.completeCircle}>
                        <Icons.CheckCircle size={scale(54)} color="#22C55E" weight="fill" />
                    </View>
                </LinearGradient>

                <View style={styles.completeChecklist}>
                    {[
                        "Background push notifications & call wake-ups wired",
                        "Durable preferences saved safely across restarts",
                        "Replay this guide anytime from Profile -> How to Use Bubbly",
                    ].map((line) => (
                        <View key={line} style={styles.completeCheckRow}>
                            <Icons.Check size={scale(13)} color="#22C55E" weight="bold" />
                            <Typo size={11.5} fontWeight="600" color="rgba(255,255,255,0.82)" style={{ flex: 1 }}>
                                {line}
                            </Typo>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    if (item.type === "permissions") {
        const permKeys: PermissionKey[] = ["camera", "microphone", "mediaLibrary", "notifications", "contacts"];
        const allGranted = permKeys.every((k) => permissions[k]?.granted);

        return (
            <View style={styles.permCard}>
                {permKeys.map((key, idx) => {
                    const meta = PERMISSION_METADATA[key];
                    const isGranted = permissions[key]?.granted;
                    const canAsk = permissions[key]?.canAskAgain;

                    return (
                        <View
                            key={key}
                            style={[
                                styles.permItemRow,
                                idx < permKeys.length - 1 && styles.permItemBorder,
                            ]}
                        >
                            <View
                                style={[
                                    styles.permIconBadge,
                                    { backgroundColor: isGranted ? "rgba(34,197,94,0.16)" : "rgba(250,204,21,0.14)" },
                                ]}
                            >
                                {renderPermissionIcon(key, isGranted)}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Typo size={13} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1 }}>
                                    {meta.title}
                                </Typo>
                                <Typo size={10.5} color="rgba(255,255,255,0.58)" textProps={{ numberOfLines: 2 }}>
                                    {meta.subtitle}
                                </Typo>
                            </View>
                            {isGranted ? (
                                <View style={styles.permGrantedBadge}>
                                    <Icons.Check size={12} color="#22C55E" weight="bold" />
                                    <Typo size={10.5} fontWeight="700" color="#22C55E">
                                        Allowed
                                    </Typo>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.permAllowBtn}
                                    onPress={() => onRequestPermission(key)}
                                    activeOpacity={0.75}
                                >
                                    <Typo size={10.5} fontWeight="800" color={colors.neutral900}>
                                        {canAsk ? "Allow" : "Settings"}
                                    </Typo>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}

                {!allGranted && (
                    <TouchableOpacity style={styles.enableAllBtn} onPress={onEnableAll} activeOpacity={0.8}>
                        <Icons.Checks size={scale(15)} color={colors.neutral900} weight="bold" />
                        <Typo size={12.5} fontWeight="800" color={colors.neutral900}>
                            Enable All Permissions
                        </Typo>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // Guide Deck slides (Messaging & Features)
    return (
        <View style={[styles.guideDeckCard, isCompactHeight && { padding: spacingX._12, gap: verticalScale(8) }]}>
            {(item.guides || []).map((g, idx) => (
                <View
                    key={g.title}
                    style={[
                        styles.guideRow,
                        idx < (item.guides?.length || 0) - 1 && styles.guideRowBorder,
                    ]}
                >
                    <View style={[styles.guideIconWrap, { backgroundColor: `${item.accent}1A`, borderColor: `${item.accent}44` }]}>
                        {renderGuideIcon(g.icon, item.accent)}
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Typo size={13} fontWeight="700" color={colors.white} textProps={{ numberOfLines: 1 }}>
                            {g.title}
                        </Typo>
                        <Typo size={11} color="rgba(255,255,255,0.65)" textProps={{ numberOfLines: 2 }}>
                            {g.detail}
                        </Typo>
                    </View>
                </View>
            ))}
        </View>
    );
};

const AnimatedDot: React.FC<{
    index: number;
    screenWidth: number;
    scrollX: SharedValue<number>;
}> = ({ index, screenWidth, scrollX }) => {
    const dotSmall = scale(7);
    const dotWide = scale(22);

    const animStyle = useAnimatedStyle(() => {
        const w = Math.max(1, screenWidth);
        const inputRange = [(index - 1) * w, index * w, (index + 1) * w];
        return {
            width: interpolate(scrollX.value, inputRange, [dotSmall, dotWide, dotSmall], Extrapolation.CLAMP),
            opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
        };
    });

    return <Animated.View style={[styles.dot, animStyle]} />;
};

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isCompactHeight = screenHeight < 700;
    const params = useLocalSearchParams<{ replay?: string }>();
    const isReplay = params.replay === "true";

    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<any>(null);
    const scrollX = useSharedValue(0);
    const lastSlideRef = useRef(0);
    const buttonScale = useSharedValue(1);

    const isLast = activeIndex === SLIDES.length - 1;

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
        } catch (_) {}
    }, []);

    useEffect(() => {
        refreshPermissions();
        const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
            if (nextState === "active") refreshPermissions();
        });
        return () => sub.remove();
    }, [refreshPermissions]);

    const handleRequestPermission = useCallback(
        async (key: PermissionKey) => {
            hapticTap("medium");
            const current = permissions[key];
            if (!current.canAskAgain && !current.granted) {
                BubblyAlert.alert(
                    `${PERMISSION_METADATA[key].title} Permission`,
                    "Permission was previously denied. Open device Settings to grant access.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open Settings", onPress: () => openDeviceSettings() },
                    ]
                );
                return;
            }
            const updated = await requestPermissionByKey(key);
            setPermissions((prev) => ({ ...prev, [key]: updated }));
            hapticTap(updated.granted ? "success" : "warning");
            if (key === "notifications" && updated.granted) {
                registerForPushNotificationsAsync().catch(() => {});
            }
        },
        [permissions]
    );

    const handleEnableAllPermissions = useCallback(async () => {
        hapticTap("heavy");
        const keys: PermissionKey[] = ["camera", "microphone", "mediaLibrary", "notifications", "contacts"];
        for (const k of keys) {
            if (!permissions[k].granted && permissions[k].canAskAgain) {
                const res = await requestPermissionByKey(k);
                setPermissions((prev) => ({ ...prev, [k]: res }));
                if (k === "notifications" && res.granted) {
                    registerForPushNotificationsAsync().catch(() => {});
                }
            }
        }
        hapticTap("celebration");
    }, [permissions]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollX.value = e.contentOffset.x;
        },
    });

    const handleMomentumEnd = useCallback(
        (e: any) => {
            const w = Math.max(1, screenWidth);
            const rawIdx = Math.round(e.nativeEvent.contentOffset.x / w);
            const clampedIdx = Math.max(0, Math.min(SLIDES.length - 1, rawIdx));
            if (clampedIdx !== lastSlideRef.current) {
                lastSlideRef.current = clampedIdx;
                hapticTap("medium");
            }
            setActiveIndex(clampedIdx);
        },
        [screenWidth]
    );

    const completeFlow = useCallback(async () => {
        await markOnboardingCompleted();
        if (isReplay) {
            if (router.canGoBack()) router.back();
            else router.replace("/(main)/home");
        } else {
            router.replace("/(auth)/welcome");
        }
    }, [isReplay, router]);

    const handleNext = useCallback(() => {
        hapticTap(isLast ? "celebration" : "heavy");
        buttonScale.value = withSequence(withSpring(0.95, { damping: 10 }), withSpring(1, { damping: 10 }));
        if (isLast) {
            void completeFlow();
            return;
        }
        const nextIndex = Math.min(SLIDES.length - 1, activeIndex + 1);
        lastSlideRef.current = nextIndex;
        setActiveIndex(nextIndex);
        scrollRef.current?.scrollTo?.({ x: nextIndex * screenWidth, animated: true });
    }, [activeIndex, buttonScale, completeFlow, isLast, screenWidth]);

    const handleSkip = useCallback(() => {
        hapticTap("medium");
        void completeFlow();
    }, [completeFlow]);

    const btnAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const progressRatio = (activeIndex + 1) / SLIDES.length;

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, verticalScale(12)) }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={["#090807", "#14100B", "#1C140C", "#090807"]}
                locations={[0, 0.35, 0.72, 1]}
                style={StyleSheet.absoluteFill}
            />

            <View pointerEvents="none" style={styles.ambientSvgGlow}>
                <Svg width="100%" height="100%" viewBox="0 0 360 360">
                    <Defs>
                        <RadialGradient id="onboardGlow" cx="50%" cy="40%" r="50%">
                            <Stop offset="0%" stopColor="#FACC15" stopOpacity="0.24" />
                            <Stop offset="55%" stopColor="#F59E0B" stopOpacity="0.08" />
                            <Stop offset="100%" stopColor="#090807" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Circle cx="180" cy="144" r="175" fill="url(#onboardGlow)" />
                </Svg>
            </View>

            <Image
                source={require("@/assets/images/bgPattern.png")}
                style={styles.bgPattern}
                resizeMode="cover"
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerBrandRow}>
                    <View style={styles.headerLogoBadge}>
                        <ExpoImage
                            source={require("@/assets/images/splash-icon.png")}
                            style={styles.headerLogoImg}
                            contentFit="contain"
                        />
                    </View>
                    <View>
                        <Typo size={15.5} fontWeight="800" color={colors.white} style={{ letterSpacing: 0.4 }}>
                            Bubbly
                        </Typo>
                        {isReplay && (
                            <Typo size={10} fontWeight="700" color={colors.primary}>
                                HOW TO USE GUIDE
                            </Typo>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handleSkip}
                    activeOpacity={0.75}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Typo size={12.5} fontWeight="700" color="rgba(255,255,255,0.78)">
                        {isReplay ? "Close" : "Skip"}
                    </Typo>
                    <Icons.CaretRight size={scale(14)} color={colors.primary} weight="bold" />
                </TouchableOpacity>
            </View>

            {/* Slides */}
            <Animated.ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                onMomentumScrollEnd={handleMomentumEnd}
                scrollEventThrottle={16}
                bounces={false}
                style={{ flex: 1 }}
            >
                {SLIDES.map((item) => (
                    <ScrollView
                        key={item.id}
                        style={{ width: screenWidth, flex: 1 }}
                        contentContainerStyle={[
                            styles.slideScroll,
                            isCompactHeight && { paddingVertical: verticalScale(8), gap: verticalScale(12) },
                        ]}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <Animated.View entering={FadeInUp.duration(280)} style={styles.slideHeaderBlock}>
                            <View style={[styles.badgePill, { borderColor: `${item.accent}44`, backgroundColor: `${item.accent}1A` }]}>
                                <Typo size={10} fontWeight="800" color={item.accent} style={{ letterSpacing: 0.8 }}>
                                    {item.badge}
                                </Typo>
                            </View>

                            <Typo
                                size={isCompactHeight ? 23 : 26}
                                fontWeight="800"
                                color={colors.white}
                                style={styles.slideTitle}
                            >
                                {item.title}
                            </Typo>

                            <Typo
                                size={13}
                                color="rgba(255,255,255,0.68)"
                                style={styles.slideSubtitle}
                            >
                                {item.subtitle}
                            </Typo>
                        </Animated.View>

                        <SlideVisualCard
                            item={item}
                            isCompactHeight={isCompactHeight}
                            permissions={permissions}
                            onRequestPermission={handleRequestPermission}
                            onEnableAll={handleEnableAllPermissions}
                        />
                    </ScrollView>
                ))}
            </Animated.ScrollView>

            {/* Bottom Obsidian Navigation Dock */}
            <View style={styles.bottomDock}>
                <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                        <LinearGradient
                            colors={[colors.primaryLight, colors.primary, "#EA580C"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]}
                        />
                    </View>
                    <Typo size={11} fontWeight="700" color="rgba(255,255,255,0.55)">
                        {activeIndex + 1} of {SLIDES.length}
                    </Typo>
                </View>

                <View style={styles.dotsRow}>
                    {SLIDES.map((s, idx) => (
                        <AnimatedDot key={s.id} index={idx} screenWidth={screenWidth} scrollX={scrollX} />
                    ))}
                </View>

                <Animated.View style={btnAnimStyle}>
                    <TouchableOpacity onPress={handleNext} activeOpacity={0.88} style={styles.nextBtnTouchable}>
                        <LinearGradient
                            colors={["#FDE047", colors.primary, "#F59E0B"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.nextBtnGradient}
                        >
                            <Typo size={15.5} fontWeight="800" color={colors.neutral900}>
                                {isLast ? (isReplay ? "Back to Bubbly" : "Get Started") : "Continue"}
                            </Typo>
                            {isLast ? (
                                <Icons.Check size={scale(18)} color={colors.neutral900} weight="bold" />
                            ) : (
                                <Icons.ArrowRight size={scale(18)} color={colors.neutral900} weight="bold" />
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#090807",
    },
    ambientSvgGlow: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "62%",
    },
    bgPattern: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        opacity: 0.055,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._20,
        paddingVertical: verticalScale(10),
    },
    headerBrandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
    },
    headerLogoBadge: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius._12,
        backgroundColor: "#14100B",
        borderWidth: 1.5,
        borderColor: "rgba(250,204,21,0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerLogoImg: {
        width: verticalScale(24),
        height: verticalScale(24),
    },
    skipBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(4),
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(6),
        borderRadius: radius.full,
    },
    slideScroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: spacingX._20,
        paddingVertical: verticalScale(14),
        gap: verticalScale(16),
    },
    slideHeaderBlock: {
        alignItems: "center",
        gap: verticalScale(8),
    },
    badgePill: {
        borderWidth: 1,
        borderRadius: radius.full,
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(4),
    },
    slideTitle: {
        textAlign: "center",
        letterSpacing: 0.2,
    },
    slideSubtitle: {
        textAlign: "center",
        lineHeight: 20,
        maxWidth: scale(320),
    },
    heroStage: {
        alignItems: "center",
        gap: verticalScale(18),
        paddingVertical: verticalScale(8),
    },
    welcomeLogoOuter: {
        width: scale(134),
        height: scale(134),
        borderRadius: scale(38),
        padding: 2.5,
        shadowColor: "#FACC15",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.32,
        shadowRadius: 22,
        elevation: 12,
    },
    welcomeLogoInner: {
        flex: 1,
        borderRadius: scale(36),
        backgroundColor: "#14100B",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    welcomeLogoImg: {
        width: scale(92),
        height: scale(92),
    },
    welcomePillarsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: scale(8),
    },
    welcomePillarChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(5),
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.24)",
        borderRadius: radius.full,
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(6),
    },
    guideDeckCard: {
        backgroundColor: "rgba(255,255,255,0.055)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: radius._20,
        padding: spacingX._15,
        gap: verticalScale(10),
    },
    guideRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(12),
        paddingBottom: verticalScale(10),
    },
    guideRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    guideIconWrap: {
        width: scale(34),
        height: scale(34),
        borderRadius: radius._10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    callStageCard: {
        backgroundColor: "rgba(255,255,255,0.055)",
        borderWidth: 1,
        borderColor: "rgba(56,189,248,0.25)",
        borderRadius: radius._24,
        padding: spacingX._15,
        gap: verticalScale(14),
    },
    callMockHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    callStatusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(56,189,248,0.14)",
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(3.5),
        borderRadius: radius.full,
    },
    callLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#38BDF8",
    },
    callMockCenter: {
        alignItems: "center",
        gap: verticalScale(4),
        paddingVertical: verticalScale(6),
    },
    callAvatarRing: {
        width: scale(68),
        height: scale(68),
        borderRadius: radius.full,
        backgroundColor: "rgba(250,204,21,0.14)",
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    callControlsPreview: {
        flexDirection: "row",
        gap: scale(8),
    },
    callPreviewChip: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(5),
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: radius._12,
        paddingVertical: verticalScale(8),
    },
    permCard: {
        backgroundColor: "rgba(255,255,255,0.055)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: radius._20,
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(4),
    },
    permItemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
        paddingVertical: verticalScale(10),
    },
    permItemBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    permIconBadge: {
        width: scale(34),
        height: scale(34),
        borderRadius: radius._10,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    permGrantedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(34,197,94,0.16)",
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        borderRadius: radius.full,
    },
    permAllowBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(5),
        borderRadius: radius.full,
    },
    enableAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
        backgroundColor: colors.primary,
        borderRadius: radius._12,
        paddingVertical: verticalScale(10),
        marginTop: verticalScale(4),
        marginBottom: verticalScale(10),
    },
    completeStage: {
        alignItems: "center",
        gap: verticalScale(16),
    },
    completeHalo: {
        width: scale(116),
        height: scale(116),
        borderRadius: radius.full,
        padding: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    completeCircle: {
        width: "100%",
        height: "100%",
        borderRadius: radius.full,
        backgroundColor: "#12100E",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "rgba(34,197,94,0.45)",
    },
    completeChecklist: {
        width: "100%",
        backgroundColor: "rgba(255,255,255,0.055)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: radius._20,
        padding: spacingX._15,
        gap: verticalScale(10),
    },
    completeCheckRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(9),
    },
    bottomDock: {
        marginHorizontal: spacingX._20,
        marginBottom: verticalScale(4),
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: radius._24,
        padding: spacingX._15,
        gap: verticalScale(12),
    },
    progressRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(10),
    },
    progressTrack: {
        flex: 1,
        height: 4,
        borderRadius: radius.full,
        backgroundColor: "rgba(255,255,255,0.12)",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: radius.full,
    },
    dotsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(6),
    },
    dot: {
        height: scale(7),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    nextBtnTouchable: {
        borderRadius: radius._15,
        overflow: "hidden",
    },
    nextBtnGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scale(8),
        paddingVertical: verticalScale(13),
    },
});
