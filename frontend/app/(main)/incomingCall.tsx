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

// ── Multi-Layer Pulsing Rings ──
const IncomingPulsingRings = ({ size, color }: { size: number; color: string }) => {
    const scale1 = useSharedValue(1);
    const opacity1 = useSharedValue(0.55);
    const scale2 = useSharedValue(1);
    const opacity2 = useSharedValue(0.35);
    const scale3 = useSharedValue(1);
    const opacity3 = useSharedValue(0.18);

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
        scale3.value = withRepeat(
            withTiming(1.95, { duration: 1600, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        opacity3.value = withRepeat(
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

    const ring3Style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale: scale3.value }],
        opacity: opacity3.value,
    }));

    return (
        <>
            <Animated.View style={ring3Style} />
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

    // ── Entry animation ──
    const slideY = useSharedValue(30);
    const fadeIn = useSharedValue(0);

    useEffect(() => {
        slideY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.exp) });
        fadeIn.value = withTiming(1, { duration: 400 });

        pulse.value = withRepeat(
            withTiming(1.14, { duration: 800 }), -1, true
        );

        let timerId: any = null;
        const vibrate = () => {
            if (vibrationRef.current) {
                Vibration.vibrate([0, 500, 500]);
                timerId = setTimeout(vibrate, 2000);
            }
        };
        vibrate();

        onCallEnded(handleCallEndedByOther);

        return () => {
            vibrationRef.current = false;
            if (timerId) clearTimeout(timerId);
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

    const handleDeclineWithMessage = () => {
        vibrationRef.current = false;
        Vibration.cancel();
        callReject(callId as string);
        router.back();
        if (conversationId) {
            router.push({
                pathname: '/(main)/conversation',
                params: { id: conversationId as string, name: callerName as string },
            });
        }
    };

    return (
        <LinearGradient
            colors={['#09090b', '#18181b', '#09090b']}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Animated.View style={[styles.content, entryStyle]}>

                {/* ── Top Section ── */}
                <View style={styles.topSection}>
                    <View style={styles.callTypeBadge}>
                        {isVideo ? (
                            <Icons.VideoCamera size={14} color={colors.primary} weight="fill" />
                        ) : (
                            <Icons.PhoneIncoming size={14} color={colors.primary} weight="fill" />
                        )}
                        <Typo size={12} color={colors.primary} fontWeight="700" style={{ letterSpacing: 0.5 }}>
                            INCOMING {isVideo ? 'VIDEO' : 'AUDIO'} CALL
                        </Typo>
                    </View>

                    <View style={styles.encryptedRow}>
                        <Icons.ShieldCheck size={13} color={'rgba(255,255,255,0.45)'} weight="fill" />
                        <Typo size={11} color={'rgba(255,255,255,0.45)'} fontWeight="500" style={{ marginLeft: 5 }}>
                            End-to-End Encrypted HD Call
                        </Typo>
                    </View>
                </View>

                {/* ── Center Avatar with Multi-Layer Acoustic Waves ── */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarPulseContainer}>
                        <IncomingPulsingRings size={scale(136)} color={colors.primary} />

                        <View style={styles.avatarOuterRing}>
                            <View style={styles.avatarInnerRing}>
                                <Avatar
                                    size={scale(120)}
                                    uri={callerAvatar as string}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Caller name & status */}
                    <View style={styles.callerInfo}>
                        <Typo size={30} fontWeight="800" color={colors.white}>
                            {callerName}
                        </Typo>
                        <View style={styles.callerSubRow}>
                            <View style={styles.callingDot} />
                            <Typo size={15} color={'rgba(255,255,255,0.65)'} fontWeight="500">
                                {isVideo ? 'Incoming video invitation...' : 'Bubbly audio ringing...'}
                            </Typo>
                        </View>
                    </View>
                </View>

                {/* ── Decline with message shortcut ── */}
                <TouchableOpacity
                    style={styles.messageDeclineBtn}
                    onPress={handleDeclineWithMessage}
                    activeOpacity={0.75}
                >
                    <Icons.ChatText size={16} color={'rgba(255,255,255,0.65)'} weight="bold" />
                    <Typo size={12} color={'rgba(255,255,255,0.65)'} fontWeight="600">
                        Decline & Reply with Message
                    </Typo>
                </TouchableOpacity>

                {/* ── Primary Action Buttons (Decline / Accept) ── */}
                <View style={styles.actionsContainer}>

                    {/* Decline */}
                    <View style={styles.actionWrap}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={handleReject}
                            activeOpacity={0.8}
                        >
                            <Icons.PhoneSlash size={verticalScale(30)} color={colors.white} weight="fill" />
                        </TouchableOpacity>
                        <Typo size={13} color={'rgba(255,255,255,0.7)'} fontWeight="600">
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
                                    <Icons.VideoCamera size={verticalScale(30)} color={colors.white} weight="fill" />
                                ) : (
                                    <Icons.Phone size={verticalScale(30)} color={colors.white} weight="fill" />
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                        <Typo size={13} color={'rgba(255,255,255,0.7)'} fontWeight="600">
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
        gap: spacingX._7,
        backgroundColor: 'rgba(245,158,11,0.15)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._7,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.3)',
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
        width: scale(136),
        height: scale(136),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarOuterRing: {
        borderRadius: radius.full,
        borderWidth: 3,
        borderColor: colors.primary,
        padding: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 20,
        elevation: 14,
    },
    avatarInnerRing: {
        borderRadius: radius.full,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(245,158,11,0.2)',
    },
    callerInfo: {
        alignItems: 'center',
        gap: spacingY._7,
    },
    callerSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
    },
    callingDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },

    // ── Decline & message shortcut ──
    messageDeclineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._8,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
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
        gap: spacingY._10,
    },
    actionBtn: {
        width: verticalScale(74),
        height: verticalScale(74),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
        elevation: 10,
    },
    rejectBtn: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
    },
    acceptBtn: {
        backgroundColor: '#22c55e',
        shadowColor: '#22c55e',
    },
});
