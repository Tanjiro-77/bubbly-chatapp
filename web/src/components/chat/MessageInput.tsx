import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Square,
  Trash2,
  X,
  Image as ImageIcon,
  FileText,
  BarChart2,
  Lock,
} from "lucide-react";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { uploadMediaToCloudinary } from "../../services/mediaService";
import { MessageProps, SelectedFileProps } from "../../types";

interface MessageInputProps {
  conversationId: string;
  onSendMessage: (payload: {
    content: string;
    type?: string;
    attachment?: string;
    attachmentMeta?: any;
    replyTo?: any;
    isViewOnce?: boolean;
    voiceUrl?: string;
    voiceDuration?: number;
  }) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  replyingTo: MessageProps | null;
  onCancelReply: () => void;
  editingMessage: MessageProps | null;
  onCancelEdit: () => void;
  onOpenPollModal: () => void;
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "🙃", "😉",
  "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓",
  "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫",
  "😩", "🥺", "😢", "😭", "😮‍💨", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨",
  "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞",
  "✨", "🎉", "🔥", "🚀", "💡", "💯", "🎈", "🎁", "☕️", "🍕", "🍔", "🍻", "🥂", "🏆", "🌟"
];

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  onSendMessage,
  onEditMessage,
  onTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onOpenPollModal,
}) => {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Populate text if editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing debounce
    onTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      setShowAttachMenu(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (editingMessage && onEditMessage) {
      if (!text.trim()) return;
      onEditMessage(editingMessage.id || (editingMessage as any)._id, text.trim());
      setText("");
      onCancelEdit();
      return;
    }

    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadRes = await uploadMediaToCloudinary(selectedFile, selectedFile.name);
        if (uploadRes.success && uploadRes.data) {
          const type = selectedFile.type.startsWith("image/")
            ? "image"
            : selectedFile.type.startsWith("video/")
            ? "video"
            : "file";

          onSendMessage({
            content: text.trim(),
            type,
            attachment: uploadRes.data.url,
            attachmentMeta: uploadRes.data,
            replyTo: replyingTo
              ? {
                  id: replyingTo.id || (replyingTo as any)._id,
                  content: replyingTo.content,
                  senderName: replyingTo.sender?.name || "User",
                }
              : undefined,
            isViewOnce,
          });

          setText("");
          clearSelectedFile();
          setIsViewOnce(false);
          if (replyingTo) onCancelReply();
        } else {
          alert("File upload failed");
        }
      } catch (e) {
        alert("Upload error");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (!text.trim()) return;

    onSendMessage({
      content: text.trim(),
      type: "text",
      replyTo: replyingTo
        ? {
            id: replyingTo.id || (replyingTo as any)._id,
            content: replyingTo.content,
            senderName: replyingTo.sender?.name || "User",
          }
        : undefined,
    });

    setText("");
    if (replyingTo) onCancelReply();
    onStopTyping();
  };

  const handleSendVoice = async () => {
    try {
      const blob = await stopRecording();
      if (!blob) return;

      setIsUploading(true);
      const res = await uploadMediaToCloudinary(blob, "voice-note.webm", "voice-notes");
      if (res.success && res.data) {
        onSendMessage({
          content: "",
          type: "voice",
          voiceUrl: res.data.url,
          voiceDuration: recordingTime,
          attachment: res.data.url,
          replyTo: replyingTo
            ? {
                id: replyingTo.id || (replyingTo as any)._id,
                content: replyingTo.content,
                senderName: replyingTo.sender?.name || "User",
              }
            : undefined,
        });
        if (replyingTo) onCancelReply();
      } else {
        alert("Failed to upload voice recording");
      }
    } catch {
      alert("Error sending voice message");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative border-t border-stone-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-3 sm:p-4 select-none">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 animate-slide-up">
          <div className="truncate pr-4 text-xs">
            <span className="font-bold text-amber-700 dark:text-amber-400 block truncate">
              Replying to {replyingTo.sender?.name || "User"}
            </span>
            <span className="text-stone-600 dark:text-zinc-300 truncate block">
              {replyingTo.content || "Attachment"}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      )}

      {/* Edit Mode Bar */}
      {editingMessage && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-2xl bg-blue-500/10 border-l-4 border-blue-500 animate-slide-up">
          <span className="font-bold text-xs text-blue-700 dark:text-blue-400">
            Editing message
          </span>
          <button
            onClick={onCancelEdit}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-3 mb-2 rounded-2xl bg-amber-50 dark:bg-zinc-800/90 border border-amber-200 dark:border-amber-900/40 animate-slide-up">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 truncate">
            <span className="text-xs font-bold block truncate text-stone-900 dark:text-white">
              {selectedFile.name}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-zinc-400">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsViewOnce(!isViewOnce)}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                isViewOnce
                  ? "bg-amber-500 text-white"
                  : "bg-black/5 dark:bg-white/10 text-stone-600 dark:text-zinc-300"
              }`}
              title="View Once"
            >
              <Lock className="w-3.5 h-3.5" /> 1
            </button>
            <button
              onClick={clearSelectedFile}
              className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojis && (
        <div className="absolute bottom-20 left-4 z-40 w-72 sm:w-80 h-64 p-3 rounded-3xl bg-white dark:bg-zinc-800 shadow-2xl border border-black/10 dark:border-white/10 overflow-y-auto grid grid-cols-8 gap-1 animate-scale-in">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((prev) => prev + emoji);
              }}
              className="text-xl p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition transform hover:scale-120"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Attachments Menu Popup */}
      {showAttachMenu && (
        <div className="absolute bottom-20 left-12 z-40 w-48 p-2 rounded-2xl bg-white dark:bg-zinc-800 shadow-2xl border border-black/10 dark:border-white/10 space-y-1 animate-scale-in">
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*,video/*";
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-3 p-2 hover:bg-amber-50 dark:hover:bg-zinc-700/60 rounded-xl text-xs font-semibold text-stone-700 dark:text-zinc-200 transition"
          >
            <ImageIcon className="w-4 h-4 text-amber-500" /> Photo or Video
          </button>
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "*/*";
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-3 p-2 hover:bg-amber-50 dark:hover:bg-zinc-700/60 rounded-xl text-xs font-semibold text-stone-700 dark:text-zinc-200 transition"
          >
            <FileText className="w-4 h-4 text-sky-500" /> Document
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              onOpenPollModal();
            }}
            className="w-full flex items-center gap-3 p-2 hover:bg-amber-50 dark:hover:bg-zinc-700/60 rounded-xl text-xs font-semibold text-stone-700 dark:text-zinc-200 transition"
          >
            <BarChart2 className="w-4 h-4 text-emerald-500" /> Create Poll
          </button>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2">
        {isRecording ? (
          // Recording view
          <div className="flex-1 flex items-center justify-between p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Recording audio... {Math.floor(recordingTime / 60)}:
                {recordingTime % 60 < 10 ? "0" : ""}
                {recordingTime % 60}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="p-1.5 text-stone-500 hover:text-rose-600 transition"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleSendVoice}
                className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition shadow-md"
                title="Send Voice Note"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Action buttons (Emoji, Attach) */}
            <div className="flex items-center gap-1 mb-1">
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className={`p-2.5 rounded-2xl transition ${
                  showEmojis
                    ? "bg-amber-100 text-amber-600 dark:bg-zinc-800 dark:text-amber-400"
                    : "text-stone-500 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={`p-2.5 rounded-2xl transition ${
                  showAttachMenu
                    ? "bg-amber-100 text-amber-600 dark:bg-zinc-800 dark:text-amber-400"
                    : "text-stone-500 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                title="Attach file or poll"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            {/* Expanding Textarea */}
            <div className="flex-1 relative bg-stone-100 dark:bg-zinc-800/90 rounded-2xl border border-stone-200/80 dark:border-white/5 focus-within:ring-2 focus-within:ring-amber-500/50 transition">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type a message..."
                className="w-full py-3 px-4 bg-transparent resize-none max-h-32 focus:outline-none text-sm text-stone-900 dark:text-white placeholder:text-stone-400 font-medium"
              />
            </div>

            {/* Mic or Send button */}
            {text.trim() || selectedFile ? (
              <button
                onClick={handleSend}
                disabled={isUploading}
                className="p-3 mb-1 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/30 transition transform active:scale-95 disabled:opacity-50"
                title="Send"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-3 mb-1 rounded-2xl bg-stone-100 hover:bg-amber-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-300 hover:text-amber-600 transition transform active:scale-95"
                title="Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
