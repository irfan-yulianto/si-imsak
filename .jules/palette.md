## 2024-10-28 - Native Tooltips for Icon-Only Buttons
**Learning:** Icon-only buttons with `aria-label`s are accessible to screen readers, but sighted users relying on a mouse may not understand their purpose without a visual tooltip. Auto-generating a `title` attribute from the `aria-label` provides a native tooltip fallback.
**Action:** Implemented a default fallback for `title` in the `Button` component when `size="icon"`. Ensured that explicit `title` attributes take precedence by spreading `{...props}` *after* the fallback.
