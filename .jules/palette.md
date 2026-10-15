## 2024-10-15 - Tooltips for Disabled Pagination
**Learning:** Native disabled buttons suppress pointer events, so title tooltips don't show. Keyboard users also cannot access tooltips on disabled elements unless wrapped.
**Action:** Wrap disabled buttons in a `span` with a `title` attribute, and add a conditional `tabIndex={0}` to the span so keyboard users can focus and read the tooltip when the button itself is disabled.
