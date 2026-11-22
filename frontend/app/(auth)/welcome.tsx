import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native'
import React from 'react'
import ScreenWrapper from "../../components/ScreenWrapper"
import Typo from "../../components/Typo"
import { colors, spacingX, spacingY } from "../../constants/theme"
import { verticalScale } from "../../utils/styling"
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated"
import Button from "../../components/Button"
import { useRouter } from "expo-router"

const { width, height } = Dimensions.get('window');

const Welcome = () => {
  const router = useRouter();

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.5}>
      <View style={styles.container}>

        {/* Top Brand */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100).springify()}
          style={styles.brandRow}
        >
          <View style={styles.logoDot} />
          <Typo
            color={colors.white}
            size={18}
            fontWeight={'800'}
            style={styles.brandText}
          >
            BUBBLY
          </Typo>
        </Animated.View>

        {/* Hero Image */}
        <Animated.Image
          entering={FadeIn.duration(900).delay(200).springify()}
          source={require('../../assets/images/welcome.png')}
          style={styles.welcomeImage}
          resizeMode="contain"
        />

        {/* Bottom Section */}
        <Animated.View
          entering={FadeInUp.duration(700).delay(350).springify()}
          style={styles.bottomSection}
        >
          {/* Headline */}
          <View style={styles.headlineContainer}>
            <Typo
              color={colors.white}
              size={40}
              fontWeight="800"
              style={styles.headlineMain}
            >
              Stay Connected,
            </Typo>
            <Typo
              color={'rgba(255,255,255,0.4)'}
              size={40}
              fontWeight="800"
              style={styles.headlineSub}
            >
              Always.
            </Typo>
          </View>

          {/* Description */}
          <Typo
            color={'rgba(255,255,255,0.42)'}
            size={14}
            fontWeight="400"
            style={styles.subText}
          >
            Messages, moments & memories —{'\n'}all in one place.
          </Typo>

          {/* Divider */}
          <View style={styles.divider} />

          {/* CTA */}
          <View style={styles.ctaContainer}>
            <Button
              style={styles.getStartedBtn}
              onPress={() => router.push('/(auth)/register')}
            >
              <Typo size={15} fontWeight="700" color={'#0a0a0a'} style={styles.btnLabel}>
                Get Started
              </Typo>
            </Button>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.loginBtn}
              activeOpacity={0.65}
            >
              <Typo size={13.5} color={'rgba(255,255,255,0.42)'} fontWeight="400">
                Already have an account?{'  '}
                <Typo size={13.5} color={'rgba(255,255,255,0.9)'} fontWeight="700">
                  Sign In
                </Typo>
              </Typo>
            </TouchableOpacity>
          </View>

        </Animated.View>

      </View>
    </ScreenWrapper>
  )
}

export default Welcome

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._10,
    paddingBottom: spacingY._20,
  },

  // ─── Brand ───────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: spacingY._10,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.white,
    opacity: 0.85,
  },
  brandText: {
    letterSpacing: 4,
    opacity: 0.92,
  },

  // ─── Hero ─────────────────────────────────────────────────
  welcomeImage: {
    height: verticalScale(300),
    width: width * 0.82,
    alignSelf: 'center',
    marginTop: spacingY._20,
  },

  // ─── Bottom Section ───────────────────────────────────────
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacingY._10,
  },

  // ─── Headline ─────────────────────────────────────────────
  headlineContainer: {
    gap: 0,
    marginBottom: spacingY._10,
  },
  headlineMain: {
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  headlineSub: {
    lineHeight: 50,
    letterSpacing: -0.5,
  },

  // ─── Sub Text ─────────────────────────────────────────────
  subText: {
    lineHeight: 21,
    marginBottom: spacingY._20,
  },

  // ─── Divider ──────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: spacingY._20,
  },

  // ─── CTA ──────────────────────────────────────────────────
  ctaContainer: {
    gap: spacingY._10,
  },
  getStartedBtn: {
    backgroundColor: colors.white,
    borderRadius: 14,
    height: verticalScale(52),
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  btnLabel: {
    letterSpacing: 0.3,
  },
  loginBtn: {
    alignItems: 'center',
    paddingVertical: spacingY._10,
  },
})