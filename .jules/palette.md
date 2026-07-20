## 2024-07-20 - Conditional clear button in search input
**Learning:** Adding a clear button to a search input significantly improves UX by providing a quick way to empty the field. It's crucial to conditionally hide the clear button when the loading spinner is active to avoid visual collision, add proper padding (`pr-9`) to prevent text overlap, set `type="button"` to avoid form submission, and return focus to the input via `ref` to maintain keyboard accessibility.
**Action:** Always conditionally render clear buttons away from loading states and ensure focus management via React refs.
