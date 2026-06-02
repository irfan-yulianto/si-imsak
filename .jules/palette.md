## 2024-06-02 - Clear Buttons in Search Inputs
**Learning:** Adding a clear button (XIcon) to search inputs is a critical micro-UX pattern that saves users from repeatedly pressing backspace. It must include appropriate right-padding (`pr-9`) on the input to avoid text overlap, conditionally hide during loading states, and use an `aria-label` (localized to "Hapus pencarian") to maintain accessibility.
**Action:** Always verify search inputs have a clear mechanism, ensure keyboard focus returns to the input upon clearing (via `useRef`), and reuse the standardized `XIcon` from the UI library.
