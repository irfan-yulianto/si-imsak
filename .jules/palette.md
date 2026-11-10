## 2024-11-10 - Accessible Disabled Buttons
**Learning:** Replacing native HTML `disabled` attributes with `aria-disabled="true"` preserves focusability for screen readers, allowing them to announce the button's "dimmed" or "disabled" state and read tooltips.
**Action:** When applying `aria-disabled="true"`, remember to handle its visual inertness with CSS (e.g., Tailwind's `aria-disabled:cursor-not-allowed`) and intercept the `onClick` event manually by checking the disabled condition and calling `e.preventDefault()` and `e.stopPropagation()`. Furthermore, if this technique is applied to a `<button type="submit">`, manual mitigation is required in the form's submission handler to block Enter key form submissions.

## 2024-11-10 - React Hydration Errors
**Learning:** React throws hydration errors when it encounters invalid HTML structures, such as rendering a block-level element like `<div>` inside an inline/text element like `<p>`. This can happen subtly when wrapper components that render divs (e.g., SVG icons mocked with divs in tests) are placed inside `<p>` tags.
**Action:** When creating container wrappers for interactive elements or icons that might render blocks, prefer using `<div>` or `<span>` instead of `<p>`.
