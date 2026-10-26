## 2024-03-24 - Auto-Tooltip for Icon Buttons
**Learning:** Found a recurring pattern where icon-only buttons with `aria-label`s lacked visual tooltips for sighted mouse users. Adding a fallback `title` attribute derived from the `aria-label` automatically improves discoverability globally.
**Action:** Applied to the base `Button.tsx` component so all `size="icon"` buttons inherit this behavior without needing to touch dozens of individual files. Used `aria-label in props` to ensure explicit `title` props can still override it.
