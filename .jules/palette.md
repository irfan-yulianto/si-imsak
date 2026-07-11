## 2024-07-11 - Search input clear button accessibility
**Learning:** Conditionally rendered clear buttons inside search inputs must handle loading states (to avoid overlap with spinners) and use refs to restore focus after clearing, ensuring keyboard a11y.
**Action:** Always add adequate right padding (`pr-9`), explicitly hide the button during loading states, set `type="button"`, and use a React `useRef` to `focus()` the input after clearing.
