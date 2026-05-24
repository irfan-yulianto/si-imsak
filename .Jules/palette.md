## 2024-05-24 - Input Clear Buttons
**Learning:** Search inputs often retain focus after clearing, which is good for accessibility, but an improperly positioned absolute clear button can overlap with the input text or loading spinners.
**Action:** Always add appropriate `padding-right` (e.g. `pr-9` or more) to inputs containing absolute-positioned icons or buttons, and conditionally hide the clear button when a loading spinner occupies the same visual space.
