import React from "react";
import { ConversationProps } from "../../types";
import { Avatar } from "../common/Avatar";
import { format, isToday, isYesterday } from "date-fns";
import { Pin, BellOff, Check, CheckCheck, Phone, Video, Image as ImageIcon, Mic, FileText } from "lucide-react";

interface ConversationItemProps {
  conversation: ConversationProps;
  isActive: boolean;
  currentUserId: string;
  isOnline?: boolean;
  typingUser?: string | null;
  draftText?: string | null;
  onSelect: (conv: ConversationProps) => void;
  onContextMenu?: (e: React.MouseEvent, conv: ConversationProps) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  currentUserId,
  isOnline = false,
  typingUser,
  draftText,
  onSelect,
  onContextMenu,
}) => {
  const isGroup = conversation.type === "group";

  // Identify recipient
  const partner = !isGroup
    ? conversation.participants?.find((p) => p._id !== currentUserId)
    : null;

  const title = isGroup ? conversation.name || "Group Chat" : partner?.name || "User";
  const avatarSrc = isGroup ? conversation.avatar : partner?.avatar;

  const lastMsg = conversation.lastMessage;
  const isLastMsgMe = lastMsg && lastMsg.senderId === currentUserId;

  const formatLastTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const renderSnippet = () => {
    if (typingUser) {
      return (
        <span className="text-amber-600 dark:text-amber-400 font-bold animate-pulse">
          typing...
        </span>
      );
    }
    if (draftText) {
      return (
        <span className="text-rose-500 font-semibold truncate">
          Draft: {draftText}
        </span>
      );
    }
    if (!lastMsg) {
      return <span className="italic opacity-60">Tap to start chatting</span>;
    }

    if (lastMsg.type === "image") {
      return (
        <span className="flex items-center gap-1 font-medium">
          <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Photo
        </span>
      );
    }
    if (lastMsg.type === "video") {
      return (
        <span className="flex items-center gap-1 font-medium">
          <Video className="w-3.5 h-3.5 text-amber-500" /> Video
        </span>
      );
    }
    if (lastMsg.type === "voice") {
      return (
        <span className="flex items-center gap-1 font-medium">
          <Mic className="w-3.5 h-3.5 text-amber-500" /> Voice message
        </span>
      );
    }
    if (lastMsg.type === "file") {
      return (
        <span className="flex items-center gap-1 font-medium">
          <FileText className="w-3.5 h-3.5 text-sky-500" /> Document
        </span>
      );
    }
    if (lastMsg.type === "call") {
      return (
        <span className="flex items-center gap-1 font-medium">
          <Phone className="w-3.5 h-3.5 text-emerald-500" /> Call
        </span>
      );
    }

    return <span>{lastMsg.content || "Message"}</span>;
  };

  const isPinned = conversation.pinnedMessages && conversation.pinnedMessages.length > 0;

  return (
    <div
      onClick={() => onSelect(conversation)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, conversation);
        }
      }}
      className={`px-3 py-3 rounded-2xl cursor-pointer transition flex items-center gap-3 select-none mb-1 group ${
        isActive
          ? "bg-amber-500/15 dark:bg-amber-500/20 shadow-xs border border-amber-500/30"
          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
      }`}
    >
      {/* Avatar */}
      <Avatar
        src={avatarSrc}
        name={title}
        size="md"
        isGroup={isGroup}
        isOnline={isOnline}
      />

      {/* Content */}
      <div className="flex-1 truncate">
        {/* Name and Time */}
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-bold text-sm text-stone-900 dark:text-white truncate">
            {title}
          </h3>
          <span className="text-[10px] font-medium text-stone-400 dark:text-zinc-500 shrink-0 ml-2">
            {formatLastTime(lastMsg?.createdAt || conversation.updatedAt)}
          </span>
        </div>

        {/* Snippet and Badges */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
          <div className="flex items-center gap-1 truncate pr-2">
            {isLastMsgMe && lastMsg && (
              <CheckCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="truncate">{renderSnippet()}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.isMuted && <BellOff className="w-3.5 h-3.5 text-stone-400" />}
            {isPinned && <Pin className="w-3 h-3 text-amber-500" />}
            {conversation.unreadCount && conversation.unreadCount > 0 ? (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
