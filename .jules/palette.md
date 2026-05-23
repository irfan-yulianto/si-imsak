## 2024-05-18 - Search Input Clear Button
**Learning:** For a clean search input micro-UX pattern, dynamically rendering a clear button when text is entered requires specific handling: adding adequate right padding (e.g., `pr-9`) prevents text overlap with the button. Focus should gracefully return to the input when the user activates the clear button.
**Action:** Always add `aria-label` to clear buttons, hide them during loading states to prevent icon overlap with the spinner, and implement `inputRef.current?.focus()` after clearing to maintain smooth keyboard navigation.
