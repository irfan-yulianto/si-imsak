## 2024-05-18 - Added Clear button to Search inputs
**Learning:** Adding a clear button (X icon) to search inputs (like LocationSearch and MosqueFinder) significantly improves the UX, allowing users to quickly clear their search instead of hitting backspace repeatedly. This makes the interactions much smoother.
**Action:** Implemented an absolute positioned button with an `XIcon` that renders when the input's `query.length > 0`.
