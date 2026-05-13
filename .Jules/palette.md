
## 2024-05-13 - Add clear button to search input
**Learning:** Adding a micro-interaction like a clear "X" button to inputs is a huge UX win for mobile usability where repeatedly hitting backspace is tedious.
**Action:** When adding absolute-positioned buttons inside inputs, always verify that adequate padding (e.g., `pr-8`) is added to the `<input>` element so the user's text doesn't flow underneath the new button. Furthermore, always restore focus to the input (`ref.current.focus()`) after clearing, as the user likely intends to immediately type a new query.
