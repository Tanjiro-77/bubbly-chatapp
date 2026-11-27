import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, StatusBar, Platform, useWindowDimensions, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubblyAlert } from '../../components/BubblyAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    createAgoraRtcEngine,
    IRtcEngine,
    IRtcEngineEventHandler,
    ChannelProfileType,
    ClientRoleType,
    AudioProfileType,
    AudioScenarioType,
    ConnectionStateType,
    ConnectionChangedReasonType,
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
import { endCallHttp, getAgoraToken, getCallStatus, rejectCallHttp } from '../../services/callService';
import { clearDeliveredCallNotifications } from '../../services/notificationService';
import { releaseCallAudioSession, startOutgoingRingback, stopOutgoingRingback } from '../../services/soundService';
import { hapticTap } from '../../utils/haptics';
import { connectSocket } from '../../socket/socket';
import {
    callCancel,
    callEnd,
    callReject,
    callConnected,
    isSocketConnected,
    onCallAccepted,
    onCallEnded,
    onCallConnected,
    onSocketConnectionChange,
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

    const hasExitedRef = useRef(false);

    const safeBack = useCallback(() => {
        if (hasExitedRef.current) return;
        hasExitedRef.current = true;
        try {
            if (router.canGoBack()) router.back();
            else router.replace("/(main)/home");
        } catch {}
    }, [router]);

    const engineRef = useRef<IRtcEngine | null>(null);
    const eventHandlerRef = useRef<IRtcEngineEventHandler | null>(null);
    const hasCleanedUp = useRef(false);
    const hasSignaledEndRef = useRef(false);
    const hasStartedAgoraRef = useRef(false);
    const isStartingAgoraRef = useRef(false);
    const isRenewingTokenRef = useRef(false);
    const isRemoteJoinedRef = useRef(false);
    const isSpeakerOnRef = useRef(true);
    const callStateRef = useRef<CallState>(isOutgoingCall ? 'ringing' : 'connecting');
    const credentialsRef = useRef<{ token: string; appId: string; channelName: string; uid: number } | null>(null);
    const permissionsRef = useRef<{ granted: boolean; videoAllowed: boolean } | null>(null);

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
    const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        isSpeakerOnRef.current = isSpeakerOn;
    }, [isSpeakerOn]);

    const signalCallTermination = useCallback(() => {
        if (hasSignaledEndRef.current || !callIdStr) return;
        hasSignaledEndRef.current = true;
        if (isOutgoingCall && callStateRef.current === 'ringing') {
            callCancel(callIdStr);
            endCallHttp(callIdStr).catch(() => {});
        } else {
            callEnd(callIdStr);
            endCallHttp(callIdStr).catch(() => {});
        }
    }, [callIdStr, isOutgoingCall]);

    const renewChannelToken = useCallback(async (engine: IRtcEngine, currentCallId: string, channelName: string): Promise<boolean> => {
        if (isRenewingTokenRef.current || hasCleanedUp.current) return false;
        isRenewingTokenRef.current = true;
        try {
            const newTokenRes = await getAgoraToken(currentCallId, channelName);
            if (hasCleanedUp.current || !engineRef.current) return false;
            if (newTokenRes.success && newTokenRes.data?.token) {
                await Promise.resolve(engine.renewToken(newTokenRes.data.token));
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            isRenewingTokenRef.current = false;
        }
    }, []);

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
        void releaseCallAudioSession();
        stopDurationTimer();
        if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
            controlsTimerRef.current = null;
        }
        if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
        }
        if (engineRef.current) {
            if (eventHandlerRef.current) {
                try { engineRef.current.unregisterEventHandler(eventHandlerRef.current); } catch {}
                eventHandlerRef.current = null;
            }
            try { engineRef.current.stopPreview(); } catch {}
            try { engineRef.current.leaveChannel(); } catch {}
            try { engineRef.current.release(true); } catch {}
            engineRef.current = null;
        }
    };

    const handleCallEnd = () => {
        if (hasCleanedUp.current) return;
        hapticTap("boom");
        signalCallTermination();
        cleanup();
        safeBack();
    };

    const startAgoraSession = useCallback(async () => {
        const currentCallId = callIdStr;
        const creds = credentialsRef.current;
        const perms = permissionsRef.current;
        if (
            !currentCallId ||
            !creds ||
            !perms?.granted ||
            hasCleanedUp.current ||
            hasStartedAgoraRef.current ||
            isStartingAgoraRef.current ||
            callStateRef.current === 'ringing' ||
            callStateRef.current === 'ended'
        ) {
            return;
        }

        isStartingAgoraRef.current = true;
        try {
            // Release expo-audio ringback focus cleanly so Android AudioManager gives Agora full communication audio
            await releaseCallAudioSession();
            if (hasCleanedUp.current) return;

            if (typeof createAgoraRtcEngine !== "function") {
                throw new Error("AGORA_NATIVE_UNAVAILABLE");
            }

            const engine = createAgoraRtcEngine();
            if (!engine) {
                throw new Error("AGORA_NATIVE_UNAVAILABLE");
            }
            if (hasCleanedUp.current) {
                try { engine.release(true); } catch {}
                return;
            }
            engineRef.current = engine;

            engine.initialize({
                appId: creds.appId,
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
                audioScenario: AudioScenarioType.AudioScenarioChatroom,
            });

            engine.setAudioProfile(
                AudioProfileType.AudioProfileSpeechStandard,
                AudioScenarioType.AudioScenarioChatroom
            );

            const handler: IRtcEngineEventHandler = {
                onLocalVideoStateChanged: (_connection, state, error) => {
                    if (hasCleanedUp.current) return;
                    if (error === 0 && state === 2) setLocalVideoReady(true);
                    if (state === 0) setLocalVideoReady(false);
                },
                onJoinChannelSuccess: () => {
                    if (hasCleanedUp.current || !engineRef.current) return;
                    try { engine.setEnableSpeakerphone(isSpeakerOnRef.current); } catch {}
                    setCallState((prev) => (prev === "connected" ? "connected" : "connecting"));
                },
                onUserJoined: (_connection, rUid) => {
                    if (hasCleanedUp.current || !engineRef.current) return;
                    isRemoteJoinedRef.current = true;
                    hapticTap("success");
                    setRemoteUid(rUid);
                    setCallState("connected");
                    callConnected(currentCallId);
                    try { engine.setEnableSpeakerphone(isSpeakerOnRef.current); } catch {}
                    startDurationTimer();
                },
                onUserOffline: () => {
                    if (hasCleanedUp.current) return;
                    setRemoteUid(null);
                    handleCallEnd();
                },
                onError: (err) => {
                    console.error("Agora error code:", err);
                    if (!hasCleanedUp.current && (err === 109 || err === 110)) {
                        void renewChannelToken(engine, currentCallId, creds.channelName);
                    }
                },
                onRequestToken: () => {
                    if (!hasCleanedUp.current) {
                        void renewChannelToken(engine, currentCallId, creds.channelName);
                    }
                },
                onTokenPrivilegeWillExpire: () => {
                    if (!hasCleanedUp.current) {
                        void renewChannelToken(engine, currentCallId, creds.channelName);
                    }
                },
                onConnectionStateChanged: async (_connection, state, reason) => {
                    if (state !== ConnectionStateType.ConnectionStateFailed || hasCleanedUp.current) return;
                    if (
                        reason === ConnectionChangedReasonType.ConnectionChangedTokenExpired ||
                        reason === ConnectionChangedReasonType.ConnectionChangedInvalidToken
                    ) {
                        const renewed = await renewChannelToken(engine, currentCallId, creds.channelName);
                        if (renewed || hasCleanedUp.current) return;
                    }
                    signalCallTermination();
                    cleanup();
                    BubblyAlert.alert("Call Failed", "Could not connect the voice/video media stream.");
                    safeBack();
                },
            };

            eventHandlerRef.current = handler;
            engine.registerEventHandler(handler);

            engine.enableAudio?.();
            engine.enableLocalAudio(true);
            if (perms.videoAllowed) {
                engine.enableVideo();
                engine.enableLocalVideo(true);
                engine.startPreview();
            }

            engine.setDefaultAudioRouteToSpeakerphone(isSpeakerOnRef.current);

            const joinOptions = {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                publishCameraTrack: perms.videoAllowed,
                autoSubscribeVideo: isVideo,
            };

            let joinCode = await Promise.resolve(
                engine.joinChannel(creds.token, creds.channelName, creds.uid, joinOptions)
            );
            if (joinCode === -17 && !hasCleanedUp.current) {
                try { engine.leaveChannel(); } catch {}
                await new Promise((r) => setTimeout(r, 250));
                if (!hasCleanedUp.current) {
                    joinCode = await Promise.resolve(
                        engine.joinChannel(creds.token, creds.channelName, creds.uid, joinOptions)
                    );
                }
            }
            if (typeof joinCode === "number" && joinCode < 0 && joinCode !== -17) {
                throw new Error(`Could not join call channel (${joinCode})`);
            }

            if (hasCleanedUp.current) {
                try {
                    engine.unregisterEventHandler(handler);
                    engine.stopPreview();
                    engine.leaveChannel();
                    engine.release(true);
                } catch {}
                engineRef.current = null;
                eventHandlerRef.current = null;
                return;
            }

            hasStartedAgoraRef.current = true;
            setIsSpeakerOn(isSpeakerOnRef.current);
        } catch (error: any) {
            if (hasCleanedUp.current) return;
            console.error("startAgoraSession error:", error);
            const msg = String(error?.message || "");
            const isNativeMissing = msg.includes("AGORA_NATIVE_UNAVAILABLE") || msg.includes("AgoraRtc") || msg.includes("null");
            signalCallTermination();
            cleanup();
            BubblyAlert.alert(
                "Call Unavailable",
                isNativeMissing
                    ? "Native voice & video SDK is unavailable in Expo Go. Please run the Bubbly Android/iOS APK or Dev Build."
                    : (msg || "Could not initialize the call")
            );
            safeBack();
        } finally {
            isStartingAgoraRef.current = false;
        }
    }, [callIdStr, isVideo, renewChannelToken, safeBack, signalCallTermination]);

    const prepareCallSession = useCallback(async () => {
        try {
            const currentCallId = callIdStr;
            if (!currentCallId) throw new Error("Missing callId");

            const { AudioModule } = require("expo-audio");
            const micPerm = await AudioModule.requestRecordingPermissionsAsync();
            if (hasCleanedUp.current) return;
            if (!micPerm?.granted) {
                hasSignaledEndRef.current = true;
                if (isOutgoingCall) {
                    callCancel(currentCallId);
                    endCallHttp(currentCallId).catch(() => {});
                } else {
                    callReject(currentCallId);
                    rejectCallHttp(currentCallId).catch(() => {});
                }
                cleanup();
                BubblyAlert.alert("Microphone Permission", "Microphone access is required for calls.");
                safeBack();
                return;
            }

            let videoAllowed = isVideo;
            if (isVideo) {
                const ImagePicker = require("expo-image-picker");
                const camPerm = await ImagePicker.requestCameraPermissionsAsync();
                if (hasCleanedUp.current) return;
                if (!camPerm?.granted) {
                    videoAllowed = false;
                    setIsVideoOff(true);
                    BubblyAlert.alert("Camera Permission", "Camera denied — continuing call with voice audio.");
                }
            }
            permissionsRef.current = { granted: true, videoAllowed };

            const tokenRes = await getAgoraToken(currentCallId, currentCallId);
            if (hasCleanedUp.current) return;
            if (!tokenRes.success || !tokenRes.data) {
                console.error("Agora token error:", tokenRes.msg);
                signalCallTermination();
                cleanup();
                BubblyAlert.alert("Call Error", tokenRes.msg || "Could not get Agora token");
                safeBack();
                return;
            }

            const { token, appId, channelName, uid } = tokenRes.data;
            if (!token || !appId || !channelName || typeof uid !== "number") {
                console.error("Invalid Agora response:", tokenRes.data);
                signalCallTermination();
                cleanup();
                BubblyAlert.alert("Call Error", "Invalid Agora configuration received from server");
                safeBack();
                return;
            }

            credentialsRef.current = { token, appId, channelName, uid };
            void startAgoraSession();
        } catch (error: any) {
            if (hasCleanedUp.current) return;
            signalCallTermination();
            cleanup();
            BubblyAlert.alert("Call Error", String(error?.message || "Could not prepare call session"));
            safeBack();
        }
    }, [callIdStr, isOutgoingCall, isVideo, safeBack, signalCallTermination, startAgoraSession]);

    useEffect(() => {
        if (isOutgoingCall && callState === 'ringing') {
            startOutgoingRingback().catch(() => {});
        } else {
            stopOutgoingRingback();
        }
        if (callState === 'connecting' || callState === 'connected') {
            void startAgoraSession();
        }
        return () => {
            stopOutgoingRingback();
        };
    }, [callState, isOutgoingCall, startAgoraSession]);

    useEffect(() => {
        if (!callIdStr || (callState !== 'ringing' && callState !== 'connecting')) return;
        statusPollRef.current = setInterval(async () => {
            if (hasCleanedUp.current) return;
            const res = await getCallStatus(callIdStr);
            const serverStatus = res?.data?.status;
            if (!serverStatus || hasCleanedUp.current) return;

            if (serverStatus === 'connecting' && callStateRef.current === 'ringing') {
                setCallState('connecting');
            } else if (serverStatus === 'connected' && callStateRef.current !== 'connected') {
                setCallState('connected');
                startDurationTimer();
            } else if (['ended', 'missed', 'rejected', 'failed', 'cancelled'].includes(serverStatus)) {
                hasSignaledEndRef.current = true;
                setCallState('ended');
                cleanup();
                safeBack();
            }
        }, 1800);

        return () => {
            if (statusPollRef.current) {
                clearInterval(statusPollRef.current);
                statusPollRef.current = null;
            }
        };
    }, [callIdStr, callState, safeBack]);

    useEffect(() => {
        if (!isSocketConnected()) {
            connectSocket().catch(() => {});
        }
        if (callIdStr) {
            clearDeliveredCallNotifications(callIdStr).catch(() => {});
        }
        void prepareCallSession();
        onCallAccepted(handleRemoteAccepted);
        onCallEnded(handleRemoteCallEnded);
        onCallConnected(handleRemoteConnected);

        const unsubConn = onSocketConnectionChange((connected) => {
            if (connected && !hasCleanedUp.current && isRemoteJoinedRef.current && callIdStr) {
                callConnected(callIdStr);
            }
        });

        const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleCallEnd();
            return true;
        });

        return () => {
            backSub.remove();
            unsubConn();
            onCallAccepted(handleRemoteAccepted, true);
            onCallEnded(handleRemoteCallEnded, true);
            onCallConnected(handleRemoteConnected, true);
            if (!hasCleanedUp.current && callIdStr) {
                signalCallTermination();
            }
            cleanup();
        };
    }, []);

    const handleRemoteAccepted = useCallback((data: { callId: string }) => {
        if (String(data?.callId) !== callIdStr) return;
        hapticTap("heavy");
        setCallState((prev) => (prev === "ringing" ? "connecting" : prev));
    }, [callIdStr]);

    const handleRemoteCallEnded = useCallback((data: {
        callId: string;
        reason: string;
    }) => {
        if (String(data?.callId) !== callIdStr) return;
        if (hasCleanedUp.current) return;

        hasSignaledEndRef.current = true;
        hapticTap("warning");
        setCallState("ended");
        cleanup();
        safeBack();
    }, [callIdStr, safeBack]);

    const handleRemoteConnected = useCallback((data: { callId: string }) => {
        if (String(data?.callId) !== callIdStr) return;
        hapticTap("celebration");
        setCallState('connected');
        startDurationTimer();
    }, [callIdStr]);

    const toggleMute = () => {
        hapticTap("heavy");
        const next = !isMuted;
        try { engineRef.current?.muteLocalAudioStream(next); } catch {}
        setIsMuted(next);
    };

    const toggleVideo = () => {
        hapticTap("heavy");
        const next = !isVideoOff;
        try { engineRef.current?.muteLocalVideoStream(next); } catch {}
        if (next) setLocalVideoReady(false);
        setIsVideoOff(next);
    };

    const toggleSpeaker = () => {
        hapticTap("medium");
        const next = !isSpeakerOn;
        try { engineRef.current?.setEnableSpeakerphone(next); } catch {}
        setIsSpeakerOn(next);
    };

    const switchCamera = () => {
        hapticTap("medium");
        try { engineRef.current?.switchCamera(); } catch {}
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
                {remoteUid !== null && RtcSurfaceView ? (
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
                {!isVideoOff && localVideoReady && RtcSurfaceView && (
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
