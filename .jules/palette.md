# Palette Journal
## 2024-05-24 - Add Clear Button to Search Inputs
**Learning:** Conditionally rendering clear buttons in search inputs can cause layout shifts and focus issues if not handled carefully, especially when competing with loading spinners for the same visual space.
**Action:** Ensure clear buttons have `type="button"`, return focus to the input via `useRef` after clearing, increase the input's right padding (`pr-9`), and conditionally hide the clear button when a loading spinner is active to prevent overlap.
