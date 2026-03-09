"use client";

import { useState, useRef, useEffect } from "react";
import { searchDrinks, type DrinkSuggestion } from "@/lib/actions/drinks";

type Props = {
  value: string;
  onChange: (value: string) => void;
  abvValue: string;
  onAbvChange: (value: string) => void;
  noteValue: string;
  onNoteChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  autoFocus?: boolean;
};

export function DrinkSearchInput({
  value,
  onChange,
  abvValue,
  onAbvChange,
  noteValue,
  onNoteChange,
  placeholder = "e.g. IPA, Grey Goose Vodka",
  id = "drinkName",
  required = true,
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<DrinkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync query with value when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchDrinks(query);
      setSuggestions(results);
      setOpen(true);
      setActiveIndex(-1);
      setLoading(false);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(suggestion: DrinkSuggestion) {
    onChange(suggestion.drink_name);
    setQuery(suggestion.drink_name);
    if (suggestion.abv != null) {
      onAbvChange(String(suggestion.abv));
    } else {
      onAbvChange("");
    }
    if (suggestion.note) {
      onNoteChange(suggestion.note);
    } else {
      onNoteChange("");
    }
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-slate-300"
      >
        Drink name
      </label>
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-controls="drink-suggestions"
        aria-activedescendant={
          activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
        }
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />

      {open && (
        <ul
          id="drink-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-4 py-2 text-sm text-slate-400">Searching…</li>
          ) : suggestions.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-500">
              No results — type to add as custom drink
            </li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={`${s.drink_name}-${i}`}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`cursor-pointer px-4 py-2 text-sm ${
                  i === activeIndex
                    ? "bg-sky-600/30 text-slate-100"
                    : "text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                <span className="font-medium">{s.drink_name}</span>
                {(s.abv != null || s.note) && (
                  <span className="ml-1 text-slate-400">
                    {[s.abv != null ? `${s.abv}%` : null, s.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
