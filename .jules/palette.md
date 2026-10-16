## 2024-10-16 - Add tooltips to icon-only buttons
**Learning:** Icon-only buttons with `aria-label` are accessible to screen readers, but sighted users lack visual feedback on their function when hovered. This pattern occurs across several components in this app.
**Action:** When adding `aria-label` to icon-only buttons, always accompany them with a matching `title` attribute so sighted users can also understand the button's action through a native browser tooltip.
