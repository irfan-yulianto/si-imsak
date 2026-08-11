## 2023-11-20 - Add XIcon for clear buttons
**Learning:** Adding clear buttons to search inputs improves accessibility and usability, particularly for mobile users to quickly clear their searches. Using existing layout patterns, the clear button should only appear when there is text and visually separate itself from other icons.
**Action:** Always conditionally render a clear button based on the input text length and make sure to restore focus to the input element via `ref.current?.focus()` after clearing to maintain keyboard accessibility.
