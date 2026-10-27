## 2024-10-27 - Add title tooltips to icon-only buttons
**Learning:** Icon-only buttons often have an aria-label for accessibility, but lack visual tooltips for sighted users, which can make their function unclear if the icon isn't universally understood.
**Action:** Automatically map the required `aria-label` on icon-only buttons to the native `title` attribute to provide a visual tooltip by default, improving usability for sighted users without extra developer effort.
