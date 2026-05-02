## 2024-05-02 - Accessible Search Inputs
**Learning:** Found inputs relying solely on placeholders without proper ARIA labels. Screen readers don't reliably read placeholder text, meaning these inputs lacked accessible names.
**Action:** Added `aria-label` to these search inputs to ensure they are fully accessible to screen reader users.
