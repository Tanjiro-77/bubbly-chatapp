import React, { useState } from "react";
import { MessageProps, ReactionProps } from "../../types";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Smile,
  Reply,
  Star,
  Pin,
  Share2,
  Trash2,
  Edit2,
  Languages,
  Phone,
  Video,
  FileText,
  Download,
  Eye,
  MapPin,
  Lock,
} from "lucide-react";
import { VoicePlayer } from "./VoicePlayer";
import { PollComponent } from "./PollComponent";
import { translateMessage } from "../../services/chatService";
import { formatFileSize } from "../../services/mediaService";

interface MessageBubbleProps {
  message: MessageProps;
  isMe: boolean;
  showSenderName?: boolean;
  currentUserId: string;
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
  onJumpToReply?: (replyId: string) => void;
}

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  showSenderName = false,
  currentUserId,
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
  onJumpToReply,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const messageId = message.id || message._id || "";
  const timeFormatted = message.createdAt ? format(new Date(message.createdAt), "h:mm a") : "";

  const handleTranslate = async () => {
    if (translatedText) {
      setTranslatedText(null);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await translateMessage(message.content, "en");
      if (res.success && res.data?.translatedText) {
        setTranslatedText(res.data.translatedText);
      } else {
        alert(res.msg || "Could not translate");
      }
    } catch {
      alert("Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  // View once state check
  const isViewOnce = message.isViewOnce;
  const isViewOnceOpened = isViewOnce && message.viewOnceOpenedBy?.includes(currentUserId);

  return (
    <div
      id={`msg-${messageId}`}
      className={`group relative flex flex-col mb-1.5 transition-all ${
        isMe ? "items-end" : "items-start"
      }`}
    >
      {/* Sender Name in Group Chat */}
      {showSenderName && !isMe && (
        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 ml-3 mb-0.5">
          {message.sender?.name || "Participant"}
        </span>
      )}

      {/* Bubble Container */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Hover Action Bar */}
        <div
          className={`absolute -top-4 z-20 hidden group-hover:flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md shadow-lg border border-black/10 dark:border-white/10 text-stone-600 dark:text-zinc-300 ${
            isMe ? "right-2" : "left-2"
          }`}
        >
          {/* Quick Reaction buttons */}
          <div className="flex items-center gap-1 border-r border-black/10 dark:border-white/10 pr-1.5 mr-1">
            {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(messageId, emoji)}
                className="hover:scale-125 transition text-xs transform active:scale-95"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="p-1 hover:text-amber-500 rounded-full transition"
              title="Add reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onReply(message)}
            className="p-1 hover:text-amber-500 rounded-full transition"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onStar(messageId)}
            className={`p-1 hover:text-amber-500 rounded-full transition ${
              message.isSaved ? "text-amber-500 fill-amber-500" : ""
            }`}
            title="Star message"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPin(messageId)}
            className={`p-1 hover:text-amber-500 rounded-full transition ${
              message.isPinned ? "text-amber-500" : ""
            }`}
            title="Pin message"
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onForward(message)}
            className="p-1 hover:text-amber-500 rounded-full transition"
            title="Forward"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {message.content && message.type === "text" && (
            <button
              onClick={handleTranslate}
              className="p-1 hover:text-amber-500 rounded-full transition"
              title="Translate"
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
          )}

          {isMe && (
            <>
              {message.type === "text" && (
                <button
                  onClick={() => onEdit(message)}
                  className="p-1 hover:text-amber-500 rounded-full transition"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onDelete(messageId)}
                className="p-1 hover:text-rose-500 text-stone-400 rounded-full transition"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Reaction Picker Dropdown */}
        {showPicker && (
          <div
            className={`absolute -top-12 z-30 flex items-center gap-1.5 p-2 rounded-2xl bg-white dark:bg-zinc-800 shadow-2xl border border-black/10 dark:border-white/10 animate-scale-in ${
              isMe ? "right-0" : "left-0"
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(messageId, emoji);
                  setShowPicker(false);
                }}
                className="text-lg hover:scale-130 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bubble Body */}
        <div
          className={`relative px-4 py-2.5 rounded-3xl shadow-sm text-sm transition-all duration-150 ${
            isMe
              ? "glass-bubble-my text-stone-900 dark:text-amber-100 rounded-tr-xs"
              : "glass-bubble-other text-stone-900 dark:text-zinc-100 rounded-tl-xs"
          } ${message.isPinned ? "ring-2 ring-amber-400/60" : ""}`}
        >
          {/* Reply Context Banner */}
          {message.replyTo && (
            <div
              onClick={() => onJumpToReply && onJumpToReply(message.replyTo!.id)}
              className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-white/10 border-l-4 border-amber-500 cursor-pointer hover:opacity-90 transition text-xs"
            >
              <span className="font-bold text-amber-700 dark:text-amber-400 block truncate">
                {message.replyTo.senderName}
              </span>
              <p className="text-stone-600 dark:text-zinc-300 truncate">
                {message.replyTo.content || "Attachment"}
              </p>
            </div>
          )}

          {/* Forwarded Header */}
          {message.isForwarded && (
            <span className="flex items-center gap-1 text-[10px] font-semibold italic text-stone-500 dark:text-zinc-400 mb-1">
              <Share2 className="w-3 h-3" /> Forwarded
            </span>
          )}

          {/* VIEW ONCE MEDIA */}
          {isViewOnce ? (
            <div className="py-2">
              {isViewOnceOpened ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-zinc-400 italic">
                  <Eye className="w-4 h-4" /> Opened View Once media
                </div>
              ) : (
                <button
                  onClick={() => onOpenViewOnce(messageId)}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition transform active:scale-95"
                >
                  <Lock className="w-4 h-4" /> View Once (Click to open)
                </button>
              )}
            </div>
          ) : (
            <>
              {/* IMAGE TYPE */}
              {message.type === "image" && message.attachement && (
                <div className="rounded-2xl overflow-hidden mb-1.5 max-h-80 cursor-pointer group/img relative">
                  <img
                    src={message.attachement}
                    alt="Photo"
                    onClick={() => onOpenImage(message.attachement!)}
                    className="w-full h-full object-cover rounded-2xl hover:scale-102 transition duration-200"
                  />
                </div>
              )}

              {/* VIDEO TYPE */}
              {message.type === "video" && message.attachement && (
                <div className="rounded-2xl overflow-hidden mb-1.5 max-h-80">
                  <video
                    src={message.attachement}
                    controls
                    className="w-full h-full object-cover rounded-2xl"
                  />
                </div>
              )}

              {/* VOICE TYPE */}
              {message.type === "voice" && (message.voiceUrl || message.attachement) && (
                <VoicePlayer
                  url={message.voiceUrl || message.attachement!}
                  duration={message.voiceDuration}
                  isMe={isMe}
                />
              )}

              {/* FILE / DOCUMENT TYPE */}
              {message.type === "file" && message.attachement && (
                <a
                  href={message.attachement}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={message.attachmentMeta?.name || "document"}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 hover:bg-black/10 transition my-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-bold text-xs truncate block text-stone-900 dark:text-white">
                      {message.attachmentMeta?.name || "Shared Document"}
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-medium">
                      {message.attachmentMeta?.size
                        ? formatFileSize(message.attachmentMeta.size)
                        : "Download"}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
                </a>
              )}

              {/* LOCATION TYPE */}
              {message.type === "location" && message.location && (
                <a
                  href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 my-1 font-semibold text-xs hover:underline"
                >
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span>
                    Location: {message.location.label || `${message.location.latitude.toFixed(4)}, ${message.location.longitude.toFixed(4)}`}
                  </span>
                </a>
              )}

              {/* POLL TYPE */}
              {message.type === "poll" && message.poll && (
                <PollComponent
                  poll={message.poll}
                  messageId={messageId}
                  isMe={isMe}
                  onVote={onVotePoll}
                />
              )}

              {/* CALL LOG TYPE */}
              {message.type === "call" && message.callMeta && (
                <div className="flex items-center gap-2.5 py-1 text-xs font-semibold text-stone-700 dark:text-zinc-300">
                  <div
                    className={`p-2 rounded-xl ${
                      message.callMeta.status === "missed"
                        ? "bg-rose-500/15 text-rose-600"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {message.callMeta.kind === "video" ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="capitalize block">
                      {message.callMeta.status} {message.callMeta.kind} call
                    </span>
                    {message.callMeta.duration > 0 && (
                      <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-normal">
                        Duration: {Math.floor(message.callMeta.duration / 60)}m{" "}
                        {message.callMeta.duration % 60}s
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* TEXT CONTENT */}
              {message.content && (
                <p className="whitespace-pre-wrap break-words leading-relaxed select-text font-normal">
                  {message.content}
                </p>
              )}

              {/* INLINE TRANSLATION */}
              {translatedText && (
                <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs italic text-stone-700 dark:text-amber-200 bg-amber-500/5 p-2 rounded-xl">
                  <span className="font-bold text-[10px] uppercase text-amber-600 block mb-0.5">
                    Translation:
                  </span>
                  {translatedText}
                </div>
              )}
            </>
          )}

          {/* Footer Info (Time, Edited, Starred, Pin, Checkmark) */}
          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75 font-medium select-none">
            {message.isSaved && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
            {message.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
            {message.isEdited && <span className="italic">edited</span>}
            <span>{timeFormatted}</span>
            {isMe && (
              <span title="Delivered">
                <CheckCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </span>
            )}
          </div>
        </div>

        {/* Floating Reactions Bar below bubble */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex flex-wrap items-center gap-1 mt-1 ${
              isMe ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(
              message.reactions.reduce((acc: Record<string, number>, r: ReactionProps) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => {
              const hasReacted = message.reactions.some(
                (r) => r.emoji === emoji && r.userId === currentUserId
              );
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(messageId, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm transition border ${
                    hasReacted
                      ? "bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200"
                      : "bg-white dark:bg-zinc-800 border-black/10 dark:border-white/10 text-stone-700 dark:text-zinc-300"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px] opacity-80">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
