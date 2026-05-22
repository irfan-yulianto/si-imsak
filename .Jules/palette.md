## YYYY-MM-DD - [Clear Buttons in Search Inputs]
**Learning:** Adding a clear button (an `XIcon`) to search inputs that appears when `query.length > 0` is a helpful micro-UX pattern for quick navigation. Ensure it has an `aria-label` for screen readers and enough padding-right on the input (e.g., `pr-8` or `pr-9`) so text does not overlap with the absolutely positioned icon.
**Action:** Reused the newly added `XIcon` across both `LocationSearch` and `MosqueFinder` inputs, keeping the accessibility intact.
