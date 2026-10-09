## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-10-24 - Make anchor targets focusable
**Learning:** When using in-page skip links (like "Masjid Terdekat" linking to `#panel-masjid`), if the target container lacks `tabIndex={-1}`, clicking the link visually scrolls but fails to move keyboard focus. This breaks keyboard navigation, forcing users to tab from the top of the page again.
**Action:** Always ensure that structural container elements targeted by skip links have `tabIndex={-1}` and `focus:outline-none` so they can receive programmatic focus without displaying an ugly focus ring.
