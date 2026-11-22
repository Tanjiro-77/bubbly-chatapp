import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Alert, StatusBar, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    createAgoraRtcEngine,
    IRtcEngine,
    ChannelProfileType,
    ClientRoleType,
    RtcSurfaceView,
    VideoSourceType,
} from 'react-native-agora';
import Animated, {
    FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacingX, spacingY } from '../../constants/theme';
import { verticalScale, scale } from '../../utils/styling';
import Typo from '../../components/Typo';
import Avatar from '../../components/Avatar';
import { getAgoraToken } from '../../services/callService';
import {
    callEnd,
    callConnected,
    onCallEnded,
    onCallConnected,
} from '../../socket/socketEvents';

type CallState = 'connecting' | 'ringing' | 'connected' | 'ended';

// ── Pulsing Ring Component ──
const PulsingRing = ({ size }: { size: number }) => {
    const scale1 = useSharedValue(1);
    const opacity1 = useSharedValue(0.6);
    const scale2 = useSharedValue(1);
    const opacity2 = useSharedValue(0.4);

    useEffect(() => {
        scale1.value = withRepeat(
            withTiming(1.35, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        opacity1.value = withRepeat(
            withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        scale2.value = withRepeat(
            withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1, false
        );
        opacity2.value = withRepeat(
            withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1, false
        );
    }, []);

    const ring1Style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        transform: [{ scale: scale1.value }],
        opacity: opacity1.value,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
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

const CallScreen = () => {
    const [localVideoReady, setLocalVideoReady] = useState(false);
    const router = useRouter();
    const {
        callId,
        kind,
        remoteUserName,
        remoteUserAvatar,
        isOutgoing,
    } = useLocalSearchParams();

    const isVideo = kind === 'video';
    const isOutgoingCall = isOutgoing === 'true';

    const engineRef = useRef<IRtcEngine | null>(null);
    const hasCleanedUp = useRef(false);

    const [callState, setCallState] = useState<CallState>(
        isOutgoingCall ? 'ringing' : 'connecting'
    );
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);

    const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── All original functions unchanged ───
    useEffect(() => {
        initAgora();
        onCallEnded(handleRemoteCallEnded);
        onCallConnected(handleRemoteConnected);

        return () => {
            onCallEnded(handleRemoteCallEnded, true);
            onCallConnected(handleRemoteConnected, true);
            cleanup();
        };
    }, []);

    const initAgora = async () => {
        try {
            const currentCallId = callId as string;
            if (!currentCallId) throw new Error("Missing callId");

            const tokenRes = await getAgoraToken(currentCallId, currentCallId);
            if (!tokenRes.success || !tokenRes.data) {
                console.error("Agora token error:", tokenRes.msg);
                Alert.alert("Call Error", tokenRes.msg || "Could not get Agora token");
                router.back();
                return;
            }

            const { token, appId, channelName, uid } = tokenRes.data;
            if (!token || !appId || !channelName || typeof uid !== "number") {
                console.error("Invalid Agora response:", tokenRes.data);
                Alert.alert("Call Error", "Invalid Agora configuration received from server");
                router.back();
                return;
            }

            const engine = createAgoraRtcEngine();
            engineRef.current = engine;

            engine.initialize({
                appId,
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
            });

            engine.registerEventHandler({
                onLocalAudioStateChanged: (connection, state, error) => {
                    console.log("Agora local audio:", { state, error });
                },
                onLocalVideoStateChanged: (_connection, state, error) => {
                    console.log("Agora local video:", { state, error });
                    if (error === 0 && state === 2) setLocalVideoReady(true);
                    if (state === 0) setLocalVideoReady(false);
                },
                onAudioRoutingChanged: (routing) => console.log("Agora audio route:", routing),
                onPermissionError: (permission) => console.log("Agora permission error:", permission),
                onJoinChannelSuccess: (connection, elapsed) => {
                    console.log("Agora joined channel successfully:", {
                        channel: connection.channelId, uid: connection.localUid, elapsed,
                    });
                    setCallState(isOutgoingCall ? "ringing" : "connecting");
                },
                onUserJoined: (_connection, remoteUid) => {
                    console.log("Agora remote user joined:", remoteUid);
                    setRemoteUid(remoteUid);
                    setCallState("connected");
                    callConnected(currentCallId);
                    startDurationTimer();
                },
                onUserOffline: (_connection, remoteUid) => {
                    console.log("Agora remote user left:", remoteUid);
                    setRemoteUid(null);
                    if (!hasCleanedUp.current) handleCallEnd();
                },
                onError: (err) => console.error("Agora error code:", err),
                onTokenPrivilegeWillExpire: async () => {
                    console.log("Agora token is about to expire");
                    try {
                        const newTokenRes = await getAgoraToken(currentCallId, channelName);
                        if (newTokenRes.success && newTokenRes.data?.token) {
                            await engine.renewToken(newTokenRes.data.token);
                            console.log("Agora token renewed");
                        } else {
                            console.error("Failed to renew Agora token:", newTokenRes.msg);
                        }
                    } catch (error) {
                        console.error("Agora token renewal error:", error);
                    }
                },
            });

            engine.enableLocalAudio(true);
            if (isVideo) {
                engine.enableVideo();
                engine.enableLocalVideo(true);
                engine.startPreview();
            }

            engine.setDefaultAudioRouteToSpeakerphone(true);

            await engine.joinChannel(token, channelName, uid, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                publishCameraTrack: isVideo,
                autoSubscribeVideo: true,
            });

            engine.setEnableSpeakerphone(true);
            setIsSpeakerOn(true);
        } catch (error) {
            console.error("initAgora error:", error);
            Alert.alert("Call Error", "Could not initialize the call");
            cleanup();
            router.back();
        }
    };

    const handleRemoteCallEnded = useCallback((data: {
        callId: string;
        reason: string;
    }) => {
        if (data.callId !== callId) return;
        if (hasCleanedUp.current) return;

        setCallState("ended");
        cleanup();
        router.back();
    }, [callId, router]);

    const handleRemoteConnected = useCallback((data: { callId: string }) => {
        if (data.callId !== callId) return;
        setCallState('connected');
        startDurationTimer();
    }, [callId]);

    const startDurationTimer = () => {
        if (durationRef.current) return;
        durationRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
    };

    const stopDurationTimer = () => {
        if (durationRef.current) {
            clearInterval(durationRef.current);
            durationRef.current = null;
        }
    };

    const cleanup = () => {
        if (hasCleanedUp.current) return;
        hasCleanedUp.current = true;
        stopDurationTimer();
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        if (engineRef.current) {
            engineRef.current.leaveChannel();
            engineRef.current.release();
            engineRef.current = null;
        }
    };

    const handleCallEnd = () => {
        if (hasCleanedUp.current) return;
        callEnd(callId as string);
        cleanup();
        router.back();
    };

    const toggleMute = () => {
        engineRef.current?.muteLocalAudioStream(!isMuted);
        setIsMuted(prev => !prev);
    };

    const toggleVideo = () => {
        const next = !isVideoOff;
        engineRef.current?.muteLocalVideoStream(next);
        if (next) setLocalVideoReady(false);
        setIsVideoOff(next);
    };

    const toggleSpeaker = () => {
        const next = !isSpeakerOn;
        engineRef.current?.setEnableSpeakerphone(next);
        setIsSpeakerOn(next);
    };

    const switchCamera = () => {
        engineRef.current?.switchCamera();
        setIsFrontCamera(prev => !prev);
    };

    const handleScreenTap = () => {
        if (!isVideo) return;
        setShowControls(prev => !prev);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    };

    const formatDuration = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getStatusText = () => {
        switch (callState) {
            case 'ringing': return isOutgoingCall ? 'Ringing...' : 'Incoming call...';
            case 'connecting': return 'Connecting...';
            case 'connected': return formatDuration(duration);
            case 'ended': return 'Call ended';
        }
    };

    const isConnecting = callState !== 'connected';

    // ─────────────────────────────────────────────
    // RENDER - VIDEO CALL
    // ─────────────────────────────────────────────
    if (isVideo) {
        return (
            <TouchableOpacity
                style={styles.videoContainer}
                activeOpacity={1}
                onPress={handleScreenTap}
            >
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Remote video full screen */}
                {remoteUid !== null ? (
                    <RtcSurfaceView
                        style={StyleSheet.absoluteFill}
                        canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
                        zOrderMediaOverlay={false}
                    />
                ) : (
                    <LinearGradient
                        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                        style={styles.waitingBg}
                    >
                        <View style={styles.waitingAvatarContainer}>
                            <PulsingRing size={scale(130)} />
                            <View style={styles.waitingAvatarBorder}>
                                <Avatar size={scale(110)} uri={remoteUserAvatar as string} />
                            </View>
                        </View>
                        <Typo size={22} fontWeight="700" color={colors.white} style={{ marginTop: spacingY._20 }}>
                            {remoteUserName}
                        </Typo>
                        <Typo size={14} color={'rgba(255,255,255,0.55)'} style={{ marginTop: spacingY._5 }}>
                            {getStatusText()}
                        </Typo>
                    </LinearGradient>
                )}

                {/* Local video small preview */}
                {!isVideoOff && localVideoReady && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.localVideoWrap}>
                        <RtcSurfaceView
                            style={styles.localVideo}
                            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                            zOrderMediaOverlay={true}
                        />
                        {/* Flip camera shortcut on preview */}
                        <TouchableOpacity style={styles.flipPreviewBtn} onPress={switchCamera} activeOpacity={0.8}>
                            <Icons.CameraRotate size={14} color={colors.white} weight="fill" />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Controls overlay */}
                {(showControls || callState !== 'connected') && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(200)}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="box-none"
                    >
                        {/* Top gradient */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0.75)', 'transparent']}
                            style={styles.videoTopGradient}
                        >
                            <View style={styles.videoTopBar}>
                                <View style={styles.videoTopLeft}>
                                    {remoteUid !== null && (
                                        <View style={styles.connectedDot} />
                                    )}
                                    <View>
                                        <Typo size={18} fontWeight="700" color={colors.white}>
                                            {remoteUserName}
                                        </Typo>
                                        <Typo size={13} color={callState === 'connected' ? colors.primary : 'rgba(255,255,255,0.6)'}>
                                            {getStatusText()}
                                        </Typo>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Bottom gradient + controls */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.videoBottomGradient}
                        >
                            <View style={styles.videoBottomBar}>
                                <VideoControlButton
                                    onPress={toggleMute}
                                    active={isMuted}
                                    icon={
                                        isMuted
                                            ? <Icons.MicrophoneSlash size={22} color={colors.white} weight="fill" />
                                            : <Icons.Microphone size={22} color={colors.white} weight="fill" />
                                    }
                                    label={isMuted ? 'Unmute' : 'Mute'}
                                    activeColor="rgba(239,68,68,0.7)"
                                />
                                <VideoControlButton
                                    onPress={toggleVideo}
                                    active={isVideoOff}
                                    icon={
                                        isVideoOff
                                            ? <Icons.VideoCameraSlash size={22} color={colors.white} weight="fill" />
                                            : <Icons.VideoCamera size={22} color={colors.white} weight="fill" />
                                    }
                                    label={isVideoOff ? 'Show' : 'Hide'}
                                    activeColor="rgba(239,68,68,0.7)"
                                />
                                <VideoControlButton
                                    onPress={switchCamera}
                                    icon={<Icons.CameraRotate size={22} color={colors.white} weight="fill" />}
                                    label="Flip"
                                />

                                {/* End Call */}
                                <View style={controlStyles.wrap}>
                                    <TouchableOpacity
                                        style={styles.endCallBtn}
                                        onPress={handleCallEnd}
                                        activeOpacity={0.85}
                                    >
                                        <Icons.PhoneSlash size={verticalScale(26)} color={colors.white} weight="fill" />
                                    </TouchableOpacity>
                                    <Typo size={11} color={'rgba(255,255,255,0.7)'} fontWeight="500">End</Typo>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}
            </TouchableOpacity>
        );
    }

    // ─────────────────────────────────────────────
    // RENDER - VOICE CALL
    // ─────────────────────────────────────────────
    return (
        <LinearGradient
            colors={['#1C1917', '#292524', '#1C1917']}
            style={styles.voiceContainer}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Animated.View entering={FadeIn.duration(500)} style={styles.voiceContent}>

                {/* ── Top section: name + status ── */}
                <View style={styles.voiceTopSection}>
                    <Typo size={13} color={colors.primary} fontWeight="600" style={styles.callTypeLabel}>
                        {isVideo ? '📹 Video Call' : '🔊 Voice Call'}
                    </Typo>
                    <Typo size={26} fontWeight="700" color={colors.white} style={{ marginTop: spacingY._5 }}>
                        {remoteUserName}
                    </Typo>
                    <Typo size={14} color={'rgba(255,255,255,0.55)'} style={{ marginTop: spacingY._5 }}>
                        {getStatusText()}
                    </Typo>
                </View>

                {/* ── Avatar with pulsing ring ── */}
                <View style={styles.voiceAvatarSection}>
                    {isConnecting && <PulsingRing size={scale(148)} />}
                    <View style={[
                        styles.voiceAvatarBorder,
                        callState === 'connected' && styles.voiceAvatarBorderConnected
                    ]}>
                        <Avatar size={scale(130)} uri={remoteUserAvatar as string} />
                    </View>
                </View>

                {/* ── Encrypted label like WhatsApp ── */}
                <View style={styles.encryptedRow}>
                    <Icons.LockSimple size={12} color={'rgba(255,255,255,0.4)'} weight="fill" />
                    <Typo size={11} color={'rgba(255,255,255,0.4)'} style={{ marginLeft: 4 }}>
                        End-to-end encrypted
                    </Typo>
                </View>

                {/* ── Controls ── */}
                <View style={styles.voiceControlsContainer}>
                    {/* Row 1: secondary controls */}
                    <View style={styles.voiceControlsRow}>
                        <VoiceControlButton
                            onPress={toggleMute}
                            active={isMuted}
                            icon={
                                isMuted
                                    ? <Icons.MicrophoneSlash size={24} color={isMuted ? colors.neutral900 : colors.white} weight="fill" />
                                    : <Icons.Microphone size={24} color={colors.white} weight="fill" />
                            }
                            label={isMuted ? 'Unmute' : 'Mute'}
                            activeColor={colors.primary}
                            activeIconColor={colors.neutral900}
                        />
                        <VoiceControlButton
                            onPress={toggleSpeaker}
                            active={isSpeakerOn}
                            icon={
                                <Icons.SpeakerHigh
                                    size={24}
                                    color={isSpeakerOn ? colors.neutral900 : colors.white}
                                    weight="fill"
                                />
                            }
                            label="Speaker"
                            activeColor={colors.primary}
                            activeIconColor={colors.neutral900}
                        />
                    </View>

                    {/* End call button */}
                    <View style={styles.endCallRow}>
                        <View style={{ alignItems: 'center', gap: spacingY._7 }}>
                            <TouchableOpacity
                                style={styles.endCallBtnLarge}
                                onPress={handleCallEnd}
                                activeOpacity={0.85}
                            >
                                <Icons.PhoneSlash size={verticalScale(30)} color={colors.white} weight="fill" />
                            </TouchableOpacity>
                            <Typo size={12} color={'rgba(255,255,255,0.6)'} fontWeight="500">
                                End call
                            </Typo>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </LinearGradient>
    );
};

// ── Video Control Button ──
const VideoControlButton = ({
    onPress, icon, label, active = false, activeColor = 'rgba(255,255,255,0.35)',
}: {
    onPress: () => void;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    activeColor?: string;
}) => (
    <View style={controlStyles.wrap}>
        <TouchableOpacity
            style={[controlStyles.videoBtn, active && { backgroundColor: activeColor }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {icon}
        </TouchableOpacity>
        <Typo size={11} color={'rgba(255,255,255,0.75)'} fontWeight="500">{label}</Typo>
    </View>
);

// ── Voice Control Button ──
const VoiceControlButton = ({
    onPress, icon, label, active = false, activeColor, activeIconColor,
}: {
    onPress: () => void;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    activeColor?: string;
    activeIconColor?: string;
}) => (
    <View style={controlStyles.wrap}>
        <TouchableOpacity
            style={[
                controlStyles.voiceBtn,
                active && { backgroundColor: activeColor ?? 'rgba(255,255,255,0.35)' }
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {icon}
        </TouchableOpacity>
        <Typo size={12} color={'rgba(255,255,255,0.65)'} fontWeight="500">{label}</Typo>
    </View>
);

const controlStyles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        gap: spacingY._7,
    },
    videoBtn: {
        width: verticalScale(56),
        height: verticalScale(56),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    voiceBtn: {
        width: verticalScale(64),
        height: verticalScale(64),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
});

export default CallScreen;

const styles = StyleSheet.create({
    // ── Video ──
    videoContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    waitingBg: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingY._10,
    },
    waitingAvatarContainer: {
        width: scale(130),
        height: scale(130),
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingAvatarBorder: {
        borderRadius: radius.full,
        borderWidth: 3,
        borderColor: colors.primary,
        overflow: 'hidden',
    },
    localVideoWrap: {
        position: 'absolute',
        top: verticalScale(Platform.OS === 'ios' ? 110 : 80),
        right: spacingX._15,
        width: scale(95),
        height: verticalScale(140),
        borderRadius: radius._15,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    localVideo: { flex: 1 },
    flipPreviewBtn: {
        position: 'absolute',
        bottom: spacingY._7,
        right: spacingX._7,
        width: scale(26),
        height: scale(26),
        borderRadius: radius.full,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoTopGradient: {
        paddingTop: verticalScale(Platform.OS === 'ios' ? 60 : 40),
        paddingHorizontal: spacingX._20,
        paddingBottom: spacingY._30,
    },
    videoTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    videoTopLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
    },
    connectedDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: radius.full,
        backgroundColor: '#4ade80',
    },
    videoBottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 50 : 35),
        paddingTop: spacingY._40,
    },
    videoBottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingX._20,
        paddingHorizontal: spacingX._20,
    },
    endCallBtn: {
        width: verticalScale(62),
        height: verticalScale(62),
        borderRadius: radius.full,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 8,
    },

    // ── Voice ──
    voiceContainer: {
        flex: 1,
    },
    voiceContent: {
        flex: 1,
        alignItems: 'center',
        paddingTop: verticalScale(Platform.OS === 'ios' ? 70 : 50),
        paddingBottom: verticalScale(50),
        paddingHorizontal: spacingX._30,
    },
    voiceTopSection: {
        alignItems: 'center',
    },
    callTypeLabel: {
        letterSpacing: 0.5,
    },
    voiceAvatarSection: {
        marginTop: verticalScale(50),
        marginBottom: verticalScale(30),
        width: scale(148),
        height: scale(148),
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceAvatarBorder: {
        borderRadius: radius.full,
        borderWidth: 3,
        borderColor: 'rgba(250,204,21,0.3)',
        overflow: 'hidden',
        padding: 3,
    },
    voiceAvatarBorderConnected: {
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 10,
    },
    encryptedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(55),
    },
    voiceControlsContainer: {
        width: '100%',
        alignItems: 'center',
        gap: spacingY._30,
    },
    voiceControlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacingX._35,
    },
    endCallRow: {
        alignItems: 'center',
        marginTop: spacingY._10,
    },
    endCallBtnLarge: {
        width: verticalScale(72),
        height: verticalScale(72),
        borderRadius: radius.full,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.65,
        shadowRadius: 14,
        elevation: 10,
    },
});