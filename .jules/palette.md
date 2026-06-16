## 2024-05-15 - Clear Button Micro-UX for Search Inputs
**Learning:** Adding a clear button (X icon) that only appears when input has value makes it much easier for mobile users to quickly start a new search without repeatedly pressing backspace.
**Action:** Reused the standard `XIcon` from `src/components/ui/Icons.tsx` (added it manually) and included an `aria-label` ("Hapus pencarian") along with focus management to return the focus to the input. Added proper right padding to prevent text overlap.
