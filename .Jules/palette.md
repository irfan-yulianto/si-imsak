## 2024-03-22 - Icon-only buttons need native tooltips
**Learning:** Icon-only buttons with `aria-label` for screen readers also need a `title` attribute so sighted users can see a native tooltip on hover. By extracting the `aria-label` and auto-generating a fallback `title` (while allowing explicit `title` to override), we can improve accessibility without burdening developers.
**Action:** Always add a native `title` tooltip alongside `aria-label` for icon-only buttons, especially in reusable design system components.
