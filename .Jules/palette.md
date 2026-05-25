## 2025-05-25 - Search Clear Button Micro-UX
**Learning:** For conditional UI elements inside interactive inputs (like a clear 'X' button inside a search bar), not adding proper padding to the input text causes overlapping when text reaches the button area, and failing to return focus back to the input after clearing breaks the keyboard navigation flow.
**Action:** When adding absolute positioned action buttons inside inputs, always adjust `pr-9` padding to the input and use `inputRef.current?.focus()` in the click handler to maintain accessibility and visual clarity.
