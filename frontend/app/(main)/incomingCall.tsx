import React, { useEffect, useRef } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Vibration, Platform, StatusBar, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { acceptCallHttp, getCallStatus, rejectCallHttp } from '../../services/callService';
import { hapticTap } from '../../utils/haptics';

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
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const isCompactHeight = height < 700;
    const { callId, callerId, callerName, callerAvatar, kind, conversationId } = useLocalSearchParams();
    const callIdStr = Array.isArray(callId) ? callId[0] : (callId as string);
    const callerIdStr = Array.isArray(callerId) ? callerId[0] : (callerId as string);
    const callerNameStr = Array.isArray(callerName) ? callerName[0] : (callerName as string);
    const callerAvatarStr = Array.isArray(callerAvatar) ? callerAvatar[0] : (callerAvatar as string);
    const kindStr = Array.isArray(kind) ? kind[0] : (kind as string);
    const conversationIdStr = Array.isArray(conversationId) ? conversationId[0] : (conversationId as string);
    const vibrationRef = useRef<boolean>(true);
    const hasEndedRef = useRef<boolean>(false);
    const isAcceptingRef = useRef<boolean>(false);
    const isVideo = kindStr === 'video';

    const safeBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace("/(main)/home");
    };

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
            if (vibrationRef.current && Platform.OS !== "web") {
                Vibration.vibrate([0, 650, 350]);
                timerId = setTimeout(vibrate, 1600);
            }
        };
        vibrate();

        onCallEnded(handleCallEndedByOther);

        // Verify call is still ringing (guards against stale notification cold-starts)
        if (callIdStr) {
            getCallStatus(callIdStr).then((res) => {
                const status = res?.data?.status;
                if (status && !['ringing', 'connecting'].includes(status)) {
                    hasEndedRef.current = true;
                    vibrationRef.current = false;
                    Vibration.cancel();
                    safeBack();
                }
            }).catch(() => {});
        }

        return () => {
            vibrationRef.current = false;
            if (timerId) clearTimeout(timerId);
            Vibration.cancel();
            onCallEnded(handleCallEndedByOther, true);
        };
    }, []);

    const handleCallEndedByOther = (data: { callId: string; reason: string }) => {
        if (String(data?.callId) !== callIdStr) return;
        hasEndedRef.current = true;
        vibrationRef.current = false;
        Vibration.cancel();
        hapticTap("warning");
        safeBack();
    };

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const entryStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: slideY.value }],
        opacity: fadeIn.value,
    }));

    const handleAccept = async () => {
        if (isAcceptingRef.current || hasEndedRef.current) return;
        isAcceptingRef.current = true;
        vibrationRef.current = false;
        Vibration.cancel();
        hapticTap("heavy");
        try {
            callAccept(callIdStr);
            const res = await acceptCallHttp(callIdStr);
            if (hasEndedRef.current || (res && res.success === false)) {
                safeBack();
                return;
            }
        } catch {
            if (hasEndedRef.current) {
                safeBack();
                return;
            }
        }
        if (hasEndedRef.current) {
            safeBack();
            return;
        }
        router.replace({
            pathname: '/(main)/callScreen',
            params: {
                callId: callIdStr,
                kind: kindStr,
                conversationId: conversationIdStr,
                remoteUserName: callerNameStr,
                remoteUserAvatar: callerAvatarStr || '',
                isOutgoing: 'false',
            },
        });
    };

    const handleReject = () => {
        hasEndedRef.current = true;
        vibrationRef.current = false;
        Vibration.cancel();
        hapticTap("heavy");
        callReject(callIdStr);
        rejectCallHttp(callIdStr).catch(() => {});
        safeBack();
    };

    const handleDeclineWithMessage = () => {
        hasEndedRef.current = true;
        vibrationRef.current = false;
        Vibration.cancel();
        hapticTap("heavy");
        callReject(callIdStr);
        rejectCallHttp(callIdStr).catch(() => {});
        if (conversationIdStr) {
            const participants = callerIdStr
                ? JSON.stringify([{ _id: callerIdStr, name: callerNameStr || 'Unknown', avatar: callerAvatarStr || '' }])
                : JSON.stringify([]);
            router.replace({
                pathname: '/(main)/conversation',
                params: {
                    id: conversationIdStr,
                    name: callerNameStr || '',
                    avatar: callerAvatarStr || '',
                    type: 'direct',
                    participants,
                },
            });
        } else {
            safeBack();
        }
    };

    return (
        <LinearGradient
            colors={['#09090b', '#18181b', '#09090b']}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Animated.View
                style={[
                    styles.content,
                    {
                        paddingTop: Math.max(insets.top, 24) + verticalScale(16),
                        paddingBottom: Math.max(insets.bottom, 20) + verticalScale(16),
                    },
                    entryStyle,
                ]}
            >

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
                        <IncomingPulsingRings size={isCompactHeight ? scale(118) : scale(136)} color={colors.primary} />

                        <View style={styles.avatarOuterRing}>
                            <View style={styles.avatarInnerRing}>
                                <Avatar
                                    size={isCompactHeight ? scale(104) : scale(120)}
                                    uri={callerAvatar as string}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Caller name & status */}
                    <View style={styles.callerInfo}>
                        <Typo
                            size={isCompactHeight ? 26 : 30}
                            fontWeight="800"
                            color={colors.white}
                            style={{ textAlign: 'center', maxWidth: '100%' }}
                            textProps={{ numberOfLines: 2, ellipsizeMode: 'tail' }}
                        >
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
        paddingHorizontal: spacingX._25,
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
