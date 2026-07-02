## 2024-07-02 - Add clear button to LocationSearch
**Learning:** Forms/search inputs without clear buttons are less usable, and relying only on the Escape key is hidden functionality. The clear button should restore focus to the input for immediate continued interaction.
**Action:** Add an accessible, conditionally rendered clear button to the search input, using an X mark icon with proper ARIA labels. Ensure focus is restored to the input upon clearing, and avoid structural shifts.
