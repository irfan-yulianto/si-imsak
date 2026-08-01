## 2025-02-23 - Add Clear Button to Search Inputs
**Learning:** Conditionally rendering a clear button on search inputs improves UX by allowing users to quickly reset their query, but it requires returning focus back to the input element via a ref to maintain keyboard accessibility.
**Action:** Ensure search inputs have a clear button when populated, use a button with an `aria-label`, correct right padding (`pr-9`), and call `inputRef.current?.focus()` upon clearing.
