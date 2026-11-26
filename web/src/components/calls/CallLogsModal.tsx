import React, { useState, useEffect } from "react";
import { getCallHistory } from "../../services/callService";
import { Avatar } from "../common/Avatar";
import { X, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface CallLogsModalProps {
  currentUserId?: string;
  onClose: () => void;
  onInitiateCall: (targetUserId: string, targetName: string, avatar: string | null, kind: "voice" | "video") => void;
}

export const CallLogsModal: React.FC<CallLogsModalProps> = ({ currentUserId, onClose, onInitiateCall }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCallHistory()
      .then((res) => {
        if (active && res.success && Array.isArray(res.data)) {
          setLogs(res.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              Call History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* List of Calls */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              Loading call logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              No recent calls found
            </div>
          ) : (
            logs.map((call) => {
              const isMissed = call.status === "missed";
              const isVideo = call.kind === "video";
              const callerObj =
                call.caller || (typeof call.callerId === "object" ? call.callerId : null);
              const calleeObj =
                call.callee || (typeof call.calleeId === "object" ? call.calleeId : null);
              const callerIdStr = callerObj?.id || callerObj?._id || (typeof call.callerId === "string" ? call.callerId : "");
              const isOutgoing = !!currentUserId && callerIdStr === currentUserId;
              const partner =
                (isOutgoing ? calleeObj : callerObj) ||
                calleeObj ||
                callerObj ||
                { name: "User", avatar: null };
              const partnerId = partner?.id || partner?._id;

              return (
                <div
                  key={call._id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-stone-50 dark:hover:bg-zinc-800/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={partner.avatar} name={partner.name} size="md" />
                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-white leading-tight">
                        {partner.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                        {isMissed ? (
                          <span className="flex items-center gap-1 text-rose-500 font-semibold">
                            <PhoneMissed className="w-3.5 h-3.5" /> Missed
                          </span>
                        ) : isOutgoing ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <PhoneOutgoing className="w-3.5 h-3.5" /> {call.kind}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <PhoneIncoming className="w-3.5 h-3.5" /> {call.kind}
                          </span>
                        )}
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-400 dark:text-zinc-500">
                          {call.createdAt
                            ? formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Call Back Button */}
                  <button
                    disabled={!partnerId}
                    onClick={() => {
                      if (!partnerId) return;
                      onInitiateCall(partnerId, partner.name, partner.avatar, call.kind);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 transition disabled:opacity-40"
                    title={`Call back (${call.kind})`}
                  >
                    {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
