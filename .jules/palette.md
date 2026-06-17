
## 2024-06-17 - Add accessible clear button to search inputs
**Learning:** For inputs with conditional internal action buttons (like an `XIcon` for clearing), relying only on conditional rendering (`query.length > 0`) is not enough for good UX. Adequate inner padding (`pr-9`) is required to prevent typed text from underlapping the absolute positioned clear button. Additionally, the button must manage focus back to the input upon click to preserve keyboard flow, and the ARIA label should be localized (e.g., `Hapus pencarian`).
**Action:** Always add `aria-label` with localized strings, explicit padding adjustments, and `inputRef.current?.focus()` when implementing micro-interactions like search input clear buttons.
