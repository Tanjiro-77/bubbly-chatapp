import React, { useEffect } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Icons from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";

const FEATURE_PILLS = [
  { key: "realtime", label: "Realtime", Icon: Icons.ChatCircleDots },
  { key: "calls", label: "HD Calls", Icon: Icons.PhoneCall },
  { key: "vault", label: "Protected", Icon: Icons.LockKey },
] as const;

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const auraBreath = useSharedValue(0);
  const pulseOuter = useSharedValue(0);
  const pulseInner = useSharedValue(0);
  const shimmerProgress = useSharedValue(0);
  const emblemFloat = useSharedValue(0);

  useEffect(() => {
    auraBreath.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    pulseOuter.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );

    pulseInner.value = withDelay(
      700,
      withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      )
    );

    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );

    emblemFloat.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(auraBreath.value, [0, 1], [0.94, 1.08]) }],
    opacity: interpolate(auraBreath.value, [0, 1], [0.28, 0.56]),
  }));

  const outerRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseOuter.value, [0, 1], [0.95, 1.62]) }],
    opacity: interpolate(pulseOuter.value, [0, 0.2, 1], [0, 0.42, 0]),
  }));

  const innerRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseInner.value, [0, 1], [0.95, 1.44]) }],
    opacity: interpolate(pulseInner.value, [0, 0.2, 1], [0, 0.52, 0]),
  }));

  const emblemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(emblemFloat.value, [0, 1], [2, -4]) },
      { scale: interpolate(emblemFloat.value, [0, 1], [1, 1.018]) },
    ],
  }));

  const trackWidth = Math.min(scale(190), width * 0.52);
  const indicatorWidth = scale(74);
  const shimmerEndX = trackWidth + scale(12);

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

      {/* Top Radial Honey-Gold Ambient Vignette */}
      <LinearGradient
        colors={[
          "rgba(250, 204, 21, 0.12)",
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
          { paddingTop: Math.max(insets.top, verticalScale(20)) },
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

          <View style={styles.staticOrbitHalo} />

          <Animated.View entering={FadeInDown.duration(340).springify().damping(16)}>
            <Animated.View style={emblemAnimatedStyle}>
              <LinearGradient
                colors={[
                  "rgba(250, 204, 21, 0.55)",
                  "rgba(245, 158, 11, 0.18)",
                  "rgba(255, 255, 255, 0.08)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoFrameGradient}
              >
                <View style={styles.logoCardInner}>
                  <LinearGradient
                    colors={["rgba(255,255,255,0.08)", "transparent"]}
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
          </Animated.View>
        </View>

        {/* Wordmark & Tagline */}
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
            <View style={styles.amberLiveDot} />
          </View>

          <Text
            style={styles.brandSubtitle}
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            Connect beyond messages
          </Text>

          <LinearGradient
            colors={[
              "rgba(250, 204, 21, 0.16)",
              "rgba(245, 158, 11, 0.06)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.taglinePill}
          >
            <Icons.Lightning size={12} color={colors.primary} weight="fill" />
            <Text
              style={styles.taglineText}
              maxFontSizeMultiplier={1.25}
              numberOfLines={1}
            >
              Fast  •  Private  •  Connected
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Compact Capability Micro-Pills */}
        <Animated.View
          entering={FadeIn.delay(110).duration(300)}
          style={styles.capabilityRow}
        >
          {FEATURE_PILLS.map(({ key, label, Icon }) => (
            <View key={key} style={styles.capabilityPill}>
              <Icon size={12} color={colors.primary} weight="duotone" />
              <Text
                style={styles.capabilityText}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom Initialization Sweep & Security Footer */}
      <Animated.View
        entering={FadeInUp.delay(120).duration(300)}
        style={[
          styles.footerContainer,
          { paddingBottom: Math.max(insets.bottom + verticalScale(18), verticalScale(30)) },
        ]}
      >
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { width: trackWidth }]}>
            <Animated.View
              style={[
                styles.progressSweepWrapper,
                { width: indicatorWidth },
                shimmerBarStyle,
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(250, 204, 21, 0)",
                  colors.primary,
                  "#fef08a",
                  "rgba(245, 158, 11, 0)",
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.progressSweepGradient}
              />
            </Animated.View>
          </View>
          <Text
            style={styles.statusHintText}
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
          >
            Securing workspace
          </Text>
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
    height: "44%",
  },
  centerStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
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
  staticOrbitHalo: {
    position: "absolute",
    width: scale(146),
    height: scale(146),
    borderRadius: radius._30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(250, 204, 21, 0.025)",
  },
  logoFrameGradient: {
    width: scale(118),
    height: scale(118),
    borderRadius: radius._30,
    padding: 1.5,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
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
    width: scale(78),
    height: scale(78),
  },
  brandBlock: {
    alignItems: "center",
    marginTop: verticalScale(12),
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
    marginTop: verticalScale(4),
    fontSize: scale(13),
    fontWeight: "500",
    color: colors.neutral400,
    letterSpacing: 0.5,
  },
  taglinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(14),
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
    letterSpacing: 0.6,
  },
  capabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: verticalScale(22),
  },
  capabilityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: radius._12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  capabilityText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: colors.neutral300,
    letterSpacing: 0.3,
  },
  footerContainer: {
    width: "100%",
    alignItems: "center",
    gap: verticalScale(16),
    paddingHorizontal: scale(24),
  },
  progressSection: {
    alignItems: "center",
    gap: verticalScale(8),
  },
  progressTrack: {
    height: verticalScale(3.5),
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  progressSweepWrapper: {
    height: "100%",
  },
  progressSweepGradient: {
    flex: 1,
    borderRadius: radius.full,
  },
  statusHintText: {
    fontSize: scale(11),
    fontWeight: "500",
    color: colors.neutral500,
    letterSpacing: 0.8,
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
