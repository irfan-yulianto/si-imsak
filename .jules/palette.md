## 2024-05-27 - Input Clear Buttons
**Learning:** Adding a clear button (X icon) to search inputs improves the usability for mobile users who want to clear their query quickly, but it's important to only show it when there's actually a query and handle focus appropriately.
**Action:** Always add an absolutely positioned clear button inside search inputs with conditional rendering (`query.length > 0`), ensuring proper right padding on the input (`pr-9`), accessible `aria-label`, and that clicking the button returns focus to the input via a `ref`.
