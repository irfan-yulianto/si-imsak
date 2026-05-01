## 2024-05-01 - Added ARIA Labels to Search Inputs
**Learning:** This codebase frequently relies on `placeholder` attributes for search inputs instead of visible `<label>` elements or `aria-label` attributes. As placeholders are not reliably read by screen readers, this pattern creates accessibility barriers.
**Action:** Ensure all future `<input>` elements, particularly those used for search functionalities, include a clear `aria-label` or visible `<label>` to maintain screen-reader compatibility.
