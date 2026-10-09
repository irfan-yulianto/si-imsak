"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPinIcon, SearchIcon, XIcon } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { cx } from "@/components/ui/cx";
import { MESSAGES } from "@/lib/messages";

interface CityComboboxProps<T> {
  /** Accessible name of the input */
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  results: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  /** True while results for the current query are still being fetched */
  isSearching?: boolean;
  /** Queries shorter than this don't search, so no "not found" message either */
  minQueryLength?: number;
  emptyText?: string;
  /** "compact" for the header, "default" for in-page search */
  variant?: "compact" | "default";
}

/**
 * City search input following the WAI-ARIA combobox pattern: arrow keys move
 * through the results, Enter selects, Escape closes the list (a second Escape
 * clears the text) and the result count is announced to screen readers.
 */
export default function CityCombobox<T>({
  label,
  placeholder,
  query,
  onQueryChange,
  results,
  getKey,
  getLabel,
  onSelect,
  isSearching = false,
  minQueryLength = 2,
  emptyText = MESSAGES.cityNotFound,
  variant = "default",
}: CityComboboxProps<T>) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const hasQuery = query.trim().length >= minQueryLength;
  const settled = hasQuery && !isSearching;
  const showList = open && hasQuery && (results.length > 0 || settled);
  const showEmpty = showList && settled && results.length === 0;
  // Clamp: results can shrink while an option is highlighted
  const active = activeIndex < results.length ? activeIndex : -1;

  // Close when clicking or tapping outside
  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  // Keep the highlighted option visible in a scrolled list
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`${baseId}-opt-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, baseId]);

  const select = (item: T) => {
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        if (results.length) setActiveIndex(active < 0 ? 0 : Math.min(active + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (results.length) setActiveIndex(active <= 0 ? 0 : active - 1);
        break;
      case "Enter":
        if (showList && active >= 0) {
          e.preventDefault();
          select(results[active]);
        }
        break;
      case "Escape":
        e.preventDefault();
        if (showList) {
          setOpen(false);
          setActiveIndex(-1);
        } else if (query) {
          onQueryChange("");
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const compact = variant === "compact";
  const announcement = !showList
    ? ""
    : isSearching
      ? ""
      : results.length === 0
        ? emptyText
        : `${results.length} kota ditemukan. Gunakan panah atas dan bawah untuk memilih.`;

  return (
    <div ref={containerRef} className="relative">
      <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        // 16px on phones so iOS Safari doesn't zoom in on focus
        className={cx(
          "min-h-11 w-full rounded-control border border-border bg-surface-2 pl-9 pr-11 text-base font-medium text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 sm:text-sm",
          compact ? "py-2" : "py-2.5"
        )}
      />
      {isSearching ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-fg">
          <Spinner size="sm" />
        </span>
      ) : (
        query && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bersihkan pencarian"
            onClick={() => {
              onQueryChange("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-0 top-0"
          >
            <XIcon size={16} />
          </Button>
        )
      )}

      <ul
        id={listId}
        role="listbox"
        aria-label={`Hasil ${label.toLowerCase()}`}
        hidden={!showList}
        className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-control border border-border bg-surface py-1 shadow-xl"
      >
        {results.map((item, i) => (
          <li
            key={getKey(item)}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // Keep focus in the input while clicking an option
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(item)}
            onMouseEnter={() => setActiveIndex(i)}
            className={cx("flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-left", i === active && "bg-accent-soft")}
          >
            <MapPinIcon size={14} className="shrink-0 text-fg-subtle" />
            <span className="text-sm font-semibold text-fg">{getLabel(item)}</span>
          </li>
        ))}
        {showEmpty && (
          <li role="presentation" className="px-3 py-2.5 text-center text-sm text-fg-subtle">
            {emptyText}
          </li>
        )}
      </ul>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
