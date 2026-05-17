## 2024-05-17 - [Add clear buttons to search inputs]
**Learning:** Adding a clear button (X icon) to search inputs is a common micro-UX pattern, but it requires careful coordination: the input must have adequate right padding (`pr-9`) to prevent text from overlapping the button, the button must have an `aria-label` since it's icon-only, and clicking the button should return focus to the input (`ref.current?.focus()`) so users can immediately type a new query.
**Action:** Always include right padding, `aria-label`, and focus-returning logic when implementing clear buttons in text inputs.
