
## 2024-11-20 - Clear Buttons for Search Inputs
**Learning:** Conditional rendering of clear buttons on input fields can disrupt focus flow if not handled properly. When the button removes the text, it often removes itself from the DOM immediately, which means keyboard users lose focus if the focus isn't intentionally managed.
**Action:** Always attach a `useRef` to input elements that feature conditionally rendered clear buttons, and explicitly call `.focus()` on that ref when the clear action is triggered to maintain keyboard accessibility. Also, ensure the input field has adequate padding to avoid text overlap with the absolute positioned clear button.
