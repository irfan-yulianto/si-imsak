## 2024-05-04 - Missing aria-labels on search inputs
**Learning:** Search inputs across the application (e.g., in LocationSearch and MosqueFinder) rely solely on the `placeholder` attribute for context. Screen readers do not reliably read `placeholder` text as an accessible name, making these fields inaccessible to visually impaired users.
**Action:** Always add an explicit `aria-label` or a visible `<label>` to all input fields, especially when relying on placeholders for visual context.
