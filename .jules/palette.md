## 2026-10-18 - Native tooltips on disabled icon buttons
**Learning:** Native `title` tooltips do not appear on buttons with the HTML `disabled` attribute in many browsers, making the reason for being disabled opaque and removing the button's name for sighted users.
**Action:** Use `aria-disabled="true"` instead of `disabled`, applying disabled styling via CSS (e.g. `aria-disabled:opacity-40`), and intercepting clicks via JS. This ensures tooltips remain accessible.
