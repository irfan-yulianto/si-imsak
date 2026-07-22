
## 2024-05-24 - Clear buttons and input focus management
**Learning:** When conditionally rendering clear buttons inside inputs, the clear action removes the button from the DOM, causing focus to return to the `<body>` element. This degrades the keyboard navigation experience as users have to tab back to the input to type something new.
**Action:** Always maintain a `useRef` pointing to the input element. In the clear button's `onClick` handler, call `inputRef.current?.focus()` after clearing the state to ensure focus remains properly trapped in the input context.
