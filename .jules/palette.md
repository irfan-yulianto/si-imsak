## 2023-08-14 - Add clear button to search inputs
**Learning:** In the `LocationSearch` component, users often need to clear the search query if they make a typo or want to start a new search. Currently, there is no easy way to clear the input without manually deleting the text. Adding a clear button (an 'X' icon) inside the input field will improve usability, especially on mobile devices.
**Action:** Add a conditionally rendered clear button to search inputs that appears when there is text, allowing users to quickly clear the input and return focus.
