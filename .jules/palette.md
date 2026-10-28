## 2024-05-18 - [ARIA Fallback Title Tooltips]
**Learning:** Icon-only buttons with `aria-label`s are great for screen reader users, but sighted users might not understand what an icon means without text.
**Action:** When creating wrapper components (like `Button`) that accept `aria-label`, automatically add a matching `title` fallback attribute so that sighted users get a native tooltip.
