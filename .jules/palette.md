## 2024-07-24 - Search Input Clear Button
**Learning:** Adding a clear button to search inputs significantly improves UX for users to quickly reset queries. Proper coordination with loading states and focus management is crucial for accessibility.
**Action:** Conditionally render clear buttons (hide during loading), ensure sufficient input padding (e.g., `pr-9`), use `type="button"`, and restore focus to the input via a React ref after clearing.
