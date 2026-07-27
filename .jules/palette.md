## 2024-07-27 - Location Search Clear Button
**Learning:** Users typing long location names without a clear button must hold backspace or select all text to search for a new city, adding friction to a core action.
**Action:** Always add a clear (`X`) button to search inputs to provide a 1-click reset path. Ensure the button resets focus to the input via `useRef` for keyboard accessibility.
