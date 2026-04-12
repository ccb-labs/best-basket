/**
 * A form to add a new item to a shopping list.
 *
 * Always visible at the top of the list detail page (same pattern as
 * ShoppingListForm on the home page). Fields: name, quantity, unit,
 * and category — only name is required.
 *
 * The name field has autocomplete — as you type, it suggests matching
 * products from your existing product catalog. Picking a suggestion
 * reuses that product (so prices and category carry over automatically).
 *
 * Uses useActionState + formRef to clear the form after a successful
 * submission (same pattern as ShoppingListForm).
 */
"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateCategoryForm } from "@/components/CreateCategoryForm";
import { MicrophoneIcon } from "@/components/MicrophoneIcon";
import { createClient } from "@/lib/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { parsePortugueseInput } from "@/lib/voice-parser";
import type { ActionResult } from "@/app/(protected)/actions";
import type { Category, Product, Unit } from "@/lib/types";

const MIN_SEARCH_LENGTH = 2;

export function AddItemForm({
  listId,
  categories,
  units,
  addItemAction,
  createCategoryAction,
}: {
  /** The shopping list this item will be added to */
  listId: string;
  /** Available categories (default + user-created) for the dropdown */
  categories: Category[];
  /** Available units for the unit dropdown */
  units: Unit[];
  /** Server Action to add the item */
  addItemAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  /** Server Action to create a new category */
  createCategoryAction: (
    previousState: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);

  // Case-insensitive match to handle subtle data differences
  // (e.g. trailing whitespace or casing in the DB)
  const findUnitByAbbr = (abbr: string) =>
    units.find((u) => u.abbreviation.trim().toLowerCase() === abbr.toLowerCase());

  // ─── Form field state ───
  // Name, quantity, and unit are all controlled so voice input can fill them.
  const [nameValue, setNameValue] = useState("");
  const [quantityValue, setQuantityValue] = useState("1");
  const defaultUnitId = findUnitByAbbr("Un")?.id ?? units[0]?.id ?? "";
  const [unitValue, setUnitValue] = useState(defaultUnitId);
  const [categoryValue, setCategoryValue] = useState("");

  // ─── Autocomplete state ───
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ─── Voice input ───
  // Uses the Web Speech API to convert speech to text (Portuguese).
  // The browser handles all the heavy lifting — no external service needed.
  const { isSupported: voiceSupported, isListening, startListening, stopListening } =
    useVoiceInput({
      lang: "pt-PT",
      onResult: (transcript) => {
        // Parse "2 espinafres" into { quantity: 2, name: "espinafres" }
        const parsed = parsePortugueseInput(transcript);
        setNameValue(parsed.name);
        setQuantityValue(String(parsed.quantity));
        // Map the parsed abbreviation (e.g. "Kg") to the unit ID
        const matchedUnit = parsed.unit
          ? findUnitByAbbr(parsed.unit)
          : null;
        setUnitValue(matchedUnit?.id ?? defaultUnitId);
        // Match the spoken category name against available categories
        // Only update category if the voice input explicitly included one
        if (parsed.category) {
          const matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === parsed.category!.toLowerCase()
          );
          setCategoryValue(matchedCategory?.id ?? "");
        }
      },
    });

  // Debounced search: query products after the user stops typing for 300ms.
  // Both branches run inside setTimeout so setState is never called
  // synchronously in the effect body (avoids cascading renders).
  useEffect(() => {
    const trimmed = nameValue.trim();

    const timer = setTimeout(
      async () => {
        if (trimmed.length < MIN_SEARCH_LENGTH) {
          setSuggestions([]);
          return;
        }

        const supabase = createClient();
        const { data } = await supabase
          .from("products")
          .select("id, name, user_id")
          .ilike("name", `%${trimmed}%`)
          .order("name")
          .limit(5);

        setSuggestions((data ?? []) as Product[]);
        setShowSuggestions(true);
      },
      trimmed.length < MIN_SEARCH_LENGTH ? 0 : 300
    );

    return () => clearTimeout(timer);
  }, [nameValue]);

  const [state, formAction] = useActionState(
    async (previousState: ActionResult, formData: FormData) => {
      const result = await addItemAction(previousState, formData);
      if (!result.error) {
        setNameValue("");
        setQuantityValue("1");
        setUnitValue(defaultUnitId);
        setCategoryValue("");
        setSuggestions([]);
      }
      return result;
    },
    { error: null }
  );

  return (
    <div>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="list_id" value={listId} />

        {/* Item name with autocomplete suggestions and voice input */}
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              name="name"
              placeholder="Item name..."
              required
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Small delay so click on suggestion registers before hiding
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              autoComplete="off"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />

            {/* Microphone button — only shown if the browser supports speech recognition.
                Tapping it starts listening; tapping again (or waiting) stops it. */}
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? "Stop listening" : "Voice input"}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isListening
                    ? "border-red-300 bg-red-50 text-red-500"
                    : "border-zinc-300 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
                }`}
              >
                {isListening ? (
                  /* Pulsing red dot while listening */
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                ) : (
                  <MicrophoneIcon />
                )}
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-md">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // onMouseDown fires before onBlur, so the click registers
                      e.preventDefault();
                      setNameValue(product.name);
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    {product.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quantity, unit, and category on the same row */}
        <div className="flex gap-2">
          <input
            type="number"
            name="quantity"
            value={quantityValue}
            onChange={(e) => setQuantityValue(e.target.value)}
            min={0.01}
            step="any"
            className="w-20 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <select
            name="unit_id"
            value={unitValue}
            onChange={(e) => setUnitValue(e.target.value)}
            className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.abbreviation}
              </option>
            ))}
          </select>
          <select
            name="category_id"
            value={categoryValue}
            onChange={(e) => setCategoryValue(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <SubmitButton label="Add item" pendingLabel="Adding..." />
      </form>

      {/* Link to create a new category */}
      {!showNewCategory && (
        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          + New category
        </button>
      )}

      {/* Inline form to create a custom category */}
      {showNewCategory && (
        <CreateCategoryForm
          listId={listId}
          createCategoryAction={createCategoryAction}
          onCancel={() => setShowNewCategory(false)}
        />
      )}

      {state.error && (
        <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
