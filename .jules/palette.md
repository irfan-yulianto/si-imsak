## 2024-07-31 - Search Input Clear Button
**Learning:** Users often need to clear search inputs quickly. When adding a clear button, it is critical to hide it during loading states to prevent layout shifts, use `type="button"` to avoid accidental form submission, ensure right padding (`pr-9`) so text doesn't overlap the button, and use a ref to restore focus back to the input after clearing to maintain keyboard accessibility.
**Action:** Always follow the clear-button accessibility pattern (pr-9 padding, type="button", hide on load, and restore focus via ref) when implementing search inputs.
