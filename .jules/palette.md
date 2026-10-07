## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add explicit focus-visible styles for keyboard accessibility
**Learning:** Interactive elements like buttons and links often lack visible focus indicators by default or when customized with Tailwind CSS, making keyboard navigation difficult for visually impaired or motor-impaired users. Adding explicit `focus-visible` styles ensures a clear, consistent focus ring only when navigating via keyboard.
**Action:** When creating interactive elements (buttons, links, inputs), proactively include `focus:outline-none focus-visible:ring-2 focus-visible:ring-[color]-500` classes to guarantee keyboard accessibility without compromising mouse interaction aesthetics.
