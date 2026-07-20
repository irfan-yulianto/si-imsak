## 2024-05-24 - Conditional Clear Buttons in Search Inputs
**Learning:** Adding a clear button to a search input improves UX, but it must be carefully implemented to avoid text overlap (requires right padding like `pr-9`), layout collisions with loading spinners, accidental form submissions (requires `type="button"`), and keyboard accessibility issues (requires focus restoration via a `useRef`).
**Action:** When adding conditional clear buttons to inputs, always verify padding, loading state exclusivity, button type, and focus restoration to the input.
