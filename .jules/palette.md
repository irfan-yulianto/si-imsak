## 2024-10-13 - Add Tooltips for Disabled Buttons
**Learning:** Native disabled buttons suppress pointer events, which prevents `title` tooltips from appearing on hover.
**Action:** When adding explanatory `title` tooltips to disabled interactive elements (like navigation buttons), wrap the element in a `span` (e.g. `<span className="flex shrink-0" title="...">`) to ensure the tooltip is still accessible even when the button is disabled.
