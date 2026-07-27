## 2024-07-27 - Location Search Input UX
**Learning:** Adding a clear button to search inputs allows users to quickly reset their query, which is a common pattern for search fields and improves keyboard accessibility (if they want to quickly start a new search without holding backspace).
**Action:** Always add a clear button (typically an 'X' icon) to search inputs that conditionally appears when there is input text. Ensure it is keyboard accessible, has an aria-label, and returns focus to the input after being clicked.
