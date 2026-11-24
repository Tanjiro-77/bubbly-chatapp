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
  onCallConnected,
  onCallEnded,
  onCallFailed,
  onCallSignal,
} from "../socket/socketEvents";
import { soundManager } from "../hooks/useSoundEffects";
import { getAgoraToken } from "../services/callService";

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

  useEffect(() => {
    // Socket Call Listeners
    const handleIncoming = (data: IncomingCallProps) => {
      setIncomingCall(data);
      if (ringtoneStopRef.current) ringtoneStopRef.current();
      ringtoneStopRef.current = soundManager.startRingtone();
    };

    const handleRinging = (data: any) => {
      setIsRinging(true);
    };

    const handleAccepted = async (data: { callId: string; channelName: string }) => {
      setIsRinging(false);
      emitCallConnected(data.callId);
    };

    const handleConnected = (data: { callId: string }) => {
      setIsRinging(false);
      startDurationTimer();
    };

    const handleEnded = (data: any) => {
      cleanupCallState();
    };

    const handleFailed = (data: any) => {
      alert(data.msg || "Call failed");
      cleanupCallState();
    };

    const handleSignal = async (data: { callId: string; fromUserId: string; payload: any }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        if (data.payload.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emitCallSignal({
            callId: data.callId,
            targetUserId: data.fromUserId,
            payload: answer,
          });
        } else if (data.payload.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
        } else if (data.payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
        }
      } catch (err) {
        console.error("WebRTC signal error:", err);
      }
    };

    onCallIncoming(handleIncoming);
    onCallRinging(handleRinging);
    onCallAccepted(handleAccepted);
    onCallConnected(handleConnected);
    onCallEnded(handleEnded);
    onCallFailed(handleFailed);
    onCallSignal(handleSignal);

    return () => {
      onCallIncoming(handleIncoming, true);
      onCallRinging(handleRinging, true);
      onCallAccepted(handleAccepted, true);
      onCallConnected(handleConnected, true);
      onCallEnded(handleEnded, true);
      onCallFailed(handleFailed, true);
      onCallSignal(handleSignal, true);
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
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "video",
      });
      setLocalStream(stream);

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
    } catch (e) {
      console.warn("Could not acquire media devices:", e);
    }
  };

  const startCall = async (
    conversationId: string,
    calleeId: string,
    remoteUser: { id: string; name: string; avatar: string | null },
    kind: CallKind
  ) => {
    setIsRinging(true);
    setActiveCall({
      callId: "",
      channelName: "",
      kind,
      remoteUser,
      isOutgoing: true,
    });
    emitCallInvite({ conversationId, calleeId, kind });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
    setActiveCall({
      callId: incomingCall.callId,
      channelName: incomingCall.conversationId,
      kind: incomingCall.kind,
      remoteUser: incomingCall.caller,
      isOutgoing: false,
    });
    emitCallAccept(incomingCall.callId);
    setIncomingCall(null);
    await initWebRTC(incomingCall.caller.id, incomingCall.callId, incomingCall.kind, false);
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
