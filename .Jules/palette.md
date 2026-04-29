## 2024-05-18 - Missing ARIA Labels on Search Inputs
**Learning:** In this application, search inputs were relying entirely on the `placeholder` attribute for context, which is an accessibility anti-pattern as screen readers may not read placeholders reliably.
**Action:** Always ensure search or free-text inputs without a visible `<label>` include a descriptive `aria-label` to provide context for assistive technologies.
