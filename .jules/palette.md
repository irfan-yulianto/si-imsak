## 2024-05-15 - [Add tooltip explaining disabled button state]
**Learning:** Native `disabled` attribute on buttons prevents them from receiving focus, which means screen reader users won't know the button exists and sighted keyboard users can't trigger native tooltips.
**Action:** Replace `disabled` with `aria-disabled="true"` and handle the inert state visually and functionally via CSS and event interception.
