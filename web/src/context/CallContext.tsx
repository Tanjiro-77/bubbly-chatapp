import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { IncomingCallProps, ActiveCallProps, CallKind } from "../types";
import {
  callInvite as emitCallInvite,
  callAccept as emitCallAccept,
  callReject as emitCallReject,
  callCancel as emitCallCancel,
  callConnected as emitCallConnected,
  callEnd as emitCallEnd,
  callSignal as emitCallSignal,
  onCallIncoming,
  onCallRinging,
  onCallAccepted,
  onCallRejected,
  onCallConnected,
  onCallEnded,
  onCallFailed,
  onCallSignal,
} from "../socket/socketEvents";
import { soundManager } from "../hooks/useSoundEffects";
import { bubblyAlert } from "../components/common/BubblyDialog";

interface CallContextType {
  incomingCall: IncomingCallProps | null;
  activeCall: ActiveCallProps | null;
  isRinging: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (conversationId: string, calleeId: string, remoteUser: { id: string; name: string; avatar: string | null }, kind: CallKind) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallProps | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallProps | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const ringtoneStopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<ActiveCallProps | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const cancelledPendingRingingRef = useRef(false);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    // Socket Call Listeners
    const handleIncoming = (data: IncomingCallProps) => {
      if (activeCallRef.current) return;
      setIncomingCall(data);
      if (ringtoneStopRef.current) ringtoneStopRef.current();
      ringtoneStopRef.current = soundManager.startRingtone();
    };

    const handleRinging = (data: { callId?: string; channelName?: string }) => {
      if (cancelledPendingRingingRef.current) {
        cancelledPendingRingingRef.current = false;
        if (data?.callId) emitCallCancel(data.callId);
        return;
      }
      if (!activeCallRef.current) return;
      setIsRinging(true);
      if (data?.callId) {
        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                callId: data.callId!,
                channelName: data.channelName || data.callId || prev.channelName,
              }
            : prev
        );
      }
    };

    const handleAccepted = async (data: { callId: string; channelName?: string }) => {
      const current = activeCallRef.current;
      if (!current) return;
      setIsRinging(false);
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              callId: data.callId || prev.callId,
              channelName: data.channelName || prev.channelName || data.callId,
            }
          : prev
      );
      if (current?.isOutgoing) {
        try {
          await initWebRTC(current.remoteUser.id, data.callId, current.kind, true);
          emitCallConnected(data.callId);
        } catch (err) {
          console.error("Failed to initialize outgoing WebRTC:", err);
          bubblyAlert("Media Access Required", "Could not access microphone/camera for call.", {
            variant: "danger",
          });
          emitCallEnd(data.callId);
          cleanupCallState();
        }
      } else {
        emitCallConnected(data.callId);
      }
    };

    const handleConnected = (data: { callId: string }) => {
      if (!activeCallRef.current) return;
      setIsRinging(false);
      startDurationTimer();
    };

    const handleEnded = () => {
      cleanupCallState();
    };

    const handleFailed = (data: any) => {
      bubblyAlert("Call Failed", data?.msg || "Call failed", { variant: "danger" });
      cleanupCallState();
    };

    const flushPendingCandidates = async (pc: RTCPeerConnection) => {
      const queued = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Queued ICE candidate error:", err);
        }
      }
    };

    const handleSignal = async (data: { callId: string; fromUserId: string; payload: any }) => {
      const pc = peerConnectionRef.current;
      if (!pc || !data?.payload) return;
      try {
        if (data.payload.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
          await flushPendingCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emitCallSignal({
            callId: data.callId,
            targetUserId: data.fromUserId,
            payload: answer,
          });
        } else if (data.payload.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
          await flushPendingCandidates(pc);
        } else if (data.payload.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
          } else {
            pendingCandidatesRef.current.push(data.payload.candidate);
          }
        }
      } catch (err) {
        console.error("WebRTC signal error:", err);
      }
    };

    onCallIncoming(handleIncoming);
    onCallRinging(handleRinging);
    onCallAccepted(handleAccepted);
    onCallRejected(handleEnded);
    onCallConnected(handleConnected);
    onCallEnded(handleEnded);
    onCallFailed(handleFailed);
    onCallSignal(handleSignal);

    return () => {
      onCallIncoming(handleIncoming, true);
      onCallRinging(handleRinging, true);
      onCallAccepted(handleAccepted, true);
      onCallRejected(handleEnded, true);
      onCallConnected(handleConnected, true);
      onCallEnded(handleEnded, true);
      onCallFailed(handleFailed, true);
      onCallSignal(handleSignal, true);
      cleanupCallState();
    };
  }, []);

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const cleanupCallState = () => {
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    activeCallRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setActiveCall(null);
    setIsRinging(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  };

  const initWebRTC = async (targetUserId: string, callId: string, kind: CallKind, isCaller: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video",
    });

    // If the call was cancelled/ended while awaiting media permission, release tracks immediately
    if (!activeCallRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitCallSignal({
          callId,
          targetUserId,
          payload: { candidate: event.candidate },
        });
      }
    };

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emitCallSignal({
        callId,
        targetUserId,
        payload: offer,
      });
    }
  };

  const startCall = async (
    conversationId: string,
    calleeId: string,
    remoteUser: { id: string; name: string; avatar: string | null },
    kind: CallKind
  ) => {
    cancelledPendingRingingRef.current = false;
    setIsRinging(true);
    const nextCall: ActiveCallProps = {
      callId: "",
      channelName: "",
      kind,
      remoteUser,
      isOutgoing: true,
    };
    activeCallRef.current = nextCall;
    setActiveCall(nextCall);
    emitCallInvite({ conversationId, calleeId, kind });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
    const nextCall: ActiveCallProps = {
      callId: call.callId,
      channelName: (call as any).channelName || call.callId,
      kind: call.kind,
      remoteUser: call.caller,
      isOutgoing: false,
    };
    activeCallRef.current = nextCall;
    setActiveCall(nextCall);
    setIncomingCall(null);
    try {
      await initWebRTC(call.caller.id, call.callId, call.kind, false);
      emitCallAccept(call.callId);
    } catch (err) {
      console.error("Failed to acquire media for incoming call:", err);
      bubblyAlert("Permission Required", "Microphone/camera access is required to answer the call.", {
        variant: "danger",
      });
      emitCallReject(call.callId);
      cleanupCallState();
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      emitCallReject(incomingCall.callId);
      cleanupCallState();
    }
  };

  const cancelCall = () => {
    if (activeCall?.callId) {
      emitCallCancel(activeCall.callId);
    } else if (activeCallRef.current?.isOutgoing) {
      cancelledPendingRingingRef.current = true;
    }
    cleanupCallState();
  };

  const endCall = () => {
    if (activeCall?.callId) {
      emitCallEnd(activeCall.callId);
    }
    cleanupCallState();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        isRinging,
        isMuted,
        isVideoOff,
        callDuration,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
};
