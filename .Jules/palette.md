## 2025-06-21 - Clear button standard for search inputs
**Learning:** For optimal UX and accessibility in conditional UI components like clear buttons in search inputs, preventing layout collisions with loading states is critical.
**Action:** Always add adequate right padding (e.g., `pr-9`) to the input to prevent text overlap, conditionally hide the button during loading states (e.g., `isSearching`), and return focus to the input (`ref.current?.focus()`) upon clearing to maintain keyboard navigation.
