import React from "react";
import { PollProps } from "../../types";
import { Check, Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface PollComponentProps {
  poll: PollProps;
  messageId: string;
  isMe: boolean;
  onVote: (messageId: string, optionId: string) => void;
  onClose?: (messageId: string) => void;
}

export const PollComponent: React.FC<PollComponentProps> = ({
  poll,
  messageId,
  isMe,
  onVote,
  onClose,
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);

  return (
    <div className="w-full min-w-[260px] max-w-sm rounded-2xl p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 my-1">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm text-stone-900 dark:text-white leading-tight">
          {poll.question}
        </h4>
        {poll.isClosed && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-300 dark:bg-zinc-700 text-stone-700 dark:text-zinc-300 shrink-0">
            <Lock className="w-2.5 h-2.5" /> Closed
          </span>
        )}
      </div>

      <p className="text-[11px] text-stone-500 dark:text-zinc-400 mb-2.5 font-medium">
        {poll.allowMultiple ? "Select one or more" : "Select one option"} • {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const voteCount = opt.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = opt.votes?.some((v) => v.userId === currentUserId);

          return (
            <button
              key={opt.id}
              disabled={poll.isClosed}
              onClick={() => onVote(messageId, opt.id)}
              className={`w-full relative overflow-hidden rounded-xl p-2.5 text-left border transition text-xs font-semibold ${
                hasVoted
                  ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  : "border-stone-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 text-stone-800 dark:text-zinc-200 hover:border-amber-400"
              }`}
            >
              {/* Progress bar fill */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-300 pointer-events-none ${
                  hasVoted ? "bg-amber-500/25 dark:bg-amber-500/30" : "bg-stone-200/60 dark:bg-zinc-700/60"
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative flex items-center justify-between z-10">
                <div className="flex items-center gap-2 truncate pr-2">
                  <div
                    className={`w-4 h-4 rounded-${poll.allowMultiple ? "md" : "full"} border flex items-center justify-center shrink-0 ${
                      hasVoted
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-stone-400 dark:border-zinc-500"
                    }`}
                  >
                    {hasVoted && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{opt.text}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold">
                  <span>{percentage}%</span>
                  <span className="opacity-60 text-[10px]">({voteCount})</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {isMe && !poll.isClosed && onClose && (
        <button
          onClick={() => onClose(messageId)}
          className="mt-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline block ml-auto"
        >
          Close Poll
        </button>
      )}
    </div>
  );
};
