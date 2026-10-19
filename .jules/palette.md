## 2025-02-13 - Icon Button Tooltips and Disabled Focus
**Learning:** Icon-only buttons need native visual tooltips (`title` attribute) for sighted users who may not understand the icon, matching the `aria-label` used for screen readers. Furthermore, disabled icon buttons lose their tooltips and keyboard focus if native `disabled` is used.
**Action:** Automatically map `aria-label` to `title` for icon buttons in the base component, and use `aria-disabled` instead of `disabled` to preserve focus and tooltips.
