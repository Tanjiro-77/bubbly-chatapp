import React, { useEffect, useState } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Icons from "phosphor-react-native";
import { colors, radius } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";
import {
  getWarmupSnapshot,
  startServerWarmup,
  subscribeWarmupState,
  WarmupSnapshot,
} from "../utils/serverWarmup";

type BubbleSpec = {
  size: number;
  leftPct: `${number}%`;
  bottomPct: `${number}%`;
  delayMs: number;
  durationMs: number;
  driftY: number;
  swayX: number;
  tint: string;
  borderTint: string;
};

const GLASS_BUBBLES: BubbleSpec[] = [
  { size: 84, leftPct: "4%", bottomPct: "12%", delayMs: 0, durationMs: 5600, driftY: -38, swayX: 10, tint: "rgba(250, 204, 21, 0.08)", borderTint: "rgba(250, 204, 21, 0.24)" },
  { size: 52, leftPct: "81%", bottomPct: "18%", delayMs: 380, durationMs: 4700, driftY: -34, swayX: -9, tint: "rgba(251, 146, 60, 0.09)", borderTint: "rgba(251, 146, 60, 0.26)" },
  { size: 32, leftPct: "16%", bottomPct: "70%", delayMs: 750, durationMs: 5100, driftY: -26, swayX: 8, tint: "rgba(253, 224, 71, 0.1)", borderTint: "rgba(253, 224, 71, 0.3)" },
  { size: 64, leftPct: "76%", bottomPct: "73%", delayMs: 220, durationMs: 5900, driftY: -32, swayX: -11, tint: "rgba(250, 204, 21, 0.07)", borderTint: "rgba(250, 204, 21, 0.22)" },
  { size: 22, leftPct: "46%", bottomPct: "9%", delayMs: 980, durationMs: 4300, driftY: -24, swayX: 7, tint: "rgba(254, 240, 138, 0.12)", borderTint: "rgba(254, 240, 138, 0.34)" },
  { size: 42, leftPct: "8%", bottomPct: "43%", delayMs: 560, durationMs: 5200, driftY: -30, swayX: 9, tint: "rgba(245, 158, 11, 0.08)", borderTint: "rgba(245, 158, 11, 0.26)" },
  { size: 34, leftPct: "87%", bottomPct: "46%", delayMs: 840, durationMs: 4800, driftY: -28, swayX: -8, tint: "rgba(250, 204, 21, 0.09)", borderTint: "rgba(250, 204, 21, 0.28)" },
  { size: 18, leftPct: "31%", bottomPct: "84%", delayMs: 480, durationMs: 4400, driftY: -22, swayX: 6, tint: "rgba(251, 191, 36, 0.12)", borderTint: "rgba(251, 191, 36, 0.36)" },
];

const CAPABILITIES = [
  { key: "chats", label: "Rich Chats", Icon: Icons.ChatCircleDots },
  { key: "calls", label: "HD Calls", Icon: Icons.PhoneCall },
  { key: "realtime", label: "Live Sync", Icon: Icons.Lightning },
] as const;

/** Floating translucent bubble with subtle golden rim and specular crescent. */
const GlassBubble = ({
  size,
  leftPct,
  bottomPct,
  delayMs,
  durationMs,
  driftY,
  swayX,
  tint,
  borderTint,
}: BubbleSpec) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [delayMs, durationMs]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [10, driftY]) },
      { translateX: interpolate(progress.value, [0, 0.5, 1], [-swayX, swayX, -swayX * 0.4]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.9, 1.08, 0.94]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.35, 0.9, 0.45]),
  }));

  const scaledSize = scale(size);
  const highlightSize = Math.max(4, scaledSize * 0.24);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: leftPct,
          bottom: bottomPct,
          width: scaledSize,
          height: scaledSize,
          borderRadius: radius.full,
          backgroundColor: tint,
          borderWidth: 1,
          borderColor: borderTint,
          overflow: "hidden",
        },
        animStyle,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: scaledSize * 0.16,
          left: scaledSize * 0.18,
          width: highlightSize,
          height: highlightSize * 0.62,
          borderRadius: radius.full,
          backgroundColor: "rgba(255, 252, 232, 0.42)",
          transform: [{ rotate: "-26deg" }],
        }}
      />
    </Animated.View>
  );
};

/** Staggered three-dot live activity indicator bouncing in sequence. */
const TypingWaveDot = ({ delayMs }: { delayMs: number }) => {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
          withDelay(420, withTiming(0, { duration: 1 }))
        ),
        -1,
        false
      )
    );
  }, [delayMs]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lift.value, [0, 1], [0, -3.5]) },
      { scale: interpolate(lift.value, [0, 1], [0.88, 1.18]) },
    ],
    opacity: interpolate(lift.value, [0, 1], [0.45, 1]),
  }));

  return <Animated.View style={[styles.microTypingDot, dotStyle]} />;
};

const SonarRing = ({
  size,
  delayMs,
  durationMs,
  maxScale,
  borderColor,
}: {
  size: number;
  delayMs: number;
  durationMs: number;
  maxScale: number;
  borderColor: string;
}) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );
  }, [delayMs, durationMs]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.88, maxScale]) }],
    opacity: interpolate(pulse.value, [0, 0.22, 1], [0, 0.65, 0]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: scale(size),
          height: scale(size),
          borderRadius: radius.full,
          borderWidth: 1.5,
          borderColor,
        },
        ringStyle,
      ]}
    />
  );
};

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [warmup, setWarmup] = useState<WarmupSnapshot>(() => getWarmupSnapshot());

  const auraBreath = useSharedValue(0);
  const orbitOuter = useSharedValue(0);
  const orbitInner = useSharedValue(360);
  const shimmerProgress = useSharedValue(0);
  const logoSheen = useSharedValue(0);
  const emblemFloat = useSharedValue(0);
  const emblemTapScale = useSharedValue(1);
  const tapRipple = useSharedValue(0);
  const dotPulse = useSharedValue(0);
  const warmupProgress = useSharedValue(0.08);

  useEffect(() => {
    startServerWarmup();
    return subscribeWarmupState(setWarmup);
  }, []);

  useEffect(() => {
    auraBreath.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    orbitOuter.value = withRepeat(
      withTiming(360, { duration: 11000, easing: Easing.linear }),
      -1,
      false
    );

    orbitInner.value = withRepeat(
      withTiming(0, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );

    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1450, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );

    logoSheen.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }),
        withDelay(1700, withTiming(0, { duration: 1 }))
      ),
      -1,
      false
    );

    emblemFloat.value = withRepeat(
      withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    dotPulse.value = withRepeat(
      withTiming(1, { duration: 920, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    warmupProgress.value = withTiming(0.94, {
      duration: 40000,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  useEffect(() => {
    if (warmup.serverResponded || warmup.status !== "warming") {
      warmupProgress.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [warmup.serverResponded, warmup.status]);

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(auraBreath.value, [0, 1], [0.92, 1.15]) }],
    opacity: interpolate(auraBreath.value, [0, 1], [0.68, 1]),
  }));

  const orbitOuterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitOuter.value}deg` }],
  }));

  const orbitInnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitInner.value}deg` }],
  }));

  const emblemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(emblemFloat.value, [0, 1], [4, -6]) },
      { scale: interpolate(emblemFloat.value, [0, 1], [0.99, 1.03]) * emblemTapScale.value },
    ],
  }));

  const tapRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(tapRipple.value, [0, 1], [0.85, 2.05]) }],
    opacity: tapRipple.value === 0 ? 0 : interpolate(tapRipple.value, [0, 0.18, 1], [0, 0.78, 0]),
  }));

  const sheenSpan = scale(150);

  const sheenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(logoSheen.value, [0, 1], [-sheenSpan, sheenSpan]) },
      { rotate: "24deg" },
    ],
    opacity: interpolate(logoSheen.value, [0, 0.5, 1], [0, 0.36, 0]),
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(dotPulse.value, [0, 1], [0.85, 1.28]) }],
    opacity: interpolate(dotPulse.value, [0, 1], [0.65, 1]),
  }));

  const trackWidth = Math.min(scale(232), width * 0.62);
  const indicatorWidth = scale(76);
  const shimmerEndX = trackWidth + scale(12);

  const fillBarStyle = useAnimatedStyle(() => ({
    width: warmupProgress.value * trackWidth,
  }));

  const shimmerBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmerProgress.value,
          [0, 1],
          [-indicatorWidth, shimmerEndX]
        ),
      },
    ],
  }));

  const heroOrbSize = Math.min(scale(320), width * 0.86);
  const isCompactHeight = height < 690;
  const isReady = warmup.serverResponded || warmup.status === "ready";
  const elapsedSecs = Math.max(1, Math.floor((warmup.elapsedMs || 0) / 1000));

  const statusText = isReady
    ? "Real-time channel ready"
    : warmup.status === "bypassed"
    ? "Continuing into Bubbly..."
    : elapsedSecs >= 4
    ? `Waking cloud server · ${elapsedSecs}s`
    : "Connecting live engine...";

  const handleEmblemTap = () => {
    hapticTap("medium");
    emblemTapScale.value = withSequence(
      withSpring(0.88, { damping: 9, stiffness: 320 }),
      withSpring(1.08, { damping: 9, stiffness: 250 }),
      withSpring(1, { damping: 12, stiffness: 210 })
    );
    tapRipple.value = 0;
    tapRipple.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Rich Obsidian + Warm Amber Mesh Gradient */}
      <LinearGradient
        colors={["#090807", "#14100B", "#1E160D", "#0A0908"]}
        locations={[0, 0.34, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle Warm Top-Right & Bottom-Left Radial Washes */}
      <LinearGradient
        colors={["rgba(250, 204, 21, 0.16)", "rgba(245, 158, 11, 0.06)", "transparent"]}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.25, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Image
        source={require("../assets/images/bgPattern.png")}
        style={styles.patternOverlay}
        resizeMode="cover"
      />

      {/* Translucent Specular Glass Bubbles */}
      {GLASS_BUBBLES.map((b, i) => (
        <GlassBubble key={i} {...b} />
      ))}

      {/* Main Kinetic Stage */}
      <View
        style={[
          styles.centerStage,
          { paddingTop: Math.max(insets.top, verticalScale(12)) },
        ]}
      >
        <View style={[styles.emblemStage, isCompactHeight && { width: scale(210), height: scale(210) }]}>
          {/* Warm Honey Gold SVG Radial Nebula (replaces clashing blue glow) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.svgAuraWrapper,
              { width: heroOrbSize, height: heroOrbSize },
              auraAnimatedStyle,
            ]}
          >
            <Svg width="100%" height="100%" viewBox="0 0 320 320">
              <Defs>
                <RadialGradient id="honeyAura" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FACC15" stopOpacity="0.46" />
                  <Stop offset="38%" stopColor="#F59E0B" stopOpacity="0.22" />
                  <Stop offset="70%" stopColor="#EA580C" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#090807" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="160" cy="160" r="158" fill="url(#honeyAura)" />
            </Svg>
          </Animated.View>

          {/* Triple Sonar Ripple Waves */}
          <SonarRing size={142} delayMs={0} durationMs={2600} maxScale={1.82} borderColor="rgba(250, 204, 21, 0.38)" />
          <SonarRing size={142} delayMs={860} durationMs={2600} maxScale={1.68} borderColor="rgba(251, 146, 60, 0.34)" />
          <SonarRing size={142} delayMs={1720} durationMs={2600} maxScale={1.52} borderColor="rgba(254, 240, 138, 0.32)" />

          {/* Interactive Tap Ripple Burst */}
          <Animated.View pointerEvents="none" style={[styles.tapRippleRing, tapRippleStyle]} />

          {/* Counter-Rotating Dual Constellation Orbits */}
          <Animated.View pointerEvents="none" style={[styles.orbitHaloOuter, orbitOuterStyle]}>
            <View style={styles.orbitSparkPrimary} />
            <View style={styles.orbitSparkFaint} />
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.orbitHaloInner, orbitInnerStyle]}>
            <View style={styles.orbitSparkSecondary} />
          </Animated.View>

          {/* Centerpiece Glass-Framed Emblem + Live Typing Wave Pill */}
          <Animated.View entering={FadeIn.duration(420)} style={{ alignItems: "center" }}>
            <TouchableOpacity activeOpacity={0.94} onPress={handleEmblemTap}>
              <Animated.View style={emblemAnimatedStyle}>
                <LinearGradient
                  colors={["#FDE047", "rgba(250, 204, 21, 0.55)", "rgba(234, 88, 12, 0.42)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoFrameGradient}
                >
                  <View style={styles.logoCardInner}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.14)", "rgba(250,204,21,0.03)", "transparent"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.logoCardGloss}
                    />
                    <Animated.View style={[styles.logoSheenBeam, sheenAnimatedStyle]} />
                    <Image
                      source={require("../assets/images/splash-icon.png")}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                </LinearGradient>

                {/* Floating Live 3-Dot Chat Bubble Wave */}
                <View style={styles.microTypingPill}>
                  <TypingWaveDot delayMs={0} />
                  <TypingWaveDot delayMs={160} />
                  <TypingWaveDot delayMs={320} />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bold Brand Wordmark, Tagline & Capability Pills */}
        <Animated.View
          entering={FadeInUp.delay(90).duration(380)}
          style={styles.brandBlock}
        >
          <View style={styles.wordmarkRow}>
            <Text style={styles.brandTitle} maxFontSizeMultiplier={1.25} numberOfLines={1}>
              BUBBLY
            </Text>
            <Animated.View
              style={[
                styles.amberLiveDot,
                dotAnimatedStyle,
                isReady && { backgroundColor: "#22c55e", shadowColor: "#22c55e" },
              ]}
            />
          </View>
          <Text style={styles.brandTagline} maxFontSizeMultiplier={1.2} numberOfLines={1}>
            Instant messages. Crystal-clear calls.
          </Text>

          <View style={styles.capabilitiesRow}>
            {CAPABILITIES.map(({ key, label, Icon }) => (
              <View key={key} style={styles.capabilityChip}>
                <Icon size={scale(12)} color={colors.primary} weight="fill" />
                <Text style={styles.capabilityText} maxFontSizeMultiplier={1.15}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Bottom Live Status Capsule & Shimmering Progress Track */}
      <Animated.View
        entering={FadeInUp.delay(160).duration(360)}
        style={[
          styles.footerContainer,
          { paddingBottom: Math.max(insets.bottom + verticalScale(20), verticalScale(30)) },
        ]}
      >
        <View style={[styles.statusCapsule, isReady && styles.statusCapsuleReady]}>
          <View
            style={[
              styles.statusIndicatorDot,
              isReady && { backgroundColor: "#22c55e" },
            ]}
          />
          <Text style={styles.statusText} maxFontSizeMultiplier={1.15} numberOfLines={1}>
            {statusText}
          </Text>
        </View>

        <View style={[styles.progressTrack, { width: trackWidth }]}>
          <Animated.View style={[styles.progressFillBar, fillBarStyle]}>
            <LinearGradient
              colors={["#EA580C", colors.primary, "#FDE047"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.progressSweepWrapper,
              { width: indicatorWidth },
              shimmerBarStyle,
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0)",
                "rgba(255, 255, 255, 0.72)",
                "rgba(255, 255, 255, 0)",
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.progressSweepGradient}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090807",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  patternOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.06,
  },
  centerStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    width: "100%",
  },
  emblemStage: {
    alignItems: "center",
    justifyContent: "center",
    width: scale(240),
    height: scale(240),
  },
  svgAuraWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  tapRippleRing: {
    position: "absolute",
    width: scale(136),
    height: scale(136),
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: "#FDE047",
  },
  orbitHaloOuter: {
    position: "absolute",
    width: scale(196),
    height: scale(196),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.16)",
    alignItems: "center",
  },
  orbitHaloInner: {
    position: "absolute",
    width: scale(158),
    height: scale(158),
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(251, 146, 60, 0.22)",
    alignItems: "center",
  },
  orbitSparkPrimary: {
    width: scale(9),
    height: scale(9),
    borderRadius: radius.full,
    backgroundColor: "#FDE047",
    marginTop: -scale(4.5),
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 6,
  },
  orbitSparkFaint: {
    position: "absolute",
    bottom: -scale(3),
    width: scale(5),
    height: scale(5),
    borderRadius: radius.full,
    backgroundColor: "rgba(250, 204, 21, 0.5)",
  },
  orbitSparkSecondary: {
    width: scale(7),
    height: scale(7),
    borderRadius: radius.full,
    backgroundColor: "#FB923C",
    marginTop: -scale(3.5),
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  logoFrameGradient: {
    width: scale(122),
    height: scale(122),
    borderRadius: scale(35),
    padding: 2,
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 16,
  },
  logoCardInner: {
    flex: 1,
    borderRadius: scale(33),
    backgroundColor: "#14100B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  logoCardGloss: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  logoSheenBeam: {
    position: "absolute",
    width: scale(36),
    height: scale(185),
    backgroundColor: "rgba(255, 249, 214, 0.42)",
  },
  logo: {
    width: scale(84),
    height: scale(84),
  },
  microTypingPill: {
    position: "absolute",
    bottom: -scale(10),
    right: -scale(6),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: "#1C1712",
    borderWidth: 1.5,
    borderColor: "rgba(250, 204, 21, 0.65)",
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: radius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  microTypingDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  brandBlock: {
    marginTop: verticalScale(10),
    alignItems: "center",
    gap: verticalScale(8),
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(9),
  },
  brandTitle: {
    fontSize: scale(34),
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 7,
    textShadowColor: "rgba(250, 204, 21, 0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  amberLiveDot: {
    width: scale(9),
    height: scale(9),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  brandTagline: {
    fontSize: scale(13),
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.72)",
    letterSpacing: 0.4,
  },
  capabilitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    marginTop: verticalScale(6),
    flexWrap: "wrap",
  },
  capabilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.2)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: radius.full,
  },
  capabilityText: {
    fontSize: scale(11),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.88)",
    letterSpacing: 0.2,
  },
  footerContainer: {
    width: "100%",
    alignItems: "center",
    gap: verticalScale(10),
  },
  statusCapsule: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(7),
    backgroundColor: "rgba(255, 255, 255, 0.055)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: radius.full,
  },
  statusCapsuleReady: {
    borderColor: "rgba(34, 197, 94, 0.4)",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  statusIndicatorDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: scale(11.5),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.84)",
    letterSpacing: 0.2,
  },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.11)",
    overflow: "hidden",
    justifyContent: "center",
  },
  progressFillBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressSweepWrapper: {
    height: "100%",
    opacity: 0.9,
  },
  progressSweepGradient: {
    flex: 1,
    borderRadius: radius.full,
  },
});
