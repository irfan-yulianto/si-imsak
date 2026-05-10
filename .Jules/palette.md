## 2024-05-10 - Clear button on Search Inputs
**Learning:** The memory highlighted that adding an absolute positioned clear button (an `XIcon`) inside search inputs that conditionally renders when query length > 0 is a standard, preferred micro-UX pattern for this application's interface. Also ensuring to add adequate right padding (`pr-8`) prevents text overlap with the icon.
**Action:** Added a clear button to search inputs in `LocationSearch.tsx` and `MosqueFinder.tsx` to improve the usability.
