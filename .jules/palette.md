## 2024-06-07 - Add clear button to search inputs
**Learning:** Search inputs in this app currently lack a clear mechanism to empty the query, which hinders keyboard accessibility and general UX. Adding an absolute positioned clear button (e.g., an XIcon) inside search inputs that conditionally renders when the query length is > 0 is a standard micro-UX pattern.
**Action:** Created `XIcon` in `src/components/ui/Icons.tsx` and used it to implement clear buttons in `LocationSearch.tsx` and `MosqueFinder.tsx`.
