
## 2024-05-31 - Add clear button to search inputs
**Learning:** Adding a clear ('X') button to search inputs is a common micro-UX pattern, but implementing it accessibly requires ensuring the input wrapper accommodates the button (e.g. `pr-9`), the button is clearly labeled for screen readers (`aria-label="Hapus pencarian"`), and that focus is explicitly returned to the input element (`inputRef.current?.focus()`) after clearing, so keyboard users don't lose their place.
**Action:** Always include keyboard focus management and appropriate `aria-label` localized to the app's language when adding interactive micro-components like clear buttons.
