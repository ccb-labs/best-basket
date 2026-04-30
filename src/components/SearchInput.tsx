/**
 * Reusable search input with an optional voice button.
 *
 * Used in two places: the list detail page and shopping mode. The voice
 * button only appears on browsers that support the Web Speech API; the
 * spoken transcript goes straight into the box (no Portuguese parsing —
 * users speak product names freely).
 */
"use client";

import { VoiceButton } from "@/components/VoiceButton";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search items...",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const { isSupported, isListening, startListening, stopListening } =
    useVoiceInput({
      lang: "pt-PT",
      onResult: (transcript) => onChange(transcript),
    });

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-8 text-sm focus:border-zinc-500 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            &times;
          </button>
        )}
      </div>

      {isSupported && (
        <VoiceButton
          isListening={isListening}
          onStart={startListening}
          onStop={stopListening}
          idleLabel="Voice search"
        />
      )}
    </div>
  );
}
