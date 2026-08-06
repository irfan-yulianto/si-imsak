## 2024-08-06 - Initial Observation
**Learning:** Found several search inputs in `LocationSearch.tsx` and `MosqueFinder.tsx` that lack a clear button (X) when users have typed text. The inputs are quite small, and deleting text manually is cumbersome. Also, `LocationSearch.tsx` lacks a clear error when a location is not found.
**Action:** Enhance one of these search inputs by adding a conditionally rendered "X" (clear) button. This is a common and highly requested UX improvement.
