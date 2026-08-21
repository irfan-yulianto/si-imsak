## 2024-07-01 - Add Clear Button to Search Inputs
**Learning:** React search inputs without clear buttons force users to manually delete text, which is a poor UX on mobile. Adding an absolute positioned clear button within the input container improves usability significantly. Must handle loading state overlaps and restore focus.
**Action:** Always include a conditional clear button for search inputs, ensuring proper right padding (`pr-9`), focus restoration (`ref.current?.focus()`), and localized ARIA labels.
