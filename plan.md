1. **Update `LocationSearch.tsx` to include clear search functionality using `replace_with_git_merge_diff`**
   - Import `XIcon` from `src/components/ui/Icons`.
```
<<<<<<< SEARCH
import { SearchIcon, MapPinIcon } from "@/components/ui/Icons";
=======
import { SearchIcon, MapPinIcon, XIcon } from "@/components/ui/Icons";
>>>>>>> REPLACE
```
   - Add an `inputRef` for focus management.
```
<<<<<<< SEARCH
  const [isDetecting, setIsDetecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
=======
  const [isDetecting, setIsDetecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
>>>>>>> REPLACE
```
   - Conditionally render a clear button when the search query is not empty and `isSearching` is false.
```
<<<<<<< SEARCH
      <div className="relative">
        <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
        <input
          type="text"
          aria-label="Cari kota"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              setQuery("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Cari kota..."
          className="w-full rounded-lg border border-slate-200/80 bg-slate-50/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}
      </div>
=======
      <div className="relative">
        <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          aria-label="Cari kota"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              setQuery("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Cari kota..."
          className="w-full rounded-lg border border-slate-200/80 bg-slate-50/80 py-2 pl-9 pr-9 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
        />
        {query && !isSearching && (
          <button
            type="button"
            aria-label="Bersihkan pencarian"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <XIcon size={14} />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}
      </div>
>>>>>>> REPLACE
```

2. **Update `MosqueFinder.tsx` to include clear search functionality using `replace_with_git_merge_diff`**
   - Import `XIcon` from `src/components/ui/Icons`.
```
<<<<<<< SEARCH
import { MosqueIcon, MapPinIcon, SearchIcon } from "@/components/ui/Icons";
=======
import { MosqueIcon, MapPinIcon, SearchIcon, XIcon } from "@/components/ui/Icons";
>>>>>>> REPLACE
```
   - Update `searchRef` to correctly type for input reference.
```
<<<<<<< SEARCH
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [customRadius, setCustomRadius] = useState<number | null>(null);
=======
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [customRadius, setCustomRadius] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
>>>>>>> REPLACE
```
   - Conditionally render a clear button when the search query is not empty.
```
<<<<<<< SEARCH
        {/* Search input */}
        <div ref={searchRef} className="relative mb-3">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
          <input
            type="text"
            aria-label="Cari kota untuk lokasi masjid"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            placeholder="Cari kota untuk lokasi masjid..."
            className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 py-2.5 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
          />
=======
        {/* Search input */}
        <div ref={searchRef} className="relative mb-3">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Cari kota untuk lokasi masjid"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            placeholder="Cari kota untuk lokasi masjid..."
            className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 py-2.5 pl-9 pr-9 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => {
                setSearchQuery("");
                setShowSearch(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <XIcon size={14} />
            </button>
          )}
>>>>>>> REPLACE
```

3. **Add UX learnings to journal `.jules/palette.md` using `run_in_bash_session`**
   - `cat << 'EOF' >> .jules/palette.md`
```
## 2025-08-10 - Search Input Clear Buttons
**Learning:** Found multiple search inputs lacking a quick way to clear text. This hurts usability, especially for mobile users or screen reader users who have to manually delete long queries.
**Action:** Added a conditionally rendered clear button (`XIcon`) inside search inputs, ensuring proper right padding (`pr-9`), `aria-label`, and `type="button"`. Crucially, added focus management (`ref.current?.focus()`) so keyboard users remain in context after clearing, and avoided rendering during loading states to prevent layout collisions.
