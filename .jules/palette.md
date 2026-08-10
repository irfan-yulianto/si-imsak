## 2025-08-10 - Search Input Clear Buttons
**Learning:** Found multiple search inputs lacking a quick way to clear text. This hurts usability, especially for mobile users or screen reader users who have to manually delete long queries.
**Action:** Added a conditionally rendered clear button (`XIcon`) inside search inputs, ensuring proper right padding (`pr-9`), `aria-label`, and `type="button"`. Crucially, added focus management (`ref.current?.focus()`) so keyboard users remain in context after clearing, and avoided rendering during loading states to prevent layout collisions.
