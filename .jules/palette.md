## 2026-10-13 - Tooltips on disabled buttons
**Learning:** Native disabled buttons suppress pointer events, preventing tooltips (like the `title` attribute) from appearing on hover.
**Action:** When providing an explanatory tooltip for disabled interactive elements, wrap the disabled element in a `span` (e.g., `<span className="flex" title="...">`) so the tooltip can be triggered on the wrapper.
