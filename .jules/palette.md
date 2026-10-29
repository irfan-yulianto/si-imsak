## 2024-03-14 - [Add Tooltip to Icon Buttons]
**Learning:** Icon-only buttons often lack visual tooltips explaining their action for sighted users on desktop (hovering). We can use the required `aria-label` as a default fallback for the native `title` attribute.
**Action:** When a button only contains an icon and requires an `aria-label` for screen readers, also output a native `title` attribute so sighted mouse users can see what the button does on hover. Ensure manually provided `title` props are not overridden.
