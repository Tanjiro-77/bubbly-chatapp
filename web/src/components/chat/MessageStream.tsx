import React, { useRef, useEffect, useState, useMemo } from "react";
import { MessageProps } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { format, isToday, isYesterday } from "date-fns";
import { ChevronDown, MessageSquareDashed } from "lucide-react";

interface MessageStreamProps {
  messages: MessageProps[];
  currentUserId: string;
  isGroup: boolean;
  searchQuery?: string;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: MessageProps) => void;
  onStar: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onForward: (message: MessageProps) => void;
  onEdit: (message: MessageProps) => void;
  onDelete: (messageId: string) => void;
  onVotePoll: (messageId: string, optionId: string) => void;
  onClosePoll?: (messageId: string) => void;
  onOpenImage: (url: string) => void;
  onOpenViewOnce: (messageId: string) => void;
}

export const MessageStream: React.FC<MessageStreamProps> = ({
  messages,
  currentUserId,
  isGroup,
  searchQuery = "",
  onReact,
  onReply,
  onStar,
  onPin,
  onForward,
  onEdit,
  onDelete,
  onVotePoll,
  onClosePoll,
  onOpenImage,
  onOpenViewOnce,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = (smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceToBottom > 180);
  };

  const handleJumpToReply = (replyId: string) => {
    const el = document.getElementById(`msg-${replyId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-500", "rounded-3xl");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-500", "rounded-3xl");
      }, 2000);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col bg-[#fafaf9] dark:bg-[#121214] bubbly-pattern-bg">
      {/* Subtle tint overlay allowing wallpaper pattern to show nicely */}
      <div className="absolute inset-0 bg-[#fafaf9]/85 dark:bg-[#121214]/90 pointer-events-none" />

      {/* Scrollable message stream - Optimized for low-end & high-end PCs */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-1 hardware-accelerated"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 dark:text-zinc-500 select-none">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
              <MessageSquareDashed className="w-8 h-8" />
            </div>
            <p className="font-extrabold text-sm text-stone-800 dark:text-zinc-200">
              No messages here yet
            </p>
            <p className="text-xs max-w-xs mt-1 text-stone-500 dark:text-zinc-400 font-medium">
              Send a message, photo, or voice note to begin chatting on Bubbly!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe =
              msg.sender?.id === currentUserId ||
              msg.sender?._id === currentUserId ||
              (msg as any).senderId === currentUserId;

            // Date separator
            const currentDate = msg.createdAt ? format(new Date(msg.createdAt), "yyyy-MM-dd") : "";
            const prevDate =
              index > 0 && messages[index - 1].createdAt
                ? format(new Date(messages[index - 1].createdAt), "yyyy-MM-dd")
                : "";
            const showDateHeader = currentDate !== prevDate;

            return (
              <React.Fragment key={msg.id || msg._id || index}>
                {showDateHeader && (
                  <div className="flex justify-center my-3 select-none">
                    <span className="px-3.5 py-1 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-black/5 dark:border-white/10 text-[10px] font-black text-stone-600 dark:text-zinc-400 uppercase tracking-wider shadow-xs">
                      {getDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div className="msg-item-optimized">
                  <MessageBubble
                    message={msg}
                    isMe={isMe}
                    showSenderName={isGroup}
                    currentUserId={currentUserId}
                    searchQuery={searchQuery}
                    onReact={onReact}
                    onReply={onReply}
                    onStar={onStar}
                    onPin={onPin}
                    onForward={onForward}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVotePoll={onVotePoll}
                    onClosePoll={onClosePoll}
                    onOpenImage={onOpenImage}
                    onOpenViewOnce={onOpenViewOnce}
                    onJumpToReply={handleJumpToReply}
                  />
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-6 p-3 rounded-full bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 shadow-xl border border-black/10 dark:border-white/10 hover:bg-amber-50 dark:hover:bg-zinc-700 transition transform hover:scale-110 active:scale-95 animate-scale-in z-20"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 text-amber-500" />
        </button>
      )}
    </div>
  );
};
