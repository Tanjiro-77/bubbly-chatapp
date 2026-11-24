import React, { useState } from "react";
import { X, Upload, Sparkles, Image as ImageIcon, Type } from "lucide-react";
import { uploadMediaToCloudinary } from "../../services/mediaService";

interface CreateStoryModalProps {
  onClose: () => void;
  onSubmit: (storyData: {
    type: "text" | "image" | "video";
    text?: string;
    backgroundColor?: string;
    mediaUrl?: string;
  }) => void;
}

const BG_GRADIENTS = [
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", // Bubbly Honey Amber
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)", // Cyan Blue
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)", // Sunset Violet
  "linear-gradient(135deg, #10b981 0%, #059669 100%)", // Emerald Glow
  "linear-gradient(135deg, #18181b 0%, #09090b 100%)", // Obsidian Dark
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onSubmit }) => {
  const [tab, setTab] = useState<"text" | "media">("text");
  const [text, setText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleMediaPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (tab === "text") {
      if (!text.trim()) return;
      onSubmit({
        type: "text",
        text: text.trim(),
        backgroundColor: selectedBg,
      });
      onClose();
    } else {
      if (!mediaFile) return;
      setUploading(true);
      try {
        const res = await uploadMediaToCloudinary(mediaFile, mediaFile.name, "stories");
        if (res.success && res.data?.url) {
          const type = mediaFile.type.startsWith("video/") ? "video" : "image";
          onSubmit({
            type,
            mediaUrl: res.data.url,
            text: caption.trim() || undefined,
          });
          onClose();
        } else {
          alert("Media upload failed");
        }
      } catch {
        alert("Story creation failed");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
              Create Story
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-3 bg-stone-100 dark:bg-zinc-800/60 flex items-center gap-2">
          <button
            onClick={() => setTab("text")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              tab === "text"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <Type className="w-4 h-4" /> Text Story
          </button>
          <button
            onClick={() => setTab("media")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              tab === "media"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Photo / Video
          </button>
        </div>

        {/* Story Editor */}
        <div className="p-4 flex-1 flex flex-col">
          {tab === "text" ? (
            <div className="space-y-4">
              <div
                className="w-full h-64 rounded-2xl p-6 flex items-center justify-center transition shadow-inner relative"
                style={{ background: selectedBg }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your story..."
                  maxLength={250}
                  className="w-full h-full bg-transparent resize-none text-center text-xl font-bold text-white placeholder:text-white/60 focus:outline-none flex items-center justify-center leading-relaxed"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-white/70">
                  {text.length}/250
                </span>
              </div>

              {/* Background selector */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-zinc-400 mb-2">
                  Select Background
                </label>
                <div className="flex items-center gap-2">
                  {BG_GRADIENTS.map((bg, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedBg(bg)}
                      style={{ background: bg }}
                      className={`w-9 h-9 rounded-full shadow-md transition transform hover:scale-110 ${
                        selectedBg === bg ? "ring-4 ring-amber-500/50 scale-105" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {previewUrl ? (
                <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                  {mediaFile?.type.startsWith("video/") ? (
                    <video src={previewUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-64 border-2 border-dashed border-stone-300 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 transition group">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs text-stone-700 dark:text-zinc-300">
                    Upload Photo or Video
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 mt-1">
                    MP4, JPEG, PNG, WEBP
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaPick}
                    className="hidden"
                  />
                </label>
              )}

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="w-full py-2.5 px-4 rounded-2xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          )}

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={uploading || (tab === "text" ? !text.trim() : !mediaFile)}
            className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/30 transition transform active:scale-95 disabled:opacity-50"
          >
            {uploading ? "Uploading Story..." : "Share to Story (24h)"}
          </button>
        </div>
      </div>
    </div>
  );
};
