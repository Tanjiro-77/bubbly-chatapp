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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";
import {
  getWarmupSnapshot,
  startServerWarmup,
  subscribeWarmupState,
  WarmupSnapshot,
} from "../utils/serverWarmup";

const BUBBLES: {
  size: number;
  leftPct: `${number}%`;
  bottomPct: `${number}%`;
  delayMs: number;
  durationMs: number;
  driftY: number;
  maxOpacity: number;
}[] = [
  { size: 74, leftPct: "6%", bottomPct: "14%", delayMs: 0, durationMs: 5400, driftY: -40, maxOpacity: 0.16 },
  { size: 46, leftPct: "82%", bottomPct: "20%", delayMs: 450, durationMs: 4500, driftY: -32, maxOpacity: 0.2 },
  { size: 28, leftPct: "20%", bottomPct: "68%", delayMs: 850, durationMs: 4900, driftY: -26, maxOpacity: 0.14 },
  { size: 56, leftPct: "74%", bottomPct: "72%", delayMs: 250, durationMs: 5700, driftY: -34, maxOpacity: 0.17 },
  { size: 20, leftPct: "48%", bottomPct: "10%", delayMs: 1100, durationMs: 4200, driftY: -28, maxOpacity: 0.18 },
  { size: 38, leftPct: "12%", bottomPct: "44%", delayMs: 650, durationMs: 5100, driftY: -30, maxOpacity: 0.15 },
  { size: 30, leftPct: "86%", bottomPct: "48%", delayMs: 950, durationMs: 4700, driftY: -28, maxOpacity: 0.15 },
  { size: 16, leftPct: "34%", bottomPct: "82%", delayMs: 550, durationMs: 4300, driftY: -22, maxOpacity: 0.16 },
];

const FloatingBubble = ({
  size,
  leftPct,
  bottomPct,
  delayMs,
  durationMs,
  driftY,
  maxOpacity,
}: (typeof BUBBLES)[number]) => {
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
      { translateY: interpolate(progress.value, [0, 1], [14, driftY]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.86, 1.12, 0.9]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.04, maxOpacity, 0.04]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: leftPct,
          bottom: bottomPct,
          width: scale(size),
          height: scale(size),
          borderRadius: radius.full,
          backgroundColor: colors.primary,
        },
        animStyle,
      ]}
    />
  );
};

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [warmup, setWarmup] = useState<WarmupSnapshot>(() => getWarmupSnapshot());

  const auraBreath = useSharedValue(0);
  const pulseOuter = useSharedValue(0);
  const pulseInner = useSharedValue(0);
  const orbitOuter = useSharedValue(0);
  const orbitInner = useSharedValue(360);
  const shimmerProgress = useSharedValue(0);
  const logoSheen = useSharedValue(0);
  const emblemFloat = useSharedValue(0);
  const emblemTapScale = useSharedValue(1);
  const dotPulse = useSharedValue(0);
  const warmupProgress = useSharedValue(0.06);

  useEffect(() => {
    startServerWarmup();
    return subscribeWarmupState(setWarmup);
  }, []);

  useEffect(() => {
    auraBreath.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    pulseOuter.value = withRepeat(
      withTiming(1, { duration: 2300, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );

    pulseInner.value = withDelay(
      750,
      withRepeat(
        withTiming(1, { duration: 2300, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );

    orbitOuter.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );

    orbitInner.value = withRepeat(
      withTiming(0, { duration: 16000, easing: Easing.linear }),
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
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        withDelay(1800, withTiming(0, { duration: 1 }))
      ),
      -1,
      false
    );

    emblemFloat.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    dotPulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
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
    transform: [{ scale: interpolate(auraBreath.value, [0, 1], [0.9, 1.14]) }],
    opacity: interpolate(auraBreath.value, [0, 1], [0.3, 0.68]),
  }));

  const outerRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseOuter.value, [0, 1], [0.95, 1.75]) }],
    opacity: interpolate(pulseOuter.value, [0, 0.2, 1], [0, 0.48, 0]),
  }));

  const innerRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseInner.value, [0, 1], [0.95, 1.52]) }],
    opacity: interpolate(pulseInner.value, [0, 0.2, 1], [0, 0.56, 0]),
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

  const sheenSpan = scale(140);

  const sheenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(logoSheen.value, [0, 1], [-sheenSpan, sheenSpan]) },
      { rotate: "24deg" },
    ],
    opacity: interpolate(logoSheen.value, [0, 0.5, 1], [0, 0.32, 0]),
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(dotPulse.value, [0, 1], [0.85, 1.28]) }],
    opacity: interpolate(dotPulse.value, [0, 1], [0.65, 1]),
  }));

  const trackWidth = Math.min(scale(220), width * 0.58);
  const indicatorWidth = scale(72);
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

  const heroOrbSize = Math.min(scale(310), width * 0.82);
  const isReady = warmup.serverResponded || warmup.status === "ready";

  const handleEmblemTap = () => {
    hapticTap("medium");
    emblemTapScale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 300 }),
      withSpring(1.06, { damping: 10, stiffness: 250 }),
      withSpring(1, { damping: 12, stiffness: 210 })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Deep Obsidian + Honey Amber Gradient Canvas */}
      <LinearGradient
        colors={["#070605", "#120f0d", "#1b1612", "#0b0908"]}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle Textured Pattern */}
      <Image
        source={require("../assets/images/bgPattern.png")}
        style={styles.patternOverlay}
        resizeMode="cover"
      />

      {/* Floating Ambient Honey Bubbles */}
      {BUBBLES.map((b, i) => (
        <FloatingBubble key={i} {...b} />
      ))}

      {/* Top Radial Honey-Gold Ambient Vignette */}
      <LinearGradient
        colors={[
          "rgba(250, 204, 21, 0.16)",
          "rgba(245, 158, 11, 0.05)",
          "transparent",
        ]}
        style={styles.topGlowWash}
        pointerEvents="none"
      />

      {/* Main Centered Brand Stage */}
      <View
        style={[
          styles.centerStage,
          { paddingTop: Math.max(insets.top, verticalScale(16)) },
        ]}
      >
        <View style={styles.emblemStage}>
          <Animated.Image
            source={require("../assets/images/logo-glow.png")}
            style={[
              styles.radialGlowImage,
              { width: heroOrbSize, height: heroOrbSize },
              auraAnimatedStyle,
            ]}
            resizeMode="contain"
          />

          <Animated.View style={[styles.pulseRingOuter, outerRingAnimatedStyle]} />
          <Animated.View style={[styles.pulseRingInner, innerRingAnimatedStyle]} />

          {/* Outer Orbital Halo */}
          <Animated.View style={[styles.orbitHaloOuter, orbitOuterStyle]}>
            <View style={styles.orbitSparkPrimary} />
          </Animated.View>

          {/* Counter-Rotating Inner Orbital Halo */}
          <Animated.View style={[styles.orbitHaloInner, orbitInnerStyle]}>
            <View style={styles.orbitSparkSecondary} />
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400)}>
            <TouchableOpacity activeOpacity={0.95} onPress={handleEmblemTap}>
              <Animated.View style={emblemAnimatedStyle}>
                <LinearGradient
                  colors={[
                    "rgba(250, 204, 21, 0.78)",
                    "rgba(245, 158, 11, 0.28)",
                    "rgba(255, 255, 255, 0.14)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoFrameGradient}
                >
                  <View style={styles.logoCardInner}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.1)", "transparent"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.9, y: 0.9 }}
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
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Clean Minimal Brand Wordmark */}
        <Animated.View
          entering={FadeInUp.delay(80).duration(360)}
          style={styles.brandBlock}
        >
          <View style={styles.wordmarkRow}>
            <Text
              style={styles.brandTitle}
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
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
        </Animated.View>
      </View>

      {/* Bottom Minimal Animated Progress Bar (Zero Text Clutter) */}
      <Animated.View
        entering={FadeInUp.delay(140).duration(340)}
        style={[
          styles.footerContainer,
          { paddingBottom: Math.max(insets.bottom + verticalScale(24), verticalScale(36)) },
        ]}
      >
        <View style={[styles.progressTrack, { width: trackWidth }]}>
          <Animated.View style={[styles.progressFillBar, fillBarStyle]}>
            <LinearGradient
              colors={[colors.primaryDark, colors.primary, "#fde047"]}
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
                "rgba(255, 255, 255, 0.65)",
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
    backgroundColor: "#070605",
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
    opacity: 0.055,
  },
  topGlowWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "48%",
  },
  centerStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
    width: "100%",
  },
  emblemStage: {
    alignItems: "center",
    justifyContent: "center",
    width: scale(220),
    height: scale(220),
  },
  radialGlowImage: {
    position: "absolute",
  },
  pulseRingOuter: {
    position: "absolute",
    width: scale(142),
    height: scale(142),
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(250, 204, 21, 0.36)",
  },
  pulseRingInner: {
    position: "absolute",
    width: scale(130),
    height: scale(130),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.46)",
  },
  orbitHaloOuter: {
    position: "absolute",
    width: scale(168),
    height: scale(168),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.18)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  orbitHaloInner: {
    position: "absolute",
    width: scale(194),
    height: scale(194),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
  },
  orbitSparkPrimary: {
    width: scale(9),
    height: scale(9),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: -scale(4.5),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
  },
  orbitSparkSecondary: {
    width: scale(6),
    height: scale(6),
    borderRadius: radius.full,
    backgroundColor: "#fde047",
    marginTop: -scale(3),
    shadowColor: "#fde047",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
  },
  logoFrameGradient: {
    width: scale(120),
    height: scale(120),
    borderRadius: radius._30,
    padding: 1.5,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 26,
    elevation: 18,
  },
  logoCardInner: {
    flex: 1,
    borderRadius: radius._30,
    backgroundColor: "#171412",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
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
    width: scale(46),
    height: scale(200),
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  logo: {
    width: scale(80),
    height: scale(80),
  },
  brandBlock: {
    alignItems: "center",
    marginTop: verticalScale(14),
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: scale(36),
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 8,
    textShadowColor: "rgba(250, 204, 21, 0.2)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  amberLiveDot: {
    width: scale(9),
    height: scale(9),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginLeft: scale(5),
    marginBottom: verticalScale(18),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 4,
  },
  footerContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: scale(24),
  },
  progressTrack: {
    height: verticalScale(5),
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    position: "relative",
  },
  progressFillBar: {
    height: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressSweepWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  progressSweepGradient: {
    flex: 1,
    borderRadius: radius.full,
  },
});
