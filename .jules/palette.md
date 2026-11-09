# Palette's Journal
## 2024-05-12 - Preserving context for disabled buttons
**Learning:** Using the native `disabled` attribute removes buttons from the tab order and prevents hover tooltips, making it impossible for keyboard users and screen readers to discover them, and preventing mouse users from reading tooltips explaining why they are disabled.
**Action:** Use `aria-disabled="true"` instead of `disabled`. Intercept `onClick` to prevent action, and add a helpful `title` tooltip (e.g. appending "(Tidak tersedia)" to the `aria-label`) so users know why the action is unavailable. Update tests to use `.toHaveAttribute("aria-disabled", "true")`.
