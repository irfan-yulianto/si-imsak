## 2026-11-02 - Icon Button Tooltips
**Learning:** Icon-only buttons with `aria-label` are accessible for screen readers, but sighted users lack visual context for the button's action without a tooltip.
**Action:** Automatically map `aria-label` to the `title` attribute for icon-only buttons in the base component to provide a native hover tooltip, ensuring sighted users receive the same context.
