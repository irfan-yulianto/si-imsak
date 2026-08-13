## 2025-05-18 - Clear Button for Search Input
**Learning:** Adding a clear button that retains focus on the input ensures users can immediately adjust their search queries without losing keyboard flow, addressing a common a11y drop-off point in location searches.
**Action:** Always ensure search input clear buttons use `type="button"` and actively call `inputRef.current?.focus()` after clearing.
