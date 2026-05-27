## 2024-05-27 - Add clear buttons to search inputs
**Learning:** Absolute positioned clear buttons in inputs often visually overlap with the text if the text is too long.
**Action:** When adding right-aligned absolute buttons inside inputs, always remember to add adequate right-padding (e.g. \`pr-9\`) to the input element to prevent overlap, and ensure keyboard focus is restored to the input upon clearing the text.
