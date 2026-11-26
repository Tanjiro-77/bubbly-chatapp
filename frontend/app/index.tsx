import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Icons from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacingX, spacingY } from "../constants/theme";
import { scale, verticalScale } from "../utils/styling";

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);

  useEffect(() => {
    glowScale.value = withRepeat(
      withTiming(1.18, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.65, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.neutral900} translucent />

      {/* Ambient background glow */}
      <View style={styles.ambientAura} />

      {/* Center Branding Block */}
      <View style={styles.centerContent}>
        {/* Glowing halo behind logo */}
        <View style={styles.logoWrapper}>
          <Animated.View style={[styles.glowRing, animatedGlowStyle]} />

          <Animated.View
            entering={FadeInDown.duration(700).springify()}
            style={styles.logoCard}
          >
            <Animated.Image
              source={require("../assets/images/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Brand Wordmark */}
        <Animated.View
          entering={FadeInDown.duration(650).delay(180).springify()}
          style={styles.brandRow}
        >
          <Text style={styles.brandTitle}>BUBBLY</Text>
          <View style={styles.amberDot} />
        </Animated.View>

        {/* Tagline Badge */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.taglineBadge}
        >
          <LinearGradient
            colors={["rgba(245, 158, 11, 0.15)", "rgba(217, 119, 6, 0.05)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.taglineGradient}
          >
            <Text style={styles.taglineText}>Fast • Private • Connected</Text>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Bottom Launch & Security Footer */}
      <Animated.View
        entering={FadeInUp.duration(600).delay(450)}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacingY._20) + spacingY._15 }]}
      >
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />

        <View style={styles.securityRow}>
          <Icons.ShieldCheck size={13} color={colors.neutral500} weight="fill" />
          <Text style={styles.footerText} maxFontSizeMultiplier={1.3} numberOfLines={1}>End-to-End Encrypted</Text>
        </View>

        <Text style={styles.versionText} maxFontSizeMultiplier={1.3} numberOfLines={1}>v4.0.2</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.neutral900,
  },
  ambientAura: {
    position: "absolute",
    width: scale(320),
    height: scale(320),
    borderRadius: scale(160),
    backgroundColor: "rgba(245, 158, 11, 0.04)",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacingY._20,
  },
  glowRing: {
    position: "absolute",
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: "rgba(245, 158, 11, 0.18)",
  },
  logoCard: {
    width: scale(112),
    height: scale(112),
    borderRadius: radius._30,
    backgroundColor: "#24201c",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    width: scale(88),
    height: scale(88),
    borderRadius: radius._24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: spacingY._8,
  },
  brandTitle: {
    fontSize: verticalScale(30),
    fontWeight: "800",
    letterSpacing: 6,
    color: colors.white,
  },
  amberDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
    backgroundColor: colors.primary,
    marginLeft: spacingX._4,
    marginBottom: verticalScale(2),
  },
  taglineBadge: {
    borderRadius: radius.full,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  taglineGradient: {
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._6,
  },
  taglineText: {
    fontSize: verticalScale(12),
    fontWeight: "600",
    color: colors.neutral400,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: {
    paddingTop: spacingY._12,
    alignItems: "center",
    gap: spacingY._6,
  },
  loader: {
    marginBottom: spacingY._6,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._5,
  },
  footerText: {
    fontSize: verticalScale(12),
    color: colors.neutral500,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: verticalScale(11),
    color: colors.neutral600,
    fontWeight: "500",
    letterSpacing: 1,
  },
});
