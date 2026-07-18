## 2024-07-18 - Added Clear Input Button to Search Fields
**Learning:** Users can feel stuck and frustrated when trying to easily clear out a long search input to try another query. The lack of an easily accessible "clear" cross button in custom inputs causes unnecessary backspacing and harms accessibility.
**Action:** Implemented an accessible conditional cross icon button (`aria-label="Hapus pencarian"`) to clear input value within search fields and explicitly passed a `useRef` to `inputRef.current?.focus()` after clearing to maintain proper keyboard focus management.
