## 2024-05-18 - Added Clear Buttons to Search Inputs
**Learning:** Users typing long queries on mobile find it tedious to backspace. Clear buttons improve UX, but must be carefully managed to avoid layout shifts (hide during loading), prevent accidental form submission (`type="button"`), and maintain focus accessibility.
**Action:** Implemented conditional clear buttons in search components (`LocationSearch`, `MosqueFinder`) ensuring they return focus to the input via a ref after clearing.
