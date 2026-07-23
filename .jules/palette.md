## 2024-07-23 - Add clear button to location search
**Learning:** In search inputs, not having a clear button can be frustrating for users who make a typo. Adding a clear button enhances the search experience by reducing friction, but requires proper padding, right positioning, avoiding collision with loading states, and restoring focus to the input for accessibility.
**Action:** When adding clear buttons, use `useRef` to restore focus to the input, avoid collision with loaders, add adequate right padding, and provide an `aria-label`.
