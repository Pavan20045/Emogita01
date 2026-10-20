import React, { useState, useRef, useEffect } from "react";

export default function AudioPlayer({ src, loading = false }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  const speeds = [0.85, 1.0, 1.15];

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio playback error:", err);
          setHasError(true);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newRate = speeds[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (timeInSec) => {
    if (isNaN(timeInSec) || !isFinite(timeInSec)) return "0:00";
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) {
    return (
      <div className="audio-player-panel" style={{ opacity: 0.7 }} aria-busy="true">
        <div className="loader-ring" style={{ width: "32px", height: "32px" }} />
        <span style={{ fontSize: "0.9375rem", color: "var(--text-muted)" }}>
          Preparing audio reflection...
        </span>
      </div>
    );
  }

  if (hasError || !src) {
    return (
      <div className="panel" style={{ padding: "16px 20px", background: "var(--surface)", borderLeft: "3px solid var(--text-faint)" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Audio isn't available right now. You can still read the advice below.
        </p>
      </div>
    );
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player-panel" role="region" aria-label="Audio reflection player">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
        preload="metadata"
      />

      {/* Round 56px Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="audio-play-btn"
        aria-label={isPlaying ? "Pause advice" : "Play advice"}
        title={isPlaying ? "Pause advice" : "Play advice"}
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: "translateX(2px)" }}>
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Track & Waveform */}
      <div className="audio-track-area">
        {/* 40-bar static waveform decoration filled by progress */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px", marginBottom: "4px" }} aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => {
            const barHeight = 6 + Math.sin(i * 0.4) * 8 + Math.cos(i * 0.9) * 4;
            const isFilled = (i / 40) * 100 <= progressPct;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(4, Math.min(20, barHeight))}px`,
                  backgroundColor: isFilled ? "var(--peacock)" : "var(--line)",
                  borderRadius: "2px",
                  transition: "background-color 0.1s"
                }}
              />
            );
          })}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="audio-seekbar"
          aria-label="Audio progress slider"
        />

        <div className="audio-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback speed button */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="audio-speed-btn tabular-nums"
        aria-label={`Playback speed: ${playbackRate}x. Click to change.`}
      >
        {playbackRate}×
      </button>
    </div>
  );
}
