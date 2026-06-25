## 2024-07-25 - Added Clear Button to Location Search
**Learning:** Adding a clear button to search inputs significantly improves usability, especially for mobile users who want to quickly enter a new query without manually deleting text character by character.
**Action:** When adding conditional clear buttons, ensure the input has adequate right padding (e.g., `pr-9` or similar) to prevent text overlap, and use a ref to return focus to the input after clearing to maintain keyboard accessibility.
