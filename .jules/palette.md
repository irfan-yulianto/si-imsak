## 2024-03-24 - Missing Clear Button Pattern in Search Inputs
**Learning:** Search inputs in `LocationSearch.tsx` and `MosqueFinder.tsx` lack a way to quickly clear queries, which is a common micro-UX friction point. Since they are conditionally rendered based on query length, it's essential to include an accessible clear button inside the input container.
**Action:** Add an `XIcon` to `src/components/ui/Icons.tsx` to reuse across clear buttons. Implement the clear button with proper `aria-label`, correct padding, and ensuring focus returns to the input field on click.
