/**
 * Custom hook that wraps the Web Speech API for voice input.
 *
 * The Web Speech API lets the browser convert speech to text using the
 * device's microphone. It's built into Chrome, Safari, and Edge — no
 * extra libraries needed.
 *
 * This hook handles:
 * - Checking if the browser supports speech recognition
 * - Starting/stopping the microphone
 * - Returning the transcript when speech is recognized
 * - Cleaning up when the component unmounts
 */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// TypeScript doesn't include built-in types for the Web Speech API.
// We declare a minimal interface covering only what we use — this avoids
// needing a third-party types package.
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Check browser support once at module load (never changes during a session).
// Safe for SSR because the typeof guard runs before accessing window.
const isSupported =
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Returns speech-to-text controls.
 *
 * @param lang  - BCP 47 language code (e.g. "pt-PT" for Portuguese)
 * @param onResult - called with the recognized text when speech ends
 */
export function useVoiceInput({
  lang,
  onResult,
}: {
  lang: string;
  onResult: (transcript: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);

  // Keep a ref to the recognition instance so we can stop/abort it
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Store onResult in a ref so the callback always uses the latest version
  // without needing to recreate the recognition instance
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Create a new instance each time (avoids stale state issues)
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI!();

    recognition.lang = lang;
    recognition.interimResults = false; // Only return the final result
    recognition.maxAlternatives = 1; // We only need the best guess

    recognition.onresult = (event) => {
      // The API returns a list of results — we want the first (and only)
      // result's first alternative transcript
      const transcript = event.results[0][0].transcript;
      onResultRef.current(transcript);
      setIsListening(false);
    };

    // onend fires when recognition stops for any reason (success, silence,
    // or error). We use it as a catch-all to reset the listening state.
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      // Common errors: "not-allowed" (mic permission denied or insecure
      // origin), "no-speech" (silence), "audio-capture" (no microphone),
      // "network" (browser can't reach the speech service). We log it so
      // the cause is visible in DevTools, then stop listening — the user
      // can tap the mic button again.
      console.warn(
        `[useVoiceInput] speech recognition error: ${event.error}${
          event.message ? ` — ${event.message}` : ""
        }`
      );
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    // start() can throw synchronously (InvalidStateError) if a previous
    // recognition is still active. Guard so the UI doesn't get stuck.
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn("[useVoiceInput] failed to start recognition:", err);
      setIsListening(false);
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Clean up: if the component unmounts while listening, abort recognition
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { isSupported, isListening, startListening, stopListening };
}
