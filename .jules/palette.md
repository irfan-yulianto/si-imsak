
## 2024-05-13 - Add Clear Search Button
**Learning:** Adding a clear search button inside input fields significantly improves the mobile UX by saving users from repeatedly hitting backspace. The key to implementing this well is dynamically showing it only when there is input (`query.length > 0`), ensuring right-padding (`pr-9`) is sufficient to avoid overlapping with text, and using `aria-label` with keyboard-friendly interactions (returning focus to the input upon clearing).
**Action:** Always consider if a text input would benefit from a quick clear button, especially for search inputs where users might rapidly change their queries.
