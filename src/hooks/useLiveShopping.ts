/**
 * Hook that manages the Live Shopping voice cycle:
 *   speak item name (TTS) → listen for command (STT) → process → repeat
 *
 * This is completely separate from useVoiceInput.ts (which handles
 * voice input for adding items). Each creates its own SpeechRecognition
 * instances and they never run on the same page.
 *
 * The hook is a state machine with phases:
 *   idle → speaking → listening → processing → speaking → ...
 *   If recognition fails: → waiting (manual controls available)
 */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseLiveCommand, findMatchingItem } from "@/lib/live-command-parser";
import { formatQuantity, pluralizePortuguese } from "@/lib/list-helpers";
import type { ListItemWithCategory } from "@/lib/types";

// -- Types --

export type LivePhase =
  | "idle"        // Not started yet / all done
  | "speaking"    // TTS is announcing the current item
  | "listening"   // Recognition is active, waiting for command
  | "processing"  // Brief: parsing and executing the command
  | "waiting";    // Recognition failed — manual controls shown

// Reuse the same SpeechRecognition types from useVoiceInput
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Check browser support for both TTS and STT
const hasSpeechRecognition =
  typeof window !== "undefined" &&
  !!(
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
      .webkitSpeechRecognition
  );

const hasSpeechSynthesis =
  typeof window !== "undefined" && !!window.speechSynthesis;

function getSpeechRecognitionAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
      .webkitSpeechRecognition ||
    null
  );
}

// -- TTS helper --

/**
 * Speaks text using the Web Speech Synthesis API.
 * Returns a promise that resolves when speech finishes.
 * Includes a safety timeout (5s) for the Chrome bug where onend
 * sometimes doesn't fire.
 */
function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!hasSpeechSynthesis) {
      resolve();
      return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-PT";
    utterance.rate = 0.9; // Slightly slower for clarity

    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(safetyTimer);
        resolve();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Safety timeout — Chrome sometimes doesn't fire onend
    const safetyTimer = setTimeout(finish, 5000);

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Converts quantity 1 or 2 to the correct gendered Portuguese word.
 * "um/uma" (1) and "dois/duas" (2) depend on the unit's gender.
 * Quantities 3+ have no gender variation — use the digit.
 */
function genderedQuantity(quantity: number, gender: "m" | "f"): string {
  if (quantity === 1) return gender === "f" ? "uma" : "um";
  if (quantity === 2) return gender === "f" ? "duas" : "dois";
  return String(quantity);
}

/** Builds the announcement text for an item in Portuguese.
 * Uses gendered numbers (uma/duas for feminine, um/dois for masculine).
 * Examples: "duas Unidades de Espinafre", "um Quilograma de Arroz" */
function buildAnnouncement(item: ListItemWithCategory): string {
  const qty = genderedQuantity(item.quantity, item.units.gender);
  const unitName = item.quantity > 1
    ? pluralizePortuguese(item.units.name)
    : item.units.name;
  return `${qty} ${unitName} de ${item.name}`;
}

// -- Main hook --

export function useLiveShopping({
  items,
  onToggle,
  onClose,
}: {
  items: ListItemWithCategory[];
  onToggle: (itemId: string, checked: boolean) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<LivePhase>("idle");
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Refs for cleanup
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isMountedRef = useRef(true);
  // Track phase in a ref so async callbacks see the latest value
  const phaseRef = useRef<LivePhase>("idle");

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Derive unchecked items
  const uncheckedItems = items.filter((i) => !i.checked);

  // Current item: first unchecked not in the skip set
  const currentItem =
    uncheckedItems.find((i) => !skippedIds.has(i.id)) ?? null;

  // -- Core cycle functions --

  const announceAndListen = useCallback(
    async (item: ListItemWithCategory) => {
      if (!isMountedRef.current) return;

      // Speak the item name
      setPhase("speaking");
      setLastCommand(null);
      setLastError(null);

      await speak(buildAnnouncement(item));

      if (!isMountedRef.current) return;

      // Now start listening
      startRecognition();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const startRecognition = useCallback(() => {
    if (!isMountedRef.current) return;

    // Abort any previous recognition instance before creating a new one
    recognitionRef.current?.abort();
    recognitionRef.current = null;

    const API = getSpeechRecognitionAPI();
    if (!API) {
      setPhase("waiting");
      return;
    }

    setPhase("listening");

    try {
      const recognition = new API();
      recognition.lang = "pt-PT";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Flag to track if we got a result (vs. just silence/timeout)
      let gotResult = false;

      recognition.onresult = (event) => {
        gotResult = true;
        const transcript = event.results[0][0].transcript;
        if (isMountedRef.current) {
          setLastCommand(transcript);
          processCommand(transcript);
        }
      };

      recognition.onerror = (event) => {
        if (!isMountedRef.current) return;
        if (event.error === "aborted") return; // We caused this, ignore

        if (event.error === "not-allowed") {
          setLastError("Microphone permission denied");
        }
        setPhase("waiting");
      };

      recognition.onend = () => {
        // If we didn't get a result (silence/timeout), go to waiting
        if (!gotResult && isMountedRef.current && phaseRef.current === "listening") {
          setPhase("waiting");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      // start() can throw if another recognition is active
      if (isMountedRef.current) {
        setPhase("waiting");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Helper callbacks (declared before processCommand effect that uses them) --

  const handleAllDone = useCallback(async () => {
    if (!isMountedRef.current) return;
    setPhase("speaking");
    await speak("Compras terminadas!");
    if (isMountedRef.current) {
      setPhase("idle");
    }
  }, []);

  const stopEverything = useCallback(() => {
    if (hasSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setPhase("idle");
    setLastCommand(null);
    setLastError(null);
  }, []);

  // We use a ref for processCommand because it needs access to the latest
  // items/currentItem without causing the cycle functions to re-create
  const processCommandRef = useRef<(transcript: string) => void>(() => {});

  const processCommand = useCallback((transcript: string) => {
    processCommandRef.current(transcript);
  }, []);

  // Keep processCommandRef updated with latest closure values
  useEffect(() => {
    processCommandRef.current = (transcript: string) => {
      if (!isMountedRef.current) return;
      setPhase("processing");

      const command = parseLiveCommand(transcript);
      const unchecked = items.filter((i) => !i.checked);

      switch (command.type) {
        case "check": {
          if (!currentItem) return;
          // Compute the next item BEFORE toggling (optimistic update
          // will remove current from unchecked instantly)
          const nextItem = unchecked.find(
            (i) => i.id !== currentItem.id && !skippedIds.has(i.id)
          );
          onToggle(currentItem.id, true);

          if (nextItem) {
            announceAndListen(nextItem);
          } else if (unchecked.length <= 1) {
            handleAllDone();
          } else {
            // Remaining items are all skipped — clear skips and announce first
            setSkippedIds(new Set());
            const firstRemaining = unchecked.find(
              (i) => i.id !== currentItem.id
            );
            if (firstRemaining) {
              announceAndListen(firstRemaining);
            } else {
              handleAllDone();
            }
          }
          break;
        }

        case "skip": {
          if (!currentItem) return;
          const newSkipped = new Set(skippedIds);
          newSkipped.add(currentItem.id);
          setSkippedIds(newSkipped);

          // Find next non-skipped item
          const nextItem = unchecked.find(
            (i) => i.id !== currentItem.id && !newSkipped.has(i.id)
          );
          if (nextItem) {
            announceAndListen(nextItem);
          } else {
            // All skipped — cycle back to the first unchecked
            setSkippedIds(new Set());
            announceAndListen(unchecked[0]);
          }
          break;
        }

        case "close": {
          stopEverything();
          onClose();
          break;
        }

        case "check_specific": {
          const matched = findMatchingItem(command.itemName, items);
          if (matched) {
            // Check the matched item
            onToggle(matched.id, true);
            // Remove from skipped if it was there
            const newSkipped = new Set(skippedIds);
            newSkipped.delete(matched.id);
            setSkippedIds(newSkipped);

            // If the matched item was the current item, find next
            // Otherwise, re-announce the current item
            if (matched.id === currentItem?.id) {
              const nextItem = unchecked.find(
                (i) => i.id !== matched.id && !newSkipped.has(i.id)
              );
              if (nextItem) {
                announceAndListen(nextItem);
              } else if (unchecked.length <= 1) {
                handleAllDone();
              } else {
                setSkippedIds(new Set());
                const firstRemaining = unchecked.find(
                  (i) => i.id !== matched.id
                );
                if (firstRemaining) {
                  announceAndListen(firstRemaining);
                } else {
                  handleAllDone();
                }
              }
            } else if (currentItem) {
              // Re-announce current item (the checked one was different)
              announceAndListen(currentItem);
            }
          } else {
            setLastError(`Item não encontrado: "${command.itemName}"`);
            setPhase("waiting");
          }
          break;
        }

        default: {
          // Unknown command
          setLastError(`Não percebi: "${(command as { raw: string }).raw}"`);
          setPhase("waiting");
          break;
        }
      }
    };
  }, [
    currentItem,
    items,
    skippedIds,
    onToggle,
    onClose,
    announceAndListen,
    handleAllDone,
    stopEverything,
  ]);

  // -- Public controls --

  const start = useCallback(() => {
    if (uncheckedItems.length === 0) {
      handleAllDone();
      return;
    }
    setSkippedIds(new Set());
    setLastCommand(null);
    setLastError(null);

    const firstItem =
      uncheckedItems.find((i) => !skippedIds.has(i.id)) ?? uncheckedItems[0];
    announceAndListen(firstItem);
  }, [uncheckedItems, skippedIds, announceAndListen, handleAllDone]);

  // Manual controls delegate to processCommand to avoid duplicating logic
  const manualCheck = useCallback(() => {
    processCommand("feito");
  }, [processCommand]);

  const manualSkip = useCallback(() => {
    processCommand("proximo");
  }, [processCommand]);

  const retryListen = useCallback(() => {
    setLastError(null);
    startRecognition();
  }, [startRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (hasSpeechSynthesis) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    phase,
    currentItem,
    lastCommand,
    lastError,
    isSupported: hasSpeechRecognition && hasSpeechSynthesis,
    uncheckedCount: uncheckedItems.length,
    start,
    stop: stopEverything,
    manualCheck,
    manualSkip,
    retryListen,
  };
}
