## 2024-07-03 - Added clear button to Location Search
**Learning:** Conditionally rendered clear buttons in search inputs can cause focus management issues if the input element isn't directly referenced (e.g. relying on previousElementSibling), especially when loading spinners briefly alter the DOM structure.
**Action:** Always use a React useRef for inputs that have conditionally rendered sibling interactive elements, to ensure robust focus restoration (e.g. inputRef.current?.focus()) after actions like clearing the text.
