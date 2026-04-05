/**
 * Full-screen overlay for Live Shopping mode.
 *
 * Shows the current item in a large card, announces it by voice (TTS),
 * and listens for Portuguese voice commands: "Feito" (check), "Próximo"
 * (skip), "[item] check" (check specific item), "Fechar" (exit).
 *
 * Manual fallback buttons are always visible at the bottom for when
 * voice recognition fails or isn't supported.
 */
"use client";

import { useEffect, useState } from "react";
import { useLiveShopping } from "@/hooks/useLiveShopping";
import { ShoppingProgressBar } from "@/components/ShoppingProgressBar";
import { MicrophoneIcon } from "@/components/MicrophoneIcon";
import { formatQuantity } from "@/lib/list-helpers";
import type { ListItemWithCategory, BestDealInfo } from "@/lib/types";

export function LiveShoppingMode({
  items,
  bestDeals,
  onToggle,
  onClose,
}: {
  items: ListItemWithCategory[];
  bestDeals: Record<string, BestDealInfo>;
  onToggle: (itemId: string, checked: boolean) => void;
  onClose: () => void;
}) {
  const {
    phase,
    currentItem,
    lastCommand,
    lastError,
    uncheckedCount,
    start,
    stop,
    manualCheck,
    manualSkip,
    retryListen,
  } = useLiveShopping({ items, onToggle, onClose });

  // Auto-clear the "last command" feedback after 2 seconds
  const [visibleCommand, setVisibleCommand] = useState<string | null>(null);
  useEffect(() => {
    if (lastCommand) {
      setVisibleCommand(lastCommand);
      const timer = setTimeout(() => setVisibleCommand(null), 2000);
      return () => clearTimeout(timer);
    }
    setVisibleCommand(null);
  }, [lastCommand]);

  const checkedCount = items.length - uncheckedCount;
  const allDone = uncheckedCount === 0 && phase === "idle";
  const bestDeal = currentItem ? (bestDeals[currentItem.name] ?? null) : null;

  function handleClose() {
    stop();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-900">Live Shopping</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Close live shopping"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3">
        <ShoppingProgressBar
          checkedCount={checkedCount}
          totalCount={items.length}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {/* Idle state: "Tap to begin" */}
        {phase === "idle" && !allDone && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-center text-sm text-zinc-500">
              The app will announce each item and listen for your commands
            </p>
            <button
              type="button"
              onClick={start}
              className="rounded-xl bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-green-700 active:bg-green-800"
            >
              Tap to begin
            </button>
            <div className="text-center text-xs text-zinc-400">
              <p><strong>&quot;Feito&quot;</strong> — check item</p>
              <p><strong>&quot;Próximo&quot;</strong> — skip item</p>
              <p><strong>&quot;Fechar&quot;</strong> — exit</p>
            </div>
          </div>
        )}

        {/* All done state */}
        {allDone && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-green-600">
              Compras terminadas!
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        )}

        {/* Active states: showing current item */}
        {phase !== "idle" && currentItem && (
          <div className="flex w-full max-w-sm flex-col items-center gap-6">
            {/* Current item card */}
            <div className="w-full rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center shadow-sm">
              {/* Category label */}
              {currentItem.categories && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {currentItem.categories.name}
                </p>
              )}
              {/* Item name — large and prominent */}
              <p className="text-2xl font-bold text-zinc-900">
                {currentItem.name}
              </p>
              {/* Quantity */}
              <p className="mt-1 text-sm text-zinc-500">
                {formatQuantity(currentItem.quantity, currentItem.units.name)}
              </p>
              {/* Best deal price */}
              {bestDeal && (
                <p className="mt-2 text-sm text-zinc-500">
                  &euro;{bestDeal.lineTotal.toFixed(2)} @ {bestDeal.storeName}
                </p>
              )}
            </div>

            {/* Phase indicator */}
            <PhaseIndicator phase={phase} />

            {/* Voice command hint */}
            {(phase === "listening" || phase === "waiting") && (
              <p className="text-xs text-zinc-400">
                Diga &quot;Feito&quot; ou &quot;Próximo&quot;
              </p>
            )}

            {/* Last command feedback */}
            {visibleCommand && (
              <p className="text-xs text-zinc-400">
                Heard: &quot;{visibleCommand}&quot;
              </p>
            )}

            {/* Error feedback */}
            {lastError && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
                {lastError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Manual fallback buttons — always visible when active */}
      {phase !== "idle" && (
        <div className="border-t border-zinc-200 px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            {/* Tap to listen — prominent when in waiting phase */}
            {phase === "waiting" && (
              <button
                type="button"
                onClick={retryListen}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <MicrophoneIcon className="h-4 w-4" />
                Tap to listen
              </button>
            )}

            <button
              type="button"
              onClick={manualCheck}
              className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Check
            </button>
            <button
              type="button"
              onClick={manualSkip}
              className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Phase indicator sub-component --

function PhaseIndicator({ phase }: { phase: string }) {
  if (phase === "speaking") {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        {/* Speaker icon */}
        <svg className="h-5 w-5 animate-pulse text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.5l4-3v13l-4-3H4a1 1 0 01-1-1v-5a1 1 0 011-1h2.5z" />
        </svg>
        Announcing...
      </div>
    );
  }

  if (phase === "listening") {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        {/* Pulsing red mic — same visual language as the add-item voice button */}
        <div className="relative">
          <MicrophoneIcon className="h-5 w-5 text-red-500" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-red-500" />
        </div>
        Listening...
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <p className="text-sm text-zinc-400">
        Tap a button below or tap &quot;Tap to listen&quot; to try voice again
      </p>
    );
  }

  if (phase === "processing") {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <svg className="h-4 w-4 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Processing...
      </div>
    );
  }

  return null;
}
