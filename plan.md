## Issue Analysis

The application has a `LocationSearch` component for finding cities and a `MosqueFinder` component that also includes a search input. Both inputs lack a "clear button" (an `x` icon) when the user has typed something, which is a common UX enhancement for search inputs. Adding a clear button helps users quickly clear their search queries.

I will implement a clear button to the `LocationSearch` input because it is a very common micro-UX pattern that saves clicks and keystrokes, and aligns perfectly with Palette's goal.

Since I am doing a UX improvement, I will:
1. Export the `XIcon` from `src/components/ui/Icons.tsx`
2. Add the `XIcon` import to `LocationSearch.tsx`
3. Add a clear button conditionally when the `query` length > 0 in `LocationSearch.tsx`.
4. Ensure the input padding on the right is adjusted to prevent overlap.
5. Apply a `useRef` to return focus to the input field after clicking "clear".
