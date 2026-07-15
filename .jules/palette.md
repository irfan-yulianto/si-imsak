## 2026-07-15 - Add Clear Button to Search Input
**Learning:** When adding conditional UI elements (like a clear button) inside inputs, ensuring sufficient right padding (`pr-9`) avoids text overlapping. Retaining focus on the input after clearing using a `useRef` ensures a continuous keyboard navigation flow.
**Action:** Always verify padding adjustments when layering interactive elements inside text inputs and restore focus after actionable inline clear operations.
