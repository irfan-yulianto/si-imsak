## 2024-06-14 - Add accessible clear button to LocationSearch
**Learning:** Adding a clear button to search inputs provides immediate value for users correcting queries, but requires careful ARIA labeling ("Hapus pencarian") and focus management (returning focus to the input) to ensure full accessibility for screen readers and keyboard users.
**Action:** Always include localized `aria-label`s and use `ref.current?.focus()` when implementing icon-only utility buttons inside inputs.
