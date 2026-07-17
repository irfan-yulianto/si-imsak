## 2024-07-17 - Add Clear Search Button to LocationSearch

**Learning:** Missing clear search buttons in input fields with lots of results can lead to a frustrating experience when the user wants to re-type a query, forcing them to manually backspace everything. Providing an easily accessible "clear" button greatly enhances usability and efficiency.
**Action:** Implemented a clear input (`X`) button in the search field when there is active text to allow users to quickly clear the input. Included accessible attributes and ensured it returns focus to the input box after being clicked. Added proper right padding to prevent overlap.
