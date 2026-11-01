## 2024-03-24 - Add native title tooltips to icon-only buttons
**Learning:** Icon-only buttons with `aria-label` provide accessible names for screen readers, but sighted users might not understand their function without a visual tooltip.
**Action:** Automatically use `aria-label` as the `title` attribute for `Button` components when no explicit `title` is provided, providing native visual tooltips on hover.
