"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play } from "lucide-react";

type VoiceNotePlayerProps = { src: string };

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

export default function VoiceNotePlayer({ src }: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformReady, setWaveformReady] = useState(false);
  const [waveformFailed, setWaveformFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let context: AudioContext | null = null;
    let cancelled = false;
    setWaveform([]);
    setWaveformReady(false);
    setWaveformFailed(false);
    setCurrentTime(0);
    setDuration(0);

    async function buildWaveform() {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load audio data");
        const bytes = await response.arrayBuffer();
        if (cancelled) return;
        context = new window.AudioContext();
        const decoded = await context.decodeAudioData(bytes);
        if (cancelled) return;
        const channelCount = decoded.numberOfChannels;
        const samples = decoded.length;
        const barCount = 52;
        const values: number[] = [];
        for (let bar = 0; bar < barCount; bar++) {
          const start = Math.floor((bar / barCount) * samples);
          const end = Math.max(start + 1, Math.floor(((bar + 1) / barCount) * samples));
          let peak = 0;
          for (let i = start; i < Math.min(end, samples); i += Math.max(1, Math.floor((end - start) / 180))) {
            let samplePeak = 0;
            for (let channel = 0; channel < channelCount; channel++) {
              samplePeak = Math.max(samplePeak, Math.abs(decoded.getChannelData(channel)[i] || 0));
            }
            peak = Math.max(peak, samplePeak);
          }
          values.push(peak);
        }
        const maximum = Math.max(...values, 0.01);
        if (!cancelled) {
          setWaveform(values.map((value) => Math.max(0.12, value / maximum)));
          setWaveformReady(true);
          setWaveformFailed(false);
          setDuration(decoded.duration);
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) setWaveformFailed(true);
      } finally {
        if (context && context.state !== "closed") void context.close().catch(() => undefined);
      }
    }

    void buildWaveform();
    return () => {
      cancelled = true;
      controller.abort();
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
    };
  }, [src]);

  const seekTo = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
    setCurrentTime(audio.currentTime);
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, []);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const seekFromPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width > 0) seekTo((event.clientX - rect.left) / rect.width);
  };

  return (
    <div className="chat-audio-message">
      <div className="voice-note-main">
        <button className="voice-play-toggle" type="button" onClick={togglePlayback} aria-label={isPlaying ? "Pause voice note" : "Play voice note"}>
          {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </button>
        <div className="voice-note-wave-area">
          {waveformReady && !waveformFailed ? (
            <button
              type="button"
              className="voice-waveform"
              aria-label="Seek voice note"
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration)}
              aria-valuenow={Math.floor(currentTime)}
              role="slider"
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); seekFromPointer(event); }}
              onPointerMove={(event) => { if (event.buttons === 1) seekFromPointer(event); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") { event.preventDefault(); seekTo(progress + 0.04); }
                if (event.key === "ArrowLeft") { event.preventDefault(); seekTo(progress - 0.04); }
                if (event.key === "Home") { event.preventDefault(); seekTo(0); }
                if (event.key === "End") { event.preventDefault(); seekTo(1); }
              }}
            >
              {waveform.map((height, index) => (
                <span
                  key={index}
                  className={"voice-wave-bar" + (index / waveform.length <= progress ? " is-played" : "") + (isPlaying && index / waveform.length > progress && index / waveform.length < progress + 0.12 ? " is-animating" : "")}
                  style={{ height: (15 + height * 85) + "%" }}
                />
              ))}
            </button>
          ) : (
            <div className={"voice-waveform-placeholder" + (waveformReady ? "" : " is-loading")} aria-label={waveformFailed ? "Waveform unavailable" : "Loading audio waveform"}>
              {waveformFailed ? <><Mic size={15} /><span>Waveform unavailable</span></> : <>{Array.from({ length: 28 }, (_, index) => <span key={index} />)}</>}
            </div>
          )}
          <div className="voice-time-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      {waveformFailed && <audio className="chat-message-audio-fallback" src={src} controls preload="metadata" />}
      <audio
        ref={audioRef}
        className="voice-note-audio-engine"
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
      />
    </div>
  );
}
