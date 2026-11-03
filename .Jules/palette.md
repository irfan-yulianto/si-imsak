## 2024-03-24 - Native Tooltips for Icon Buttons
**Learning:** Icon-only buttons must have native visual tooltips (`title` attribute) in addition to screen reader labels (`aria-label`) to ensure sighted users understand the button's purpose without relying solely on the icon's visual metaphor.
**Action:** When implementing an icon-only button variant in a reusable component, auto-generate a fallback `title` attribute using the provided `aria-label` to guarantee visual accessibility by default, ensuring explicitly passed `title` props can still override it.
