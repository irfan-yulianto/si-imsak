## 2026-10-14 - Add hover tooltips to icon-only buttons
**Learning:** Icon-only buttons with `aria-label`s are accessible to screen readers, but sighted users lack context without a visual label.
**Action:** Automatically use the `aria-label` as the `title` attribute on icon-only buttons to provide a native hover tooltip.
