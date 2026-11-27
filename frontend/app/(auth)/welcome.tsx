import { StyleSheet, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import React from 'react';
import ScreenWrapper from "../../components/ScreenWrapper";
import Typo from "../../components/Typo";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { verticalScale, scale } from "../../utils/styling";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import AuthLegalFooter from "../../components/AuthLegalFooter";
import { hapticTap } from "../../utils/haptics";

const Welcome = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 700;
  const heroHeight = isCompactHeight ? verticalScale(185) : verticalScale(245);

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.45}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* ── Top Brand Badge ── */}
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={styles.brandRow}
        >
          <View style={styles.brandLeft}>
            <View style={styles.logoDot} />
            <Typo
              color={colors.white}
              size={18}
              fontWeight={'800'}
              style={styles.brandText}
              textProps={{ numberOfLines: 1 }}
            >
              BUBBLY
            </Typo>
          </View>

          <View style={styles.versionBadge}>
            <Typo size={10} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
              V4.1.5 RELEASE
            </Typo>
          </View>
        </Animated.View>

        {/* ── Hero Image ── */}
        <Animated.Image
          entering={FadeIn.duration(340).delay(40)}
          source={require('../../assets/images/welcome.png')}
          style={[styles.welcomeImage, { width: Math.min(width * 0.8, scale(320)), height: heroHeight }]}
          resizeMode="contain"
        />

        {/* ── Bottom Section ── */}
        <Animated.View
          entering={FadeInUp.duration(320).delay(80)}
          style={styles.bottomSection}
        >
          {/* Feature Highlights Strip */}
          <View style={styles.featureChipsRow}>
            <View style={styles.featureChip}>
              <Icons.Lightning size={verticalScale(12)} color={colors.primary} weight="fill" />
              <Typo size={11} fontWeight="700" color={colors.white}>Instant Sync</Typo>
            </View>
            <View style={styles.featureChip}>
              <Icons.PhoneCall size={verticalScale(12)} color={colors.primary} weight="fill" />
              <Typo size={11} fontWeight="700" color={colors.white}>HD Calls</Typo>
            </View>
            <View style={styles.featureChip}>
              <Icons.Translate size={verticalScale(12)} color={colors.primary} weight="fill" />
              <Typo size={11} fontWeight="700" color={colors.white}>AI Translate</Typo>
            </View>
            <View style={styles.featureChip}>
              <Icons.LockKey size={verticalScale(12)} color={colors.primary} weight="fill" />
              <Typo size={11} fontWeight="700" color={colors.white}>Secret Vault</Typo>
            </View>
          </View>

          {/* Headline */}
          <View style={styles.headlineContainer}>
            <Typo
              color={colors.white}
              size={isCompactHeight ? 32 : 36}
              fontWeight="800"
              style={styles.headlineMain}
            >
              Connect Seamlessly,
            </Typo>
            <Typo
              color={'rgba(255,255,255,0.48)'}
              size={isCompactHeight ? 32 : 36}
              fontWeight="800"
              style={styles.headlineSub}
            >
              Every Day.
            </Typo>
          </View>

          {/* Description */}
          <Typo
            color={'rgba(255,255,255,0.6)'}
            size={14}
            fontWeight="400"
            style={styles.subText}
          >
            Real-time messages, visual stories & crystal voice calls — all crafted for you.
          </Typo>

          {/* Divider */}
          <View style={styles.divider} />

          {/* CTA */}
          <View style={styles.ctaContainer}>
            <Button
              style={styles.getStartedBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Typo size={15.5} fontWeight="700" color={'#0a0a0a'} style={styles.btnLabel}>
                Get Started
              </Typo>
            </Button>

            <TouchableOpacity
              onPress={() => {
                hapticTap("medium");
                router.push('/(auth)/login');
              }}
              style={styles.loginBtn}
              activeOpacity={0.65}
            >
              <Typo size={13.5} color={'rgba(255,255,255,0.5)'} fontWeight="400">
                Already have an account?{'  '}
                <Typo size={13.5} color={colors.primary} fontWeight="700">
                  Sign In
                </Typo>
              </Typo>
            </TouchableOpacity>

            <AuthLegalFooter variant="dark" actionLabel="Review our" />
          </View>

        </Animated.View>

      </ScrollView>
    </ScreenWrapper>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._10,
    paddingBottom: spacingY._15,
    gap: spacingY._12,
  },

  // ─── Brand ───────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacingY._6,
    gap: spacingX._8,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    flexShrink: 1,
    minWidth: 0,
  },
  logoDot: {
    width: scale(9),
    height: scale(9),
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  brandText: {
    letterSpacing: 4,
    opacity: 0.95,
  },
  versionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: radius.full,
    flexShrink: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },

  // ─── Hero ─────────────────────────────────────────────────
  welcomeImage: {
    alignSelf: 'center',
    marginVertical: spacingY._6,
  },

  // ─── Bottom Section ───────────────────────────────────────
  bottomSection: {
    justifyContent: 'flex-end',
  },

  // Feature Chips
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: scale(7),
    marginBottom: spacingY._12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // ─── Headline ─────────────────────────────────────────────
  headlineContainer: {
    gap: 0,
    marginBottom: spacingY._8,
  },
  headlineMain: {
    lineHeight: verticalScale(41),
    letterSpacing: -0.5,
  },
  headlineSub: {
    lineHeight: verticalScale(41),
    letterSpacing: -0.5,
  },

  // ─── Sub Text ─────────────────────────────────────────────
  subText: {
    lineHeight: verticalScale(20),
    marginBottom: spacingY._15,
  },

  // ─── Divider ──────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: spacingY._15,
  },

  // ─── CTA ──────────────────────────────────────────────────
  ctaContainer: {
    gap: spacingY._8,
  },
  getStartedBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius._15,
    height: verticalScale(52),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 5,
  },
  btnLabel: {
    letterSpacing: 0.3,
  },
  loginBtn: {
    alignItems: 'center',
    paddingVertical: spacingY._8,
  },
});
