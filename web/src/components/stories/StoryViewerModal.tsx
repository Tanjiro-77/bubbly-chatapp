import React, { useState, useEffect, useRef } from "react";
import { StoryGroupProps, StoryItemProps } from "../../types";
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Send, Heart, Flame } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { formatDistanceToNow } from "date-fns";

interface StoryViewerModalProps {
  storyGroup: StoryGroupProps | null;
  currentUserId: string;
  onClose: () => void;
  onReact: (storyId: string, emoji: string) => void;
  onReply: (userId: string, text: string, storyId: string) => void;
  onDelete: (storyId: string) => void;
  onView?: (storyId: string) => void;
}

const STORY_REACTIONS = ["❤️", "🔥", "😂", "😮", "👏", "🎉"];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  storyGroup,
  currentUserId,
  onClose,
  onReact,
  onReply,
  onDelete,
  onView,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<any>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const stories = storyGroup?.stories ?? [];
  const safeIndex = stories.length > 0 ? Math.min(currentIndex, stories.length - 1) : 0;
  const currentStory: StoryItemProps | undefined = stories[safeIndex];
  const isMe = storyGroup?.user?.id === currentUserId;

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setShowViewers(false);
  }, [storyGroup?.user?.id]);

  useEffect(() => {
    if (!currentStory || !storyGroup) return;
    if (!isMe && currentStory._id && !viewedIdsRef.current.has(currentStory._id)) {
      viewedIdsRef.current.add(currentStory._id);
      onView?.(currentStory._id);
    }
  }, [currentStory?._id, isMe, onView, storyGroup]);

  const handleNext = () => {
    if (!storyGroup || stories.length === 0) return;
    if (safeIndex < stories.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  useEffect(() => {
    setProgress(0);
    setShowViewers(false);
  }, [safeIndex, storyGroup?.user?.id, currentStory?._id]);

  // Auto-progress 5-second timer without resetting elapsed progress on pause/resume
  useEffect(() => {
    if (!storyGroup || stories.length === 0 || !currentStory) return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPaused || showViewers) return;

    const interval = 50; // update every 50ms
    const step = 100 / (5000 / interval);

    timerRef.current = setInterval(() => {
      setProgress((prev) => Math.min(100, prev + step));
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [safeIndex, isPaused, showViewers, storyGroup?.user?.id, stories.length, currentStory?._id]);

  useEffect(() => {
    if (!storyGroup || stories.length === 0) return;
    if (progress >= 100) {
      if (safeIndex < stories.length - 1) {
        setCurrentIndex(safeIndex + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  }, [progress, safeIndex, stories.length, storyGroup, onClose]);

  if (!storyGroup || stories.length === 0 || !currentStory) return null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(storyGroup.user.id, replyText.trim(), currentStory._id);
    setReplyText("");
    setIsPaused(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Story Stage Container */}
      <div className="relative w-full max-w-md h-[90vh] sm:h-[85vh] rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/10">
        {/* Top Header: Progress Bars & Author */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Progress segments */}
          <div className="flex items-center gap-1.5 mb-3">
            {storyGroup.stories.map((story, idx) => (
              <div
                key={story._id}
                className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < currentIndex
                        ? "100%"
                        : idx === currentIndex
                        ? `${progress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author info & Actions */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Avatar
                src={storyGroup.user.avatar}
                name={storyGroup.user.name}
                size="sm"
              />
              <div>
                <span className="font-bold text-sm block leading-tight">
                  {storyGroup.user.name}
                </span>
                <span className="text-[10px] text-white/70">
                  {currentStory.createdAt
                    ? formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })
                    : "Recently"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMe && (
                <button
                  onClick={() => onDelete(currentStory._id)}
                  className="p-2 hover:bg-white/20 rounded-full transition text-rose-400"
                  title="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Body */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {/* Tap Areas */}
          <div
            onClick={handlePrev}
            className="absolute left-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 inset-y-0 w-1/3 z-20 cursor-pointer"
          />

          {currentStory.type === "text" ? (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center"
              style={{
                background:
                  currentStory.backgroundColor ||
                  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              }}
            >
              <p className="text-2xl font-bold text-white drop-shadow-md leading-relaxed whitespace-pre-wrap">
                {currentStory.text}
              </p>
            </div>
          ) : currentStory.type === "video" ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Bottom Bar: Reactions & Reply / Viewers */}
        <div
          className="relative z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {isMe ? (
            <div className="flex items-center justify-between text-white text-xs">
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition"
              >
                <Eye className="w-4 h-4" />
                <span className="font-bold">
                  {currentStory.viewers?.length || 0} Viewers
                </span>
              </button>
              <div className="flex items-center gap-1">
                {currentStory.reactions?.map((r, i) => (
                  <span key={i} className="text-sm">
                    {r.emoji}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Quick Emojis */}
              <div className="flex items-center justify-around py-1">
                {STORY_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(currentStory._id, emoji)}
                    className="text-2xl hover:scale-130 transition transform active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${storyGroup.user.name}...`}
                  className="flex-1 py-2.5 px-4 rounded-full bg-white/15 border border-white/20 text-white placeholder:text-white/60 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Viewers Drawer Overlay */}
        {isMe && showViewers && (
          <div
            className="absolute inset-x-0 bottom-0 z-40 max-h-[55%] bg-zinc-950/95 backdrop-blur-xl border-t border-white/15 rounded-t-3xl p-4 flex flex-col text-white"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">
                  Story Viewers ({currentStory.viewers?.length || 0})
                </span>
              </div>
              <button
                onClick={() => setShowViewers(false)}
                className="p-1.5 rounded-full hover:bg-white/15 transition"
                title="Close Viewers"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 space-y-2">
              {!currentStory.viewers || currentStory.viewers.length === 0 ? (
                <p className="text-center text-xs text-white/50 py-8">
                  No viewers yet.
                </p>
              ) : (
                currentStory.viewers.map((v, idx) => (
                  <div key={`${v.userId}-${idx}`} className="flex items-center justify-between px-1 py-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={v.avatar} name={v.name || "Viewer"} size="xs" />
                      <span className="text-xs font-semibold truncate">
                        {v.name || "Viewed"}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/50 shrink-0">
                      {v.viewedAt
                        ? formatDistanceToNow(new Date(v.viewedAt), { addSuffix: true })
                        : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
