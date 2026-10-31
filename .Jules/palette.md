## 2025-03-01 - Add native tooltips to icon-only buttons
**Learning:** Icon-only buttons with ARIA labels are accessible to screen readers, but sighted users might not understand their purpose if the icon is ambiguous. Adding a native visual tooltip via the `title` attribute solves this without breaking accessibility.
**Action:** When creating icon-only buttons, automatically fallback the `title` attribute to the `aria-label` to provide a helpful tooltip for sighted users.
