## 2024-07-11 - Add clear button to search inputs
**Learning:** When adding conditional clear buttons to search inputs, ensure the input has adequate right padding (e.g., `pr-9`) to prevent text overlap, explicitly set `type="button"` to prevent accidental form submissions, and use a ref (`ref.current?.focus()`) to return focus to the input after clearing to maintain keyboard accessibility.
**Action:** Add clear buttons to `LocationSearch.tsx` and `MosqueFinder.tsx` with appropriate styling, refs, and accessibility attributes.
