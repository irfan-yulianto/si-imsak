## 2024-05-18 - Add clear buttons to search inputs
**Learning:** Adding conditional clear buttons to search inputs requires proper right padding (e.g., `pr-9`) to prevent text overlap, hiding during loading states to avoid layout collision, explicit `type="button"` to avoid form submission, and restoring focus with a React `useRef` to maintain keyboard accessibility.
**Action:** Always implement a dedicated React `useRef` (like `inputRef.current?.focus()`) when clearing inputs to restore focus, and ensure the input layout is padded correctly.
