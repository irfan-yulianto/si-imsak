## 2024-05-24 - Search Input Clear Buttons
**Learning:** When adding conditional clear buttons to search inputs, using `useRef` to return focus to the input is critical for maintaining keyboard accessibility, as conditional rendering changes DOM structure making relative queries unreliable.
**Action:** Always attach a `useRef` to inputs and use `ref.current?.focus()` when implementing clear/reset buttons, and ensure adequate padding (e.g., `pr-9`) prevents text-button overlap.
