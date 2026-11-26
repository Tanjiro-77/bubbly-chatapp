import React from "react";
import { ConversationProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { format, isToday, isYesterday } from "date-fns";
import {
  Pin,
  BellOff,
  CheckCheck,
  Phone,
  Video,
  Image as ImageIcon,
  Mic,
  FileText,
  MoreVertical,
} from "lucide-react";

interface ConversationItemProps {
  conversation: ConversationProps;
  isActive: boolean;
  currentUserId: string;
  isOnline?: boolean;
  typingUser?: string | null;
  draftText?: string | null;
  searchQuery?: string;
  onSelect: (conv: ConversationProps) => void;
  onOpenActions?: () => void;
}

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matched text highlighter matching mobile HighlightText
const HighlightText: React.FC<{
  text: string;
  query?: string;
  className?: string;
}> = ({ text, query = "", className = "" }) => {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }
  const trimmed = query.trim();
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <span
            key={i}
            className="bg-[#fef3c7] dark:bg-amber-500/30 text-[#1c1917] dark:text-amber-200 font-extrabold px-0.5 rounded"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  isOnline = false,
  typingUser,
  draftText,
  searchQuery = "",
  onSelect,
  onOpenActions,
}) => {
  const isGroup = conversation.type === "group";

  // Partner or Group Name
  const partner = !isGroup
    ? conversation.participants?.find((p) => p._id !== currentUserId)
    : null;

  const displayName = isGroup ? conversation.name || "Group Chat" : partner?.name || "User";
  const avatarSrc = isGroup ? conversation.avatar : partner?.avatar;

  const lastMsg = conversation.lastMessage;
  const isLastMsgMe =
    !!lastMsg &&
    (lastMsg.senderId === currentUserId ||
      (lastMsg as any).sender?.id === currentUserId ||
      (lastMsg as any).sender?._id === currentUserId);

  const formatLastTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const isPinned = !!conversation.isPinned;
  const unreadCount = conversation.unreadCount || 0;
  const hasUnread = unreadCount > 0;

  const renderSnippet = () => {
    if (typingUser) {
      return (
        <span className="text-[#22c55e] font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
          {isGroup ? `${typingUser} is typing...` : "typing..."}
        </span>
      );
    }
    if (draftText && !hasUnread) {
      return (
        <span className="text-[#ef4444] font-semibold truncate">
          Draft: <span className="text-stone-600 dark:text-stone-300 font-normal">{draftText}</span>
        </span>
      );
    }
    if (!lastMsg) {
      return <span className="italic text-stone-400">Tap to start chatting 👋</span>;
    }

    if (lastMsg.type === "image") {
      return (
        <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
          <ImageIcon className="w-3.5 h-3.5 text-[#d97706]" /> Photo
        </span>
      );
    }
    if (lastMsg.type === "video") {
      return (
        <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
          <Video className="w-3.5 h-3.5 text-[#d97706]" /> Video
        </span>
      );
    }
    if (lastMsg.type === "voice") {
      return (
        <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
          <Mic className="w-3.5 h-3.5 text-[#d97706]" /> Voice note
        </span>
      );
    }
    if (lastMsg.type === "file") {
      return (
        <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
          <FileText className="w-3.5 h-3.5 text-[#0284c7]" /> Document
        </span>
      );
    }
    if (lastMsg.type === "call") {
      return (
        <span className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
          <Phone className="w-3.5 h-3.5 text-[#22c55e]" /> Call
        </span>
      );
    }

    return (
      <HighlightText
        text={lastMsg.content || "Message"}
        query={searchQuery}
        className={hasUnread ? "font-semibold text-stone-900 dark:text-white" : "text-stone-500 dark:text-stone-400"}
      />
    );
  };

  return (
    <div
      onClick={() => onSelect(conversation)}
      className={`px-4 sm:px-5 py-3 cursor-pointer transition flex items-center gap-3.5 select-none relative group border-b border-stone-100 dark:border-stone-800/40 ${
        isActive
          ? "bg-[#fef3c7]/60 dark:bg-amber-500/10 border-l-4 border-l-[#f59e0b]"
          : hasUnread
          ? "bg-amber-50/40 dark:bg-stone-800/30 hover:bg-amber-50/70"
          : "hover:bg-[#fafaf9] dark:hover:bg-stone-800/40"
      }`}
    >
      {/* ── Avatar with Live Online Indicator (52px matching mobile) ── */}
      <div className="relative shrink-0">
        <Avatar
          uri={avatarSrc}
          size={50}
          isGroup={isGroup}
        />
        {!isGroup && isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white dark:border-[#121214] shadow-xs" />
        )}
      </div>

      {/* ── Content Body ── */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Top Row: Name + Pinned + Time */}
        <div className="flex items-center justify-between mb-1">
          <HighlightText
            text={displayName}
            query={searchQuery}
            className={`text-[15px] truncate max-w-[190px] leading-snug ${
              hasUnread || isActive
                ? "font-extrabold text-stone-900 dark:text-white"
                : "font-bold text-stone-800 dark:text-stone-200"
            }`}
          />

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {conversation.isMuted && (
              <BellOff className="w-3.5 h-3.5 text-stone-400" />
            )}
            {isPinned && (
              <div className="p-0.5 rounded bg-[#fef3c7] dark:bg-amber-500/20 text-[#d97706]">
                <Pin className="w-3 h-3 fill-current" />
              </div>
            )}
            <span
              className={`text-[11px] font-semibold ${
                hasUnread
                  ? "text-[#d97706] font-bold"
                  : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {formatLastTime(lastMsg?.createdAt || conversation.updatedAt)}
            </span>
          </div>
        </div>

        {/* Bottom Row: Delivery tick + snippet + unread badge */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5 truncate pr-2">
            {isLastMsgMe && lastMsg && (
              <CheckCheck
                className={`w-4 h-4 shrink-0 stroke-[2.5] ${
                  hasUnread
                    ? "text-stone-400"
                    : "text-[#0284c7]" // Sky blue read receipt matching mobile
                }`}
              />
            )}
            <span className="truncate text-xs leading-relaxed">
              {renderSnippet()}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasUnread && (
              <span className="min-w-[19px] h-[19px] px-1.5 rounded-full bg-[#ef4444] text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}

            {/* Quick 3-dot context menu trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenActions?.();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-stone-400 transition"
              title="Chat Options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
