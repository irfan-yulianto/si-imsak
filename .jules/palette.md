## 2024-03-20 - Fix native tooltip on disabled buttons
**Learning:** Adding an explanatory `title` tooltip to disabled icon buttons doesn't work correctly if you use the native `disabled` attribute, as disabled elements do not emit hover events for tooltips. Replacing native `disabled` with `aria-disabled="true"` preserves both accessibility and visual tooltips.
**Action:** Always prefer `aria-disabled` over `disabled` when you need a tooltip on a button, and manually intercept clicks in `onClick`. Ensure RTL tests use `toHaveAttribute("aria-disabled", "true")` instead of `toBeDisabled()`.
