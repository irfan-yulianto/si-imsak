## 2024-07-09 - Add clear button to search input
**Learning:** When adding a clear button to search inputs, it's critical to include right padding (`pr-9`) to prevent text overlapping, conditionally hide the button during loading states, explicitly set `type="button"` to prevent form submissions, and use a React `useRef` to programmatically restore focus to the input after clearing to maintain keyboard accessibility.
**Action:** Always add an explicit ref for focus restoration and sufficient padding when injecting interactive elements inside input fields.
