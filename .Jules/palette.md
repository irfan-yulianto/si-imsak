## 2024-03-20 - Adding native tooltips to icon-only buttons
**Learning:** Icon-only buttons often have an `aria-label` for screen readers, but sighted users might not understand what the button does. Adding a native HTML `title` attribute that matches the `aria-label` provides a built-in tooltip on hover, improving UX for sighted users without additional complex UI components.
**Action:** Automatically derive a `title` attribute from the `aria-label` in the base `Button` component if one is not explicitly provided, and apply this pattern to ensure all icon-only buttons have native tooltips.
