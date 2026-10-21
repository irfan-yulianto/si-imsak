## 2024-10-21 - [ARIA Attributes on Icon-Only Buttons]
**Learning:** Icon-only buttons should not only have an \`aria-label\` for screen readers, but also a matching \`title\` attribute so that a native browser tooltip is shown on hover for sighted users.
**Action:** Add \`title\` attribute matching \`aria-label\` to \`Button\` components when \`size="icon"\` to ensure sighted users also get context.
