## 2024-10-25 - Native Tooltips for Icon-Only Buttons
**Learning:** Icon-only buttons with `aria-label` are accessible to screen readers, but sighted users lack context on hover. Adding a `title` attribute that mirrors the `aria-label` provides a native browser tooltip, enhancing usability for everyone.
**Action:** Automatically use `aria-label` as the fallback `title` for icon-only buttons if one isn't explicitly provided.
