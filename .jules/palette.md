## 2025-02-28 - Tooltips on Disabled Buttons
**Learning:** Native disabled buttons swallow pointer events, which prevents `title` tooltips from showing on hover.
**Action:** When providing an explanatory tooltip for disabled interactive elements, wrap the disabled element in a `span` (e.g., `<span className="flex" title="...">`) so the tooltip can appear.
