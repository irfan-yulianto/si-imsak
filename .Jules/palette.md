## 2024-03-12 - Add native tooltip to icon-only buttons
**Learning:** Icon-only buttons often provide aria-labels for screen readers but lack visual tooltips for sighted users on hover. Mapping aria-label to the title attribute gracefully bridges this gap without additional props.
**Action:** When implementing or modifying an icon-only button component, ensure the aria-label is also used to populate the native title attribute by default.
