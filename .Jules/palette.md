## 2025-02-28 - Clear Button Micro-UX
**Learning:** Added a standard micro-UX clear button (`XIcon`) inside search inputs (`LocationSearch` and `MosqueFinder`) that conditionally renders when `query.length > 0`. Ensuring adequate right padding (`pr-9`) is crucial to prevent the clear button from overlapping the typed text.
**Action:** When implementing clear buttons, always bind them to the input via `useRef` to programmatically restore focus after clearing, ensuring smooth keyboard navigation. Also, use appropriate ARIA labels (e.g., "Hapus pencarian") localized to the app's language.
