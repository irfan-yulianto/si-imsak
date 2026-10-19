## 2026-10-19 - Accessible Tooltips on Icon-Only Buttons
**Learning:** Icon-only buttons often use `aria-label` for screen readers, but sighted keyboard and mouse users also need to understand their purpose. Using both `aria-label` and `title` creates a native tooltip while preserving accessibility.
**Action:** Add matching `title` attributes whenever adding `aria-label` to icon-only buttons like those in MonthNav and Header.
