import React, { useEffect, useRef } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Vibration, Platform, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacingX, spacingY } from '../../constants/theme';
import { verticalScale, scale } from '../../utils/styling';
import Typo from '../../components/Typo';
import Avatar from '../../components/Avatar';
import { callAccept, callReject, onCallEnded } from '../../socket/socketEvents';

// ── Pulsing Ring Component ──
const PulsingRing = ({ size, color }: { size: number; color: string }) => {
    const scale1 = useSharedValue(1);
    const opacity1 = useSharedValue(0.5);
    const scale2 = useSharedValue(1);
    const opacity2 = useSharedValue(0.3);

    useEffect(() => {
        scale1.value = withRepeat(
            withTiming(1.35, { duration: 1600, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        opacity1.value = withRepeat(
            withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        scale2.value = withRepeat(
            withTiming(1.65, { duration: 1600, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        opacity2.value = withRepeat(
            withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
            -1, false
        );
    }, []);

    const ring1Style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale: scale1.value }],
        opacity: opacity1.value,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale: scale2.value }],
        opacity: opacity2.value,
    }));

    return (
        <>
            <Animated.View style={ring2Style} />
            <Animated.View style={ring1Style} />
        </>
    );
};

const IncomingCall = () => {
    const router = useRouter();
    const { callId, callerName, callerAvatar, kind, conversationId } = useLocalSearchParams();
    const vibrationRef = useRef<boolean>(true);
    const isVideo = kind === 'video';

    // ── Pulse animation for accept button ──
    const pulse = useSharedValue(1);

    // ── Slide up animation ──
    const slideY = useSharedValue(30);
    const fadeIn = useSharedValue(0);

    useEffect(() => {
        // Entry animation
        slideY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) });
        fadeIn.value = withTiming(1, { duration: 400 });

        pulse.value = withRepeat(
            withTiming(1.15, { duration: 800 }), -1, true
        );

        // ── Vibrate on incoming call ──
        const vibrate = () => {
            if (vibrationRef.current) {
                Vibration.vibrate([0, 500, 500]);
                setTimeout(vibrate, 2000);
            }
        };
        vibrate();

        // ── Listen for call ended (caller cancelled) ──
        onCallEnded(handleCallEndedByOther);

        return () => {
            vibrationRef.current = false;
            Vibration.cancel();
            onCallEnded(handleCallEndedByOther, true);
        };
    }, []);

    const handleCallEndedByOther = (data: { callId: string; reason: string }) => {
        if (data.callId !== callId) return;
        vibrationRef.current = false;
        Vibration.cancel();
        router.back();
    };

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const entryStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideY.value }],
        opacity: fadeIn.value,
    }));

    // ── All original functions untouched ──
    const handleAccept = () => {
        vibrationRef.current = false;
        Vibration.cancel();
        callAccept(callId as string);
        router.replace({
            pathname: '/(main)/callScreen',
            params: {
                callId,
                kind,
                conversationId,
                remoteUserName: callerName,
                remoteUserAvatar: callerAvatar,
                isOutgoing: 'false',
            },
        });
    };

    const handleReject = () => {
        vibrationRef.current = false;
        Vibration.cancel();
        callReject(callId as string);
        router.back();
    };

    return (
        <LinearGradient
            colors={['#0f0f0f', '#1a1a1a', '#111111']}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Animated.View style={[styles.content, entryStyle]}>

                {/* ── Top Section ── */}
                <View style={styles.topSection}>
                    {/* Call type badge */}
                    <View style={styles.callTypeBadge}>
                        <Icons.PhoneIncoming size={13} color={colors.primary} weight="fill" />
                        <Typo size={12} color={colors.primary} fontWeight="600" style={{ letterSpacing: 0.4 }}>
                            Incoming {isVideo ? 'Video' : 'Voice'} Call
                        </Typo>
                    </View>

                    {/* App name / encrypted label */}
                    <View style={styles.encryptedRow}>
                        <Icons.LockSimple size={11} color={'rgba(255,255,255,0.35)'} weight="fill" />
                        <Typo size={11} color={'rgba(255,255,255,0.35)'} style={{ marginLeft: 4 }}>
                            End-to-end encrypted
                        </Typo>
                    </View>
                </View>

                {/* ── Avatar Section ── */}
                <View style={styles.avatarSection}>
                    {/* Pulsing rings behind avatar */}
                    <View style={styles.avatarPulseContainer}>
                        <PulsingRing size={scale(130)} color={colors.primary} />

                        {/* Avatar border ring */}
                        <View style={styles.avatarOuterRing}>
                            <View style={styles.avatarInnerRing}>
                                <Avatar
                                    size={scale(116)}
                                    uri={callerAvatar as string}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Caller info */}
                    <View style={styles.callerInfo}>
                        <Typo size={28} fontWeight="700" color={colors.white}>
                            {callerName}
                        </Typo>
                        <View style={styles.callerSubRow}>
                            <View style={styles.callingDot} />
                            <Typo size={14} color={'rgba(255,255,255,0.55)'} fontWeight="400">
                                {isVideo ? 'wants to video call...' : 'is calling you...'}
                            </Typo>
                        </View>
                    </View>
                </View>

                {/* ── Swipe Hint (decorative) ── */}
                <View style={styles.hintRow}>
                    <View style={styles.hintLine} />
                    <Typo size={11} color={'rgba(255,255,255,0.25)'} style={{ marginHorizontal: spacingX._10 }}>
                        tap to respond
                    </Typo>
                    <View style={styles.hintLine} />
                </View>

                {/* ── Action Buttons ── */}
                <View style={styles.actionsContainer}>

                    {/* Reject */}
                    <View style={styles.actionWrap}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={handleReject}
                            activeOpacity={0.8}
                        >
                            <Icons.PhoneSlash size={verticalScale(28)} color={colors.white} weight="fill" />
                        </TouchableOpacity>
                        <Typo size={13} color={'rgba(255,255,255,0.65)'} fontWeight="500">
                            Decline
                        </Typo>
                    </View>

                    {/* Accept */}
                    <View style={styles.actionWrap}>
                        <Animated.View style={pulseStyle}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.acceptBtn]}
                                onPress={handleAccept}
                                activeOpacity={0.8}
                            >
                                {isVideo ? (
                                    <Icons.VideoCamera size={verticalScale(28)} color={colors.white} weight="fill" />
                                ) : (
                                    <Icons.Phone size={verticalScale(28)} color={colors.white} weight="fill" />
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                        <Typo size={13} color={'rgba(255,255,255,0.65)'} fontWeight="500">
                            Accept
                        </Typo>
                    </View>
                </View>

            </Animated.View>
        </LinearGradient>
    );
};

export default IncomingCall;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: verticalScale(Platform.OS === 'ios' ? 70 : 55),
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 55 : 45),
        paddingHorizontal: spacingX._30,
    },

    // ── Top ──
    topSection: {
        alignItems: 'center',
        gap: spacingY._10,
    },
    callTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._6,
        backgroundColor: 'rgba(250,204,21,0.12)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._7,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(250,204,21,0.2)',
    },
    encryptedRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // ── Avatar ──
    avatarSection: {
        alignItems: 'center',
        gap: spacingY._25,
    },
    avatarPulseContainer: {
        width: scale(130),
        height: scale(130),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarOuterRing: {
        borderRadius: radius.full,
        borderWidth: 3,
        borderColor: colors.primary,
        padding: 3,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 18,
        elevation: 12,
    },
    avatarInnerRing: {
        borderRadius: radius.full,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(250,204,21,0.15)',
    },
    callerInfo: {
        alignItems: 'center',
        gap: spacingY._7,
    },
    callerSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._6,
    },
    callingDot: {
        width: scale(7),
        height: scale(7),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        opacity: 0.8,
    },

    // ── Hint ──
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    hintLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },

    // ── Actions ──
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingX._40,
        width: '100%',
    },
    actionWrap: {
        alignItems: 'center',
        gap: spacingY._12,
    },
    actionBtn: {
        width: verticalScale(72),
        height: verticalScale(72),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 8,
    },
    rejectBtn: {
        backgroundColor: colors.rose,
        shadowColor: colors.rose,
    },
    acceptBtn: {
        backgroundColor: colors.green,
        shadowColor: colors.green,
    },
});