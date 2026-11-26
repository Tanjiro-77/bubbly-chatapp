import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface VoicePlayerProps {
  url: string;
  duration?: number;
  isMe?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ url, duration = 0, isMe = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speed;
    }
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const formatTime = (secs: number) => {
    const safeSecs = Number.isFinite(secs) && secs >= 0 ? secs : 0;
    const m = Math.floor(safeSecs / 60);
    const s = Math.floor(safeSecs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const rawDuration = audioRef.current?.duration;
  const totalTime =
    duration || (typeof rawDuration === "number" && Number.isFinite(rawDuration) ? Math.floor(rawDuration) : 0);

  // Generate pseudo-random deterministic waveform heights
  const bars = [40, 65, 80, 50, 90, 75, 45, 85, 100, 70, 55, 95, 60, 45, 80, 65, 50, 75, 85, 40];

  return (
    <div className="flex items-center gap-3 py-1 min-w-[220px]">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition transform active:scale-95 ${
          isMe
            ? "bg-amber-600 hover:bg-amber-700 text-white"
            : "bg-amber-500 hover:bg-amber-600 text-white"
        }`}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform & Progress */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-0.5 h-6 cursor-pointer" onClick={togglePlay}>
          {bars.map((h, i) => {
            const progress = totalTime > 0 ? currentTime / totalTime : 0;
            const barProgress = i / bars.length;
            const isActive = barProgress <= progress;

            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isActive
                    ? isMe
                      ? "bg-amber-700 dark:bg-amber-400"
                      : "bg-amber-600 dark:bg-amber-400"
                    : isMe
                    ? "bg-amber-300 dark:bg-amber-900/60"
                    : "bg-stone-300 dark:bg-zinc-600"
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium opacity-70">
          <span>{formatTime(currentTime > 0 ? currentTime : totalTime)}</span>
          <button
            onClick={toggleSpeed}
            className="px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[9px] font-bold"
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
};
