## YYYY-MM-DD - Initial Creation
**Learning:** Initializing palette journal.
**Action:** None.

## 2026-06-09 - Adding Clear Buttons to Search Inputs
**Learning:** Adding clear buttons inside search inputs requires conditionally rendering them to avoid overlapping loading spinners, adding proper right padding (e.g., `pr-9`) to the input to prevent text overlap, and returning keyboard focus back to the input after clearing to ensure an accessible experience.
**Action:** When adding absolute-positioned clear buttons inside inputs, always use a `useRef` to restore focus on click, manage conditional rendering when the input has text and is not in a loading state, and verify appropriate input padding and localized ARIA labels.
