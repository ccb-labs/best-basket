/**
 * Microphone button used by any input that supports voice entry.
 *
 * Centralises the styling and the listening/idle visual states so search
 * and item-entry forms stay visually consistent.
 */
"use client";

import { MicrophoneIcon } from "@/components/MicrophoneIcon";

export function VoiceButton({
  isListening,
  onStart,
  onStop,
  idleLabel = "Voice input",
  listeningLabel = "Stop listening",
}: {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  idleLabel?: string;
  listeningLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      aria-label={isListening ? listeningLabel : idleLabel}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors ${
        isListening
          ? "border-red-300 bg-red-50 text-red-500"
          : "border-zinc-300 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
      }`}
    >
      {isListening ? (
        <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
      ) : (
        <MicrophoneIcon />
      )}
    </button>
  );
}
