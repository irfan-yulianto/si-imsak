## 2024-05-24 - [Clear Search Button]
**Learning:** Adding a conditional clear button (`X`) to search inputs significantly improves keyboard accessibility and quick interactions, especially on mobile. It's crucial to hide it during loading states to prevent layout collisions, ensure adequate right padding on the input (`pr-9`), use `type="button"` to avoid form submission, and return focus to the input via a ref after clearing.
**Action:** Always add a clear button for text search inputs, ensuring proper state management, padding, and focus management using `useRef`.
