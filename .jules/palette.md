## 2024-05-24 - Search Input Clear Buttons
**Learning:** Keyboard-accessible clear buttons in search inputs are a quick win for accessibility and UX. Ensure the clear button uses `type="button"` to avoid form submissions, resets focus to the input (`inputRef.current?.focus()`), has adequate hit area, does not overlap text by ensuring adequate right padding (`pr-9`), and is hidden during loading states to prevent layout shifts.
**Action:** Always include conditional, accessible clear buttons with focus management on search inputs.
