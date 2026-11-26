import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, StatusBar, Platform, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubblyAlert } from '../../components/BubblyAlert';
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
import { getAgoraToken, rejectCallHttp } from '../../services/callService';
import {
    callCancel,
    callEnd,
    callReject,
    callConnected,
    onCallEnded,
    onCallConnected,
} from '../../socket/socketEvents';

type CallState = 'connecting' | 'ringing' | 'connected' | 'ended';

// ── Multi-Layer Acoustic Pulsing Rings ──
const AcousticRings = ({ size }: { size: number }) => {
    const scale1 = useSharedValue(1);
    const opacity1 = useSharedValue(0.6);
    const scale2 = useSharedValue(1);
    const opacity2 = useSharedValue(0.4);
    const scale3 = useSharedValue(1);
    const opacity3 = useSharedValue(0.2);

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

    const ring3Style = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
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

const CallScreen = () => {
    const [localVideoReady, setLocalVideoReady] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const isCompactHeight = height < 700;
    const {
        callId,
        kind,
        remoteUserName,
        remoteUserAvatar,
        isOutgoing,
    } = useLocalSearchParams();

    const callIdStr = Array.isArray(callId) ? callId[0] : (callId as string);
    const kindStr = Array.isArray(kind) ? kind[0] : (kind as string);
    const isVideo = kindStr === 'video';
    const isOutgoingCall = (Array.isArray(isOutgoing) ? isOutgoing[0] : isOutgoing) === 'true';

    const safeBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(main)/home");
    }, [router]);

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
            const currentCallId = callIdStr;
            if (!currentCallId) throw new Error("Missing callId");

            const { AudioModule } = require("expo-audio");
            const micPerm = await AudioModule.requestRecordingPermissionsAsync();
            if (!micPerm?.granted) {
                hasCleanedUp.current = true;
                if (isOutgoingCall) {
                    callCancel(currentCallId);
                } else {
                    callReject(currentCallId);
                    rejectCallHttp(currentCallId).catch(() => {});
                }
                BubblyAlert.alert("Microphone Permission", "Microphone access is required for calls.");
                safeBack();
                return;
            }
            if (isVideo) {
                const ImagePicker = require("expo-image-picker");
                const camPerm = await ImagePicker.requestCameraPermissionsAsync();
                if (!camPerm?.granted) {
                    BubblyAlert.alert("Camera Permission", "Camera access is required for video calls.");
                }
            }

            const tokenRes = await getAgoraToken(currentCallId, currentCallId);
            if (hasCleanedUp.current) return;
            if (!tokenRes.success || !tokenRes.data) {
                console.error("Agora token error:", tokenRes.msg);
                BubblyAlert.alert("Call Error", tokenRes.msg || "Could not get Agora token");
                safeBack();
                return;
            }

            const { token, appId, channelName, uid } = tokenRes.data;
            if (!token || !appId || !channelName || typeof uid !== "number") {
                console.error("Invalid Agora response:", tokenRes.data);
                BubblyAlert.alert("Call Error", "Invalid Agora configuration received from server");
                safeBack();
                return;
            }

            const engine = createAgoraRtcEngine();
            if (hasCleanedUp.current) {
                try { engine.release(); } catch {}
                return;
            }
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
                onUserJoined: (_connection, rUid) => {
                    console.log("Agora remote user joined:", rUid);
                    setRemoteUid(rUid);
                    setCallState("connected");
                    callConnected(currentCallId);
                    startDurationTimer();
                },
                onUserOffline: (_connection, rUid) => {
                    console.log("Agora remote user left:", rUid);
                    setRemoteUid(null);
                    if (!hasCleanedUp.current) handleCallEnd();
                },
                onError: (err) => console.error("Agora error code:", err),
                onTokenPrivilegeWillExpire: async () => {
                    console.log("Agora token is about to expire");
                    try {
                        const newTokenRes = await getAgoraToken(currentCallId, channelName);
                        if (hasCleanedUp.current || !engineRef.current) return;
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

            if (hasCleanedUp.current) {
                try { engine.leaveChannel(); engine.release(); } catch {}
                engineRef.current = null;
                return;
            }

            engine.setEnableSpeakerphone(true);
            setIsSpeakerOn(true);
        } catch (error) {
            if (hasCleanedUp.current) return;
            console.error("initAgora error:", error);
            BubblyAlert.alert("Call Error", "Could not initialize the call");
            cleanup();
            safeBack();
        }
    };

    const handleRemoteCallEnded = useCallback((data: {
        callId: string;
        reason: string;
    }) => {
        if (data.callId !== callIdStr) return;
        if (hasCleanedUp.current) return;

        setCallState("ended");
        cleanup();
        safeBack();
    }, [callIdStr, safeBack]);

    const handleRemoteConnected = useCallback((data: { callId: string }) => {
        if (data.callId !== callIdStr) return;
        setCallState('connected');
        startDurationTimer();
    }, [callIdStr]);

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
            try { engineRef.current.leaveChannel(); } catch {}
            try { engineRef.current.release(); } catch {}
            engineRef.current = null;
        }
    };

    const handleCallEnd = () => {
        if (hasCleanedUp.current) return;
        callEnd(callIdStr);
        cleanup();
        safeBack();
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
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 4500);
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
            case 'connecting': return 'Connecting secure channel...';
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
                        colors={['#18181b', '#09090b', '#18181b']}
                        style={styles.waitingBg}
                    >
                        <View style={styles.waitingAvatarContainer}>
                            <AcousticRings size={scale(136)} />
                            <View style={styles.waitingAvatarBorder}>
                                <Avatar size={scale(114)} uri={remoteUserAvatar as string} />
                            </View>
                        </View>
                        <Typo size={24} fontWeight="800" color={colors.white} style={{ marginTop: spacingY._20 }}>
                            {remoteUserName}
                        </Typo>
                        <View style={styles.connectingPill}>
                            <View style={styles.pulsingDot} />
                            <Typo size={13} color={colors.primary} fontWeight="600">
                                {getStatusText()}
                            </Typo>
                        </View>
                    </LinearGradient>
                )}

                {/* Local video small PIP preview */}
                {!isVideoOff && localVideoReady && (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={[
                            styles.localVideoWrap,
                            { top: Math.max(insets.top, 20) + verticalScale(78) },
                        ]}
                    >
                        <RtcSurfaceView
                            style={styles.localVideo}
                            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                            zOrderMediaOverlay={true}
                        />
                        {/* Flip camera shortcut on PIP preview */}
                        <TouchableOpacity style={styles.flipPreviewBtn} onPress={switchCamera} activeOpacity={0.8}>
                            <Icons.CameraRotate size={16} color={colors.white} weight="fill" />
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
                        {/* Top glass header */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
                            style={[
                                styles.videoTopGradient,
                                { paddingTop: Math.max(insets.top, 20) + verticalScale(12) },
                            ]}
                        >
                            <View style={styles.videoTopBar}>
                                <View style={styles.videoTopLeft}>
                                    <View style={styles.videoHeaderAvatarWrap}>
                                        <Avatar size={38} uri={remoteUserAvatar as string} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Typo
                                            size={18}
                                            fontWeight="800"
                                            color={colors.white}
                                            textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
                                        >
                                            {remoteUserName}
                                        </Typo>
                                        <View style={styles.videoStatusRow}>
                                            {callState === 'connected' && (
                                                <View style={styles.connectedDot} />
                                            )}
                                            <Typo size={12} color={callState === 'connected' ? colors.primary : 'rgba(255,255,255,0.7)'} fontWeight="600" textProps={{ numberOfLines: 1 }}>
                                                {getStatusText()}
                                            </Typo>
                                        </View>
                                    </View>
                                </View>

                                {/* Quality badge */}
                                <View style={styles.hdBadge}>
                                    <Icons.ShieldCheck size={14} color={colors.primary} weight="fill" />
                                    <Typo size={11} color={colors.white} fontWeight="700">HD · E2EE</Typo>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Bottom dock controls */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
                            style={[
                                styles.videoBottomGradient,
                                { paddingBottom: Math.max(insets.bottom, 16) + verticalScale(14) },
                            ]}
                        >
                            <View style={styles.videoGlassDock}>
                                <VideoControlButton
                                    onPress={toggleMute}
                                    active={isMuted}
                                    icon={
                                        isMuted
                                            ? <Icons.MicrophoneSlash size={22} color={colors.white} weight="fill" />
                                            : <Icons.Microphone size={22} color={colors.white} weight="fill" />
                                    }
                                    label={isMuted ? 'Unmute' : 'Mute'}
                                    activeColor="rgba(239,68,68,0.85)"
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
                                    activeColor="rgba(239,68,68,0.85)"
                                />
                                <VideoControlButton
                                    onPress={switchCamera}
                                    icon={<Icons.CameraRotate size={22} color={colors.white} weight="fill" />}
                                    label="Flip"
                                />
                                <VideoControlButton
                                    onPress={toggleSpeaker}
                                    active={isSpeakerOn}
                                    icon={<Icons.SpeakerHigh size={22} color={isSpeakerOn ? colors.neutral900 : colors.white} weight="fill" />}
                                    label="Speaker"
                                    activeColor={colors.primary}
                                />

                                {/* End Call */}
                                <View style={controlStyles.wrap}>
                                    <TouchableOpacity
                                        style={styles.endCallBtn}
                                        onPress={handleCallEnd}
                                        activeOpacity={0.85}
                                    >
                                        <Icons.PhoneSlash size={verticalScale(24)} color={colors.white} weight="fill" />
                                    </TouchableOpacity>
                                    <Typo size={11} color={'rgba(255,255,255,0.75)'} fontWeight="600">End</Typo>
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
            colors={['#18181b', '#09090b', '#18181b']}
            style={styles.voiceContainer}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Animated.View
                entering={FadeIn.duration(500)}
                style={[
                    styles.voiceContent,
                    {
                        paddingTop: Math.max(insets.top, 20) + verticalScale(16),
                        paddingBottom: Math.max(insets.bottom, 20) + verticalScale(16),
                    },
                ]}
            >

                {/* ── Top section: Type badge, name, live status ── */}
                <View style={styles.voiceTopSection}>
                    <View style={styles.callTypeHeaderBadge}>
                        <Icons.PhoneCall size={14} color={colors.primary} weight="fill" />
                        <Typo size={12} color={colors.primary} fontWeight="700" style={{ letterSpacing: 0.5 }}>
                            BUBBLY HD AUDIO
                        </Typo>
                    </View>

                    <Typo
                        size={isCompactHeight ? 24 : 28}
                        fontWeight="800"
                        color={colors.white}
                        style={{ marginTop: spacingY._12, textAlign: 'center', maxWidth: '95%' }}
                        textProps={{ numberOfLines: 2, ellipsizeMode: 'tail' }}
                    >
                        {remoteUserName}
                    </Typo>

                    <View style={styles.liveDurationBadge}>
                        {callState === 'connected' ? (
                            <View style={styles.liveDot} />
                        ) : (
                            <View style={styles.pulsingDot} />
                        )}
                        <Typo size={14} color={callState === 'connected' ? colors.primary : 'rgba(255,255,255,0.65)'} fontWeight="600">
                            {getStatusText()}
                        </Typo>
                    </View>
                </View>

                {/* ── Center Avatar with Multi-Layer Acoustic Rings ── */}
                <View style={styles.voiceAvatarSection}>
                    {isConnecting && <AcousticRings size={scale(154)} />}
                    <View style={[
                        styles.voiceAvatarBorder,
                        callState === 'connected' && styles.voiceAvatarBorderConnected
                    ]}>
                        <Avatar size={scale(134)} uri={remoteUserAvatar as string} />
                    </View>
                </View>

                {/* ── Security / Encryption Badge ── */}
                <View style={styles.encryptedCard}>
                    <Icons.LockKey size={13} color={colors.primary} weight="fill" />
                    <Typo size={11} color={'rgba(255,255,255,0.65)'} fontWeight="600" style={{ marginLeft: 6 }}>
                        End-to-End Encrypted HD Call
                    </Typo>
                </View>

                {/* ── Floating Controls Dock ── */}
                <View style={styles.voiceDockCard}>
                    <View style={styles.voiceControlsRow}>
                        <VoiceControlButton
                            onPress={toggleMute}
                            active={isMuted}
                            icon={
                                isMuted
                                    ? <Icons.MicrophoneSlash size={24} color={colors.white} weight="fill" />
                                    : <Icons.Microphone size={24} color={colors.white} weight="fill" />
                            }
                            label={isMuted ? 'Unmute' : 'Mute'}
                            activeColor="rgba(239,68,68,0.85)"
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
                        />
                    </View>

                    {/* Prominent End Call Button */}
                    <View style={styles.endCallRow}>
                        <TouchableOpacity
                            style={styles.endCallBtnLarge}
                            onPress={handleCallEnd}
                            activeOpacity={0.85}
                        >
                            <Icons.PhoneSlash size={verticalScale(28)} color={colors.white} weight="fill" />
                        </TouchableOpacity>
                        <Typo size={12} color={'rgba(255,255,255,0.7)'} fontWeight="600">
                            End Call
                        </Typo>
                    </View>
                </View>
            </Animated.View>
        </LinearGradient>
    );
};

// ── Video Control Button ──
const VideoControlButton = ({
    onPress, icon, label, active = false, activeColor = 'rgba(255,255,255,0.3)',
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
        <Typo size={11} color={'rgba(255,255,255,0.75)'} fontWeight="600">{label}</Typo>
    </View>
);

// ── Voice Control Button ──
const VoiceControlButton = ({
    onPress, icon, label, active = false, activeColor,
}: {
    onPress: () => void;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    activeColor?: string;
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
        <Typo size={12} color={'rgba(255,255,255,0.7)'} fontWeight="600">{label}</Typo>
    </View>
);

const controlStyles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        gap: spacingY._7,
    },
    videoBtn: {
        width: verticalScale(54),
        height: verticalScale(54),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    voiceBtn: {
        width: verticalScale(64),
        height: verticalScale(64),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1.5,
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
        width: scale(136),
        height: scale(136),
        alignItems: 'center',
        justifyContent: 'center',
    },
    waitingAvatarBorder: {
        borderRadius: radius.full,
        borderWidth: 3,
        borderColor: colors.primary,
        overflow: 'hidden',
        padding: 3,
    },
    connectingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        backgroundColor: 'rgba(245,158,11,0.15)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._7,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.3)',
        marginTop: spacingY._7,
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    localVideoWrap: {
        position: 'absolute',
        top: verticalScale(Platform.OS === 'ios' ? 110 : 80),
        right: spacingX._15,
        width: scale(100),
        height: verticalScale(146),
        borderRadius: radius._15,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 10,
    },
    localVideo: { flex: 1 },
    flipPreviewBtn: {
        position: 'absolute',
        bottom: spacingY._7,
        right: spacingX._7,
        width: scale(28),
        height: scale(28),
        borderRadius: radius.full,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    videoTopGradient: {
        paddingTop: verticalScale(Platform.OS === 'ios' ? 60 : 42),
        paddingHorizontal: spacingX._20,
        paddingBottom: spacingY._30,
    },
    videoTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    videoTopLeft: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._12,
        marginRight: spacingX._10,
    },
    videoHeaderAvatarWrap: {
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.primary,
        padding: 2,
    },
    videoStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    connectedDot: {
        width: scale(7),
        height: scale(7),
        borderRadius: radius.full,
        backgroundColor: '#22c55e',
    },
    hdBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._5,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    videoBottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: spacingY._30,
        paddingHorizontal: spacingX._12,
    },
    videoGlassDock: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(24,24,27,0.85)',
        borderRadius: radius._24,
        paddingVertical: spacingY._12,
        paddingHorizontal: spacingX._12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    endCallBtn: {
        width: verticalScale(54),
        height: verticalScale(54),
        borderRadius: radius.full,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 8,
    },

    // ── Voice ──
    voiceContainer: {
        flex: 1,
    },
    voiceContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: verticalScale(Platform.OS === 'ios' ? 70 : 50),
        paddingBottom: verticalScale(45),
        paddingHorizontal: spacingX._25,
    },
    voiceTopSection: {
        alignItems: 'center',
    },
    callTypeHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(245,158,11,0.12)',
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._6,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.25)',
    },
    liveDurationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._6,
        borderRadius: radius.full,
        marginTop: spacingY._10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    voiceAvatarSection: {
        marginVertical: verticalScale(30),
        width: scale(154),
        height: scale(154),
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceAvatarBorder: {
        borderRadius: radius.full,
        borderWidth: 3,
        borderColor: 'rgba(245,158,11,0.3)',
        overflow: 'hidden',
        padding: 4,
    },
    voiceAvatarBorderConnected: {
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
        elevation: 12,
    },
    encryptedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._7,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: spacingY._15,
    },
    voiceDockCard: {
        width: '100%',
        backgroundColor: 'rgba(39,39,42,0.65)',
        borderRadius: radius._30,
        paddingVertical: spacingY._20,
        paddingHorizontal: spacingX._20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        gap: spacingY._20,
    },
    voiceControlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacingX._40,
    },
    endCallRow: {
        alignItems: 'center',
        gap: spacingY._7,
    },
    endCallBtnLarge: {
        width: verticalScale(68),
        height: verticalScale(68),
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
