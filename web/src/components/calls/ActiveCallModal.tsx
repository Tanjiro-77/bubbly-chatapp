import React, { useEffect, useRef } from "react";
import { ActiveCallProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface ActiveCallModalProps {
  activeCall: ActiveCallProps;
  isRinging: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  activeCall,
  isRinging,
  isMuted,
  isVideoOff,
  callDuration,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isVideo = activeCall.kind === "video";

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col justify-between p-6 select-none animate-fade-in">
      {/* Top Bar: Remote user info & Duration */}
      <div className="flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-3">
          <Avatar
            src={activeCall.remoteUser.avatar}
            name={activeCall.remoteUser.name}
            size="md"
          />
          <div>
            <h3 className="font-extrabold text-base leading-tight">
              {activeCall.remoteUser.name}
            </h3>
            <span className="text-xs text-white/70 font-semibold">
              {isRinging ? "Ringing..." : formatDuration(callDuration)}
            </span>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-amber-400">
          {activeCall.kind} Call
        </span>
      </div>

      {/* Main Stage */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-zinc-900 border border-white/10">
        {isVideo ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Remote Video Stream */}
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-white">
                <Avatar
                  src={activeCall.remoteUser.avatar}
                  name={activeCall.remoteUser.name}
                  size="2xl"
                />
                <span className="text-sm font-semibold opacity-75">
                  {isRinging ? "Waiting for answer..." : "Connecting video..."}
                </span>
              </div>
            )}

            {/* Local Video Stream PIP */}
            <div className="absolute bottom-4 right-4 w-32 h-44 rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-2xl z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          // Audio Call Pulsing Center
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <span className="absolute -inset-4 rounded-full bg-amber-500/20 animate-ping" />
              <span className="absolute -inset-8 rounded-full bg-amber-500/10 animate-pulse" />
              <Avatar
                src={activeCall.remoteUser.avatar}
                name={activeCall.remoteUser.name}
                size="2xl"
              />
            </div>
            <span className="text-amber-400 font-bold text-sm tracking-wide">
              {isRinging ? "Calling..." : "Audio Connected"}
            </span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-6 z-20">
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full transition shadow-lg ${
            isMuted ? "bg-rose-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {isVideo && (
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition shadow-lg ${
              isVideoOff ? "bg-rose-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"
            }`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="p-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/40 transition transform hover:scale-110 active:scale-95"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
