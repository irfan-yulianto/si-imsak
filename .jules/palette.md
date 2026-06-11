## 2024-05-24 - Clear Buttons in Search Inputs
**Learning:** Users need a quick way to clear text in search inputs (LocationSearch and MosqueFinder). Added an XIcon that renders conditionally when input length > 0.
**Action:** Implemented clear buttons with appropriate ARIA labels and right-padding (pr-9) to prevent text overlap. Ensured keyboard accessibility by focusing the input after clearing.
