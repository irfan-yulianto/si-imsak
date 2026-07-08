## 2025-07-08 - Added Clear Button on Search Inputs
**Learning:** Users need a quick way to clear a search input and keep keyboard focus on it, especially when navigating search results.
**Action:** Always add an accessible clear button with `aria-label`, correct `type="button"`, and restore focus to the input via `ref.current?.focus()` when clicked.
