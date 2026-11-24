import React from "react";
import { IncomingCallProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { Phone, Video, PhoneOff } from "lucide-react";

interface IncomingCallModalProps {
  incomingCall: IncomingCallProps;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-sm bg-white/95 dark:bg-zinc-900/95 rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col items-center text-center">
        {/* Pulsing Avatar */}
        <div className="relative mb-5">
          <span className="absolute -inset-3 rounded-full bg-amber-500/20 animate-ping" />
          <span className="absolute -inset-6 rounded-full bg-amber-500/10 animate-pulse" />
          <Avatar
            src={incomingCall.caller.avatar}
            name={incomingCall.caller.name}
            size="xl"
          />
        </div>

        <h3 className="text-xl font-extrabold text-stone-900 dark:text-white mb-1">
          {incomingCall.caller.name}
        </h3>

        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 mb-8">
          {incomingCall.kind === "video" ? (
            <Video className="w-4 h-4" />
          ) : (
            <Phone className="w-4 h-4" />
          )}
          <span>Incoming {incomingCall.kind} call...</span>
        </div>

        {/* Action Buttons: Accept & Decline */}
        <div className="flex items-center justify-center gap-8 w-full">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition transform hover:scale-110 active:scale-95"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
              Decline
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform hover:scale-110 active:scale-95 animate-bounce"
              title="Accept"
            >
              {incomingCall.kind === "video" ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </button>
            <span className="text-xs font-bold text-stone-500 dark:text-zinc-400">
              Accept
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
