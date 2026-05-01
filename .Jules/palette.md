## 2023-10-27 - Aria-labels for placeholder-only inputs
**Learning:** React search inputs that rely solely on `placeholder` attributes (e.g. `LocationSearch.tsx` and `MosqueFinder.tsx`) are not reliably read by all screen readers. Providing an explicit `aria-label` ensures keyboard and screen reader users can identify the input purpose.
**Action:** Always add an `aria-label` to inputs lacking an explicitly associated visible `<label>`, even if a placeholder visually communicates the intent.
