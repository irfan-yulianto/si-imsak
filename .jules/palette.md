## 2024-05-30 - Added XIcon to design system
**Learning:** Adding a clear button (XIcon) inside search inputs improves micro-UX by allowing users to quickly clear their query, returning focus to the input for immediate retyping.
**Action:** Always include an accessible (aria-label="Hapus pencarian"), keyboard-navigable clear button for filtering large lists/search inputs, conditionally shown only when the input length is > 0 and not loading.
