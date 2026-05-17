
## 2024-05-17 - Add Clear Button to Search Inputs
**Learning:** Adding micro-UX elements like absolute positioned clear buttons in search inputs requires careful handling of padding (e.g. `pr-9`) to prevent text overlap, conditional rendering to avoid layout collisions with loading spinners, and proper DOM ref management (`inputRef.current.focus()`) to return keyboard focus to the input element after clearing.
**Action:** Always verify `isSearching` loading states, apply adequate input padding, and manage keyboard accessibility via `aria-label` and `ref.focus()` when adding clear actions to text inputs.
