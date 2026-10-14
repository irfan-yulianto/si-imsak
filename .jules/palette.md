## 2024-10-14 - Provide tooltips for icon-only buttons
**Learning:** Icon-only buttons with aria-label are accessible to screen readers, but sighted users (or those using mouse hover without screen readers) lack context. The design system's Button component didn't automatically forward the accessible name to a visible title tooltip.
**Action:** Automatically use the aria-label as the title attribute for icon-only buttons (size="icon") so that it serves dual purposes: screen reader announcement and a native browser hover tooltip.
