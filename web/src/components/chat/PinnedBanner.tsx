import React from "react";
import { Pin, X } from "lucide-react";

interface PinnedBannerProps {
  pinnedMessages?: {
    id: string;
    content: string;
    type: string;
    sender?: { id: string; name: string; avatar?: string | null } | null;
  }[];
  onScrollToMessage: (id: string) => void;
  onUnpin: (id: string) => void;
}

export const PinnedBanner: React.FC<PinnedBannerProps> = ({
  pinnedMessages,
  onScrollToMessage,
  onUnpin,
}) => {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const latest = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="h-10 px-4 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 backdrop-blur-md flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200 select-none z-10 animate-slide-up">
      <div
        onClick={() => onScrollToMessage(latest.id)}
        className="flex items-center gap-2 truncate cursor-pointer hover:underline flex-1"
      >
        <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="font-bold shrink-0">{latest.sender?.name || "Pinned"}:</span>
        <span className="truncate opacity-90">{latest.content || "Attachment"}</span>
      </div>

      <button
        onClick={() => onUnpin(latest.id)}
        className="p-1 hover:bg-amber-500/20 rounded-full transition ml-2 text-stone-500 dark:text-zinc-400"
        title="Unpin"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
