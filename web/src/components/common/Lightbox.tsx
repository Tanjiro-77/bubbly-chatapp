import React from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";

interface LightboxProps {
  src: string | null;
  onClose: () => void;
  title?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({ src, onClose, title }) => {
  const [scale, setScale] = React.useState(1);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="absolute top-4 inset-x-4 flex items-center justify-between z-10 px-4 py-2 rounded-2xl bg-zinc-900/60 backdrop-blur-md text-white border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium text-zinc-300 truncate max-w-xs sm:max-w-md">
          {title || "Image Preview"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 text-red-400 rounded-full transition ml-2"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div
        className="max-w-[90vw] max-h-[85vh] overflow-hidden flex items-center justify-center cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={title || "Preview"}
          style={{ transform: `scale(${scale})` }}
          className="max-w-full max-h-[85vh] object-contain rounded-lg transition-transform duration-150 shadow-2xl"
        />
      </div>
    </div>
  );
};
