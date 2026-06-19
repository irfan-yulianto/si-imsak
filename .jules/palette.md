## 2024-06-25 - Add Clear Buttons to Search Inputs
**Learning:** Including absolutely positioned clear buttons inside search input fields that dynamically appear when content is entered is a standard micro-UX interaction that prevents repetitive backspacing and enhances user flow.
**Action:** Always include localized `aria-label`s like "Hapus pencarian" on the clear button, pad the input field correctly (e.g., `pr-9`), and make sure to reset keyboard focus back to the input upon clicking the clear button so keyboard-only users don't lose context.
