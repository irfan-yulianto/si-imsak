## 2024-10-12 - Tooltips for disabled pagination
**Learning:** Adding a title tooltip directly to a disabled button fails because native disabled buttons suppress pointer events and prevent the tooltip from appearing on hover.
**Action:** Wrap disabled interactive elements in a `<span title="...">` (with display flex/inline-flex) to provide an explanatory tooltip.
