## 2024-05-20 - Ensure Inputs Have ARIA Labels

**Learning:** Relying solely on `placeholder` attributes for input fields is insufficient for accessibility because screen readers do not always read placeholders consistently, and the placeholder text disappears once the user begins typing, leaving users with cognitive disabilities without context.
**Action:** Always provide an explicit `aria-label` attribute (or a visible associated `<label>`) on input fields, especially search inputs, to ensure their purpose is clear to all users regardless of state.
