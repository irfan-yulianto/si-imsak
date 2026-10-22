## 2026-10-22 - Tooltips for Icon-Only Buttons
**Learning:** Adding fallback `title` attributes using `aria-label` provides important native visual tooltips for sighted users on icon-only buttons, improving discoverability while preserving screen-reader functionality.
**Action:** When creating wrapper components (e.g., Button) and auto-generating fallback attributes (like `title={defaultTitle}`), ensure `{...props}` is spread *after* the fallback attributes in the JSX. This allows explicitly passed props to safely override the generated fallbacks.
