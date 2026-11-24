import React, { useRef, useEffect, useState } from "react";
import { MessageProps } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { format, isToday, isYesterday } from "date-fns";
import { ChevronDown, MessageSquareDashed } from "lucide-react";

interface MessageStreamProps {
  messages: MessageProps[];
  currentUserId: string;
  isGroup: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: MessageProps) => void;
  onStar: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onForward: (message: MessageProps) => void;
  onEdit: (message: MessageProps) => void;
  onDelete: (messageId: string) => void;
  onVotePoll: (messageId: string, optionId: string) => void;
  onOpenImage: (url: string) => void;
  onOpenViewOnce: (messageId: string) => void;
}

export const MessageStream: React.FC<MessageStreamProps> = ({
  messages,
  currentUserId,
  isGroup,
  onReact,
  onReply,
  onStar,
  onPin,
  onForward,
  onEdit,
  onDelete,
  onVotePoll,
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
    setShowScrollBottom(distanceToBottom > 200);
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
    <div className="relative flex-1 overflow-hidden flex flex-col bg-[#fafaf9]/40 dark:bg-[#121214]/40">
      {/* Scrollable message container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 dark:text-zinc-500 select-none">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
              <MessageSquareDashed className="w-8 h-8" />
            </div>
            <p className="font-bold text-sm text-stone-700 dark:text-zinc-300">
              No messages here yet
            </p>
            <p className="text-xs max-w-xs mt-1">
              Send a greeting or voice note to break the ice and start connecting!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe =
              msg.sender?.id === currentUserId ||
              msg.sender?._id === currentUserId ||
              (msg as any).senderId === currentUserId;

            // Date separator check
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
                    <span className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider shadow-xs">
                      {getDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}

                <MessageBubble
                  message={msg}
                  isMe={isMe}
                  showSenderName={isGroup}
                  currentUserId={currentUserId}
                  onReact={onReact}
                  onReply={onReply}
                  onStar={onStar}
                  onPin={onPin}
                  onForward={onForward}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onVotePoll={onVotePoll}
                  onOpenImage={onOpenImage}
                  onOpenViewOnce={onOpenViewOnce}
                  onJumpToReply={handleJumpToReply}
                />
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
