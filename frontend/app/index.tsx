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
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Icons from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";
import {
  forceBypassWarmup,
  getWarmupSnapshot,
  startServerWarmup,
  subscribeWarmupState,
  WarmupSnapshot,
} from "../utils/serverWarmup";

const SPLASH_SHOWCASE = [
  {
    emoji: "💬",
    tag: "INSTANT MESSAGING",
    title: "Zero-Lag Real-Time Chats",
    desc: "Optimistic delivery, live typing waves, and smart read receipts.",
  },
  {
    emoji: "💸",
    tag: "SHARED EXPENSES",
    title: "In-Chat Split Bills",
    desc: "Split dinners or trips inside chat and mark shares settled in one tap.",
  },
  {
    emoji: "🎨",
    tag: "CREATIVE STUDIO",
    title: "Hand-Drawn Sketch Doodles",
    desc: "Draw quick vector doodles with custom inks right inside any chat.",
  },
  {
    emoji: "🙈",
    tag: "PLAYFUL PRIVACY",
    title: "Tap-to-Reveal Spoilers",
    desc: "Wrap ||secrets|| to keep surprises hidden until friends tap to reveal.",
  },
  {
    emoji: "📞",
    tag: "VOICE & VIDEO",
    title: "Crystal-Clear HD Calls",
    desc: "Jump into voice or video calls with 4 signature custom ringtones.",
  },
  {
    emoji: "🔐",
    tag: "CHAT VAULT",
    title: "4-Digit PIN & Privacy Shield",
    desc: "Hide sensitive conversations and mask previews on lock screens.",
  },
  {
    emoji: "📝",
    tag: "ORGANIZED",
    title: "Private Chat Scratchpads",
    desc: "Jot private sticky notes and checklists per chat without clutter.",
  },
  {
    emoji: "🔥",
    tag: "DAILY PULSE",
    title: "Messaging Streaks & Quiet Hours",
    desc: "Track your daily streak and auto-silence alerts overnight.",
  },
] as const;

const STATUS_HINTS = [
  "Waking up cloud servers...",
  "Brewing warm Honey Amber bubbles...",
  "Preparing HD voice & video channels...",
  "Syncing encrypted keys & vaults...",
  "Polishing real-time chat rooms...",
  "Almost ready — thanks for hanging tight!",
];

const BUBBLES: {
  size: number;
  leftPct: `${number}%`;
  bottomPct: `${number}%`;
  delayMs: number;
  durationMs: number;
  driftY: number;
}[] = [
  { size: 68, leftPct: "8%", bottomPct: "16%", delayMs: 0, durationMs: 5200, driftY: -36 },
  { size: 42, leftPct: "82%", bottomPct: "22%", delayMs: 500, durationMs: 4400, driftY: -30 },
  { size: 28, leftPct: "22%", bottomPct: "68%", delayMs: 900, durationMs: 4800, driftY: -24 },
  { size: 52, leftPct: "72%", bottomPct: "70%", delayMs: 300, durationMs: 5600, driftY: -32 },
  { size: 22, leftPct: "48%", bottomPct: "12%", delayMs: 1200, durationMs: 4200, driftY: -26 },
  { size: 36, leftPct: "14%", bottomPct: "44%", delayMs: 700, durationMs: 5000, driftY: -28 },
];

const FloatingBubble = ({
  size,
  leftPct,
  bottomPct,
  delayMs,
  durationMs,
  driftY,
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
      { translateY: interpolate(progress.value, [0, 1], [12, driftY]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.9, 1.08, 0.92]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.06, 0.18, 0.06]),
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
  const [showcaseIdx, setShowcaseIdx] = useState(0);
  const [hintIdx, setHintIdx] = useState(0);

  const auraBreath = useSharedValue(0);
  const pulseOuter = useSharedValue(0);
  const pulseInner = useSharedValue(0);
  const orbitSpin = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);
  const emblemFloat = useSharedValue(0);
  const emblemTapScale = useSharedValue(1);
  const warmupProgress = useSharedValue(0.05);

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

    pulseOuter.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );

    pulseInner.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );

    orbitSpin.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false
    );

    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );

    emblemFloat.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    warmupProgress.value = withTiming(0.94, {
      duration: 40000,
      easing: Easing.out(Easing.cubic),
    });

    const showcaseTimer = setInterval(() => {
      setShowcaseIdx((prev) => (prev + 1) % SPLASH_SHOWCASE.length);
    }, 5000);

    const hintTimer = setInterval(() => {
      setHintIdx((prev) => (prev + 1) % STATUS_HINTS.length);
    }, 4200);

    return () => {
      clearInterval(showcaseTimer);
      clearInterval(hintTimer);
    };
  }, []);

  useEffect(() => {
    if (warmup.serverResponded || warmup.status !== "warming") {
      warmupProgress.value = withTiming(1, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [warmup.serverResponded, warmup.status]);

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(auraBreath.value, [0, 1], [0.92, 1.1]) }],
    opacity: interpolate(auraBreath.value, [0, 1], [0.28, 0.6]),
  }));

  const outerRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseOuter.value, [0, 1], [0.95, 1.66]) }],
    opacity: interpolate(pulseOuter.value, [0, 0.2, 1], [0, 0.42, 0]),
  }));

  const innerRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseInner.value, [0, 1], [0.95, 1.46]) }],
    opacity: interpolate(pulseInner.value, [0, 0.2, 1], [0, 0.52, 0]),
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitSpin.value}deg` }],
  }));

  const emblemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(emblemFloat.value, [0, 1], [3, -5]) },
      { scale: interpolate(emblemFloat.value, [0, 1], [1, 1.02]) * emblemTapScale.value },
    ],
  }));

  const trackWidth = Math.min(scale(250), width * 0.68);
  const indicatorWidth = scale(76);
  const shimmerEndX = trackWidth + scale(12);

  const fillBarStyle = useAnimatedStyle(() => ({
    width: `${Math.round(warmupProgress.value * 1000) / 10}%`,
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

  const heroOrbSize = Math.min(scale(290), width * 0.78);
  const activeCard = SPLASH_SHOWCASE[showcaseIdx];
  const isReady = warmup.serverResponded || warmup.status === "ready";
  const showBypassPill = !isReady && warmup.elapsedMs >= 6500;

  const handleEmblemTap = () => {
    hapticTap("medium");
    emblemTapScale.value = withSequence(
      withSpring(0.92, { damping: 10, stiffness: 280 }),
      withSpring(1.04, { damping: 10, stiffness: 240 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  };

  const handleNextShowcase = () => {
    hapticTap("light");
    setShowcaseIdx((prev) => (prev + 1) % SPLASH_SHOWCASE.length);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Obsidian + Warm Charcoal Layered Canvas */}
      <LinearGradient
        colors={["#090807", "#14110f", "#1c1917", "#0d0b0a"]}
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
          "rgba(250, 204, 21, 0.14)",
          "rgba(245, 158, 11, 0.04)",
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

          <Animated.View style={[styles.orbitHaloRing, orbitAnimatedStyle]}>
            <View style={styles.orbitSpark} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(340).springify().damping(16)}>
            <TouchableOpacity activeOpacity={0.95} onPress={handleEmblemTap}>
              <Animated.View style={emblemAnimatedStyle}>
                <LinearGradient
                  colors={[
                    "rgba(250, 204, 21, 0.65)",
                    "rgba(245, 158, 11, 0.22)",
                    "rgba(255, 255, 255, 0.1)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoFrameGradient}
                >
                  <View style={styles.logoCardInner}>
                    <LinearGradient
                      colors={["rgba(255,255,255,0.09)", "transparent"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.9, y: 0.9 }}
                      style={styles.logoCardGloss}
                    />
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

        {/* Wordmark & Server Status Pill */}
        <Animated.View
          entering={FadeInUp.delay(60).duration(320)}
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
            <View
              style={[
                styles.amberLiveDot,
                isReady && { backgroundColor: "#22c55e", shadowColor: "#22c55e" },
              ]}
            />
          </View>

          <Text
            style={styles.brandSubtitle}
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            Connect beyond messages
          </Text>

          <LinearGradient
            colors={
              isReady
                ? ["rgba(34, 197, 94, 0.2)", "rgba(16, 185, 129, 0.08)"]
                : ["rgba(250, 204, 21, 0.16)", "rgba(245, 158, 11, 0.06)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.taglinePill,
              isReady && { borderColor: "rgba(34, 197, 94, 0.35)" },
            ]}
          >
            {isReady ? (
              <Icons.CheckCircle size={13} color="#4ade80" weight="fill" />
            ) : (
              <Icons.Lightning size={12} color={colors.primary} weight="fill" />
            )}
            <Text
              style={[styles.taglineText, isReady && { color: "#86efac" }]}
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              {isReady ? "Server Ready • Launching..." : "Fast  •  Private  •  Connected"}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Interactive Feature Showcase Carousel (Tap to explore!) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNextShowcase}
          style={styles.showcaseTouchWrap}
        >
          <Animated.View
            key={`card_${showcaseIdx}`}
            entering={FadeIn.duration(360)}
            exiting={FadeOut.duration(220)}
            style={styles.showcaseCard}
          >
            <View style={styles.showcaseEmojiBox}>
              <Text style={styles.showcaseEmoji}>{activeCard.emoji}</Text>
            </View>
            <View style={styles.showcaseTextWrap}>
              <Text style={styles.showcaseTag} numberOfLines={1}>
                {activeCard.tag}
              </Text>
              <Text style={styles.showcaseTitle} numberOfLines={1}>
                {activeCard.title}
              </Text>
              <Text style={styles.showcaseDesc} numberOfLines={2}>
                {activeCard.desc}
              </Text>
            </View>
            <Icons.CaretRight size={14} color="rgba(255,255,255,0.4)" weight="bold" />
          </Animated.View>

          <View style={styles.dotsRow}>
            {SPLASH_SHOWCASE.map((item, idx) => (
              <View
                key={item.tag}
                style={[styles.dot, idx === showcaseIdx && styles.dotActive]}
              />
            ))}
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Smooth 40s Progress & Footer */}
      <Animated.View
        entering={FadeInUp.delay(120).duration(300)}
        style={[
          styles.footerContainer,
          { paddingBottom: Math.max(insets.bottom + verticalScale(16), verticalScale(28)) },
        ]}
      >
        <View style={styles.progressSection}>
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
                  "rgba(255, 255, 255, 0.55)",
                  "rgba(255, 255, 255, 0)",
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.progressSweepGradient}
              />
            </Animated.View>
          </View>

          <Animated.Text
            key={`hint_${isReady ? "ready" : hintIdx}`}
            entering={FadeIn.duration(260)}
            style={styles.statusHintText}
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            {isReady ? "Connected! Opening your chats..." : STATUS_HINTS[hintIdx]}
          </Animated.Text>

          {showBypassPill && (
            <Animated.View entering={FadeInUp.duration(280)}>
              <TouchableOpacity
                onPress={() => {
                  hapticTap("medium");
                  forceBypassWarmup();
                }}
                activeOpacity={0.75}
                style={styles.bypassBtn}
              >
                <Text style={styles.bypassText}>Continue without waiting →</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <View style={styles.footerMetaRow}>
          <View style={styles.securityPill}>
            <Icons.ShieldCheck
              size={13}
              color={colors.primary}
              weight="fill"
            />
            <Text
              style={styles.footerText}
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              End-to-End Encrypted
            </Text>
          </View>

          <View style={styles.versionBadge}>
            <Text
              style={styles.versionText}
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              v4.1.5
            </Text>
          </View>
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
    opacity: 0.055,
  },
  topGlowWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
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
    width: scale(205),
    height: scale(205),
  },
  radialGlowImage: {
    position: "absolute",
  },
  pulseRingOuter: {
    position: "absolute",
    width: scale(134),
    height: scale(134),
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(250, 204, 21, 0.34)",
  },
  pulseRingInner: {
    position: "absolute",
    width: scale(124),
    height: scale(124),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  orbitHaloRing: {
    position: "absolute",
    width: scale(152),
    height: scale(152),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.16)",
    borderStyle: "dashed",
    alignItems: "center",
  },
  orbitSpark: {
    width: scale(8),
    height: scale(8),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: -scale(4),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  logoFrameGradient: {
    width: scale(114),
    height: scale(114),
    borderRadius: radius._30,
    padding: 1.5,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
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
  logo: {
    width: scale(76),
    height: scale(76),
  },
  brandBlock: {
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: scale(35),
    fontWeight: "900",
    color: colors.white,
    letterSpacing: 7,
    textShadowColor: "rgba(250, 204, 21, 0.16)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  amberLiveDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginLeft: scale(4),
    marginBottom: verticalScale(16),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  brandSubtitle: {
    marginTop: verticalScale(3),
    fontSize: scale(13),
    fontWeight: "500",
    color: colors.neutral400,
    letterSpacing: 0.5,
  },
  taglinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(12),
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(6),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.22)",
  },
  taglineText: {
    fontSize: scale(11.5),
    fontWeight: "600",
    color: "#fef08a",
    letterSpacing: 0.5,
  },
  showcaseTouchWrap: {
    marginTop: verticalScale(22),
    width: "100%",
    maxWidth: scale(320),
    alignItems: "center",
    gap: verticalScale(10),
  },
  showcaseCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderRadius: radius._20,
    backgroundColor: "rgba(255, 255, 255, 0.048)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.2)",
  },
  showcaseEmojiBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: radius._12,
    backgroundColor: "rgba(250, 204, 21, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  showcaseEmoji: {
    fontSize: scale(20),
  },
  showcaseTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  showcaseTag: {
    fontSize: scale(9),
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.9,
  },
  showcaseTitle: {
    marginTop: 1,
    fontSize: scale(13),
    fontWeight: "700",
    color: colors.white,
  },
  showcaseDesc: {
    marginTop: 2,
    fontSize: scale(11),
    color: colors.neutral400,
    lineHeight: verticalScale(15),
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
  },
  dot: {
    width: scale(5),
    height: scale(5),
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dotActive: {
    width: scale(16),
    backgroundColor: colors.primary,
  },
  footerContainer: {
    width: "100%",
    alignItems: "center",
    gap: verticalScale(14),
    paddingHorizontal: scale(24),
  },
  progressSection: {
    alignItems: "center",
    gap: verticalScale(8),
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
  statusHintText: {
    fontSize: scale(11),
    fontWeight: "500",
    color: colors.neutral400,
    letterSpacing: 0.4,
  },
  bypassBtn: {
    marginTop: verticalScale(2),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  bypassText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: colors.neutral300,
  },
  footerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  securityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.035)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  footerText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: colors.neutral400,
    letterSpacing: 0.4,
  },
  versionBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: radius.full,
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.22)",
  },
  versionText: {
    fontSize: scale(10.5),
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.8,
  },
});
