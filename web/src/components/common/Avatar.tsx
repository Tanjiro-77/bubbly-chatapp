import React from "react";

interface AvatarProps {
  src?: string | null;
  uri?: string | null;
  name?: string;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  isOnline?: boolean;
  isGroup?: boolean;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: "w-7 h-7 text-xs",
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
  "2xl": "w-28 h-28 text-3xl",
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  uri,
  name = "User",
  size = "md",
  isOnline,
  isGroup = false,
  className = "",
}) => {
  const [imgError, setImgError] = React.useState(false);

  const fallbackPath = isGroup ? "/defaultGroupAvatar.png" : "/defaultAvatar.png";
  const imageSource = src || uri;
  const avatarUrl = imageSource && !imgError ? imageSource : fallbackPath;

  const isNumeric = typeof size === "number";
  const dimensionStyle = isNumeric ? { width: size, height: size } : undefined;
  const sizeClass = !isNumeric ? sizeClasses[size as string] || sizeClasses.md : "";

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        style={dimensionStyle}
        className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center bg-stone-200 dark:bg-zinc-800 shadow-xs border border-black/5 dark:border-white/10`}
      >
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      </div>

      {isOnline && (
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white dark:border-stone-900 shadow-xs"
        />
      )}
    </div>
  );
};
