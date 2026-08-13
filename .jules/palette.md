## 2024-08-13 - Conditional Clear Buttons in Search Inputs
**Learning:** Adding clear buttons to search inputs requires careful handling of padding (e.g. pr-9 instead of pr-4), loading state collisions, explicitly setting `type="button"`, and maintaining accessibility by refocusing the input when clicked. Coupling visibility to `showSearch` makes the button disappear when the user is actively searching.
**Action:** When adding clear buttons, always adjust input padding, handle loading states, use `type="button"`, and use a ref to return focus to the input (`ref.current?.focus()`).
