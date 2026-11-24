import React from "react";
import { StoryGroupProps } from "../../types";
import { Plus } from "lucide-react";
import { Avatar } from "../common/Avatar";

interface StoryBarProps {
  stories: StoryGroupProps[];
  currentUserId: string;
  onOpenCreateStory: () => void;
  onViewStoryGroup: (group: StoryGroupProps) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({
  stories,
  currentUserId,
  onOpenCreateStory,
  onViewStoryGroup,
}) => {
  // Find current user's story group
  const myStoryGroup = stories.find((s) => s.user?.id === currentUserId);
  const otherStories = stories.filter((s) => s.user?.id !== currentUserId);

  return (
    <div className="py-2.5 px-3 border-b border-stone-200/80 dark:border-white/5 bg-transparent overflow-x-auto flex items-center gap-3.5 select-none no-scrollbar">
      {/* "My Story" / Add Story Button */}
      <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group" onClick={onOpenCreateStory}>
        <div className="relative">
          <div className="w-14 h-14 rounded-full p-0.5 border-2 border-dashed border-amber-500/80 group-hover:border-amber-500 flex items-center justify-center transition">
            <Avatar
              src={myStoryGroup?.user?.avatar}
              name={myStoryGroup?.user?.name || "Me"}
              size="md"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-900 group-hover:scale-110 transition">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>
        <span className="text-[11px] font-bold text-stone-700 dark:text-zinc-300 group-hover:text-amber-500 transition truncate max-w-[60px]">
          Your Story
        </span>
      </div>

      {/* Friends Stories */}
      {otherStories.map((group) => (
        <div
          key={group.user.id}
          onClick={() => onViewStoryGroup(group)}
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
        >
          <div
            className={`w-14 h-14 rounded-full p-0.5 transition duration-200 group-hover:scale-105 ${
              group.hasUnseen
                ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-md shadow-amber-500/20"
                : "border-2 border-stone-300 dark:border-zinc-700"
            }`}
          >
            <div className="w-full h-full rounded-full overflow-hidden p-0.5 bg-white dark:bg-zinc-900">
              <Avatar
                src={group.user.avatar}
                name={group.user.name}
                size="md"
              />
            </div>
          </div>
          <span className="text-[11px] font-medium text-stone-600 dark:text-zinc-400 group-hover:text-amber-500 transition truncate max-w-[60px]">
            {group.user.name.split(" ")[0]}
          </span>
        </div>
      ))}
    </div>
  );
};
