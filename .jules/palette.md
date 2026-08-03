## 2024-05-24 - Add Clear Button to Location Search Inputs
**Learning:** Search inputs for location often result in users needing to delete their entire search query when looking for a different city. Standard browser behavior isn't enough on mobile interfaces. Providing an explicit clear button `x` makes clearing queries faster and improves usability.
**Action:** Always provide a clear button (`x`) for location search inputs, ensuring proper focus management (using refs) and accessibility (ARIA labels, button type). Hide the button during loading states to prevent overlaps.
