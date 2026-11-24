import React, { useState } from "react";
import { MessageProps } from "../../types";
import { X, Image as ImageIcon, FileText, Link2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { formatFileSize } from "../../services/mediaService";

interface SharedMediaModalProps {
  conversationName: string;
  messages: MessageProps[];
  onClose: () => void;
  onOpenImage: (url: string) => void;
}

export const SharedMediaModal: React.FC<SharedMediaModalProps> = ({
  conversationName,
  messages,
  onClose,
  onOpenImage,
}) => {
  const [tab, setTab] = useState<"media" | "docs" | "links">("media");

  // Filter messages by tab
  const mediaItems = messages.filter(
    (m) => (m.type === "image" || m.type === "video") && m.attachement
  );

  const docItems = messages.filter((m) => m.type === "file" && m.attachement);

  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const linkItems = messages.filter((m) => m.content && linkRegex.test(m.content));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 dark:text-white leading-tight">
              Shared Content
            </h3>
            <span className="text-xs text-stone-400 dark:text-zinc-500 font-medium truncate block">
              {conversationName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-3 bg-stone-100 dark:bg-zinc-800/60 flex items-center gap-2">
          <button
            onClick={() => setTab("media")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              tab === "media"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-500" /> Media ({mediaItems.length})
          </button>
          <button
            onClick={() => setTab("docs")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              tab === "docs"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <FileText className="w-4 h-4 text-sky-500" /> Docs ({docItems.length})
          </button>
          <button
            onClick={() => setTab("links")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              tab === "links"
                ? "bg-white dark:bg-zinc-700 text-stone-900 dark:text-white shadow-xs"
                : "text-stone-500 dark:text-zinc-400 hover:text-stone-800"
            }`}
          >
            <Link2 className="w-4 h-4 text-emerald-500" /> Links ({linkItems.length})
          </button>
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "media" && (
            mediaItems.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">No media shared yet</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenImage(item.attachement!)}
                    className="aspect-square rounded-2xl overflow-hidden bg-black/10 dark:bg-white/10 cursor-pointer hover:scale-105 transition"
                  >
                    {item.type === "video" ? (
                      <video src={item.attachement} className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={item.attachement}
                        alt="Media"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "docs" && (
            docItems.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">No documents shared yet</div>
            ) : (
              <div className="space-y-2">
                {docItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.attachement!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5 hover:border-amber-400 transition"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 truncate">
                      <span className="font-bold text-xs truncate block text-stone-900 dark:text-white">
                        {item.attachmentMeta?.name || "Shared Document"}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                        {item.attachmentMeta?.size
                          ? formatFileSize(item.attachmentMeta.size)
                          : "File"} • {item.createdAt ? format(new Date(item.createdAt), "MMM d") : ""}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )
          )}

          {tab === "links" && (
            linkItems.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">No links shared yet</div>
            ) : (
              <div className="space-y-2">
                {linkItems.map((item, idx) => {
                  const links = item.content.match(linkRegex) || [];
                  return links.map((link, lIdx) => (
                    <a
                      key={`${idx}-${lIdx}`}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-white/5 hover:border-emerald-400 transition text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <span className="truncate pr-3">{link}</span>
                      <ExternalLink className="w-4 h-4 shrink-0 text-stone-400" />
                    </a>
                  ));
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
