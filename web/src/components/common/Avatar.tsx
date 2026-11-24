import React from "react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  isOnline?: boolean;
  isGroup?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-11 h-11 text-base",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
  "2xl": "w-28 h-28 text-3xl",
};

const dotSizeClasses = {
  xs: "w-2 h-2 ring-1",
  sm: "w-2.5 h-2.5 ring-1.5",
  md: "w-3 h-3 ring-2",
  lg: "w-3.5 h-3.5 ring-2",
  xl: "w-4 h-4 ring-2",
  "2xl": "w-5 h-5 ring-3",
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "User",
  size = "md",
  isOnline,
  isGroup = false,
  className = "",
}) => {
  const [imgError, setImgError] = React.useState(false);

  const getInitials = (n: string) => {
    if (!n) return "U";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const getGradient = (str: string) => {
    const hash = str.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hues = [
      "from-amber-400 to-amber-600",
      "from-orange-400 to-amber-500",
      "from-yellow-400 to-amber-600",
      "from-amber-500 to-orange-600",
      "from-rose-400 to-amber-500",
    ];
    return hues[Math.abs(hash) % hues.length];
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-bold text-white shadow-sm border border-black/5 dark:border-white/10`}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-tr ${
              isGroup ? "from-amber-600 to-amber-800" : getGradient(name)
            }`}
          >
            {isGroup ? "👥" : getInitials(name)}
          </div>
        )}
      </div>

      {isOnline !== undefined && !isGroup && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-white dark:ring-zinc-900 ${
            dotSizeClasses[size]
          } ${isOnline ? "bg-emerald-500" : "bg-zinc-400"}`}
        />
      )}
    </div>
  );
};
