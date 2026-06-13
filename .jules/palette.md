## $(date +%Y-%m-%d) - Adding a Clear Button for Search Inputs
**Learning:** Adding an absolute-positioned clear button (`XIcon`) inside search inputs that conditionally renders when the query length is > 0 is a standard micro-UX pattern. It significantly improves usability for text inputs.
**Action:** When implementing this pattern, ensure to:
1. Add adequate right padding (e.g., `pr-9`) to the input to prevent text overlap with the button.
2. Conditionally hide the clear button during loading states (e.g., `isSearching`) to avoid layout collisions with spinners.
3. Use a clear, localized `aria-label` (e.g., "Hapus pencarian") for accessibility.
4. Set `type="button"` to prevent accidental form submissions.
5. Manage focus by using a `useRef` to return keyboard focus to the input immediately after it is cleared, ensuring a seamless keyboard navigation experience.
