## 2024-05-24 - Auto-generating native tooltips for icon buttons
**Learning:** Icon-only buttons require an `aria-label` for screen readers, but sighted users also need context via native tooltips (the `title` attribute) which are often missed by developers.
**Action:** Automatically derive a `title` fallback from the `aria-label` when rendering icon-only buttons, spreading explicitly passed props after the fallback so manual overrides still work.
