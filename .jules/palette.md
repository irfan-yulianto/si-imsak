## 2024-05-24 - Conditionally rendered clear buttons in search inputs
**Learning:** Tying the clear button's visibility to the active state of search dropdowns (e.g., `!showSearch`) hides it exactly when the user is actively typing and needs it most.
**Action:** When adding clear buttons, always ensure they are visible when `query.length > 0` regardless of dropdown state, hide them during loading states to prevent layout collisions, explicitly set `type="button"` to prevent accidental form submissions, and use a ref (`ref.current?.focus()`) to return focus to the input after clearing.
