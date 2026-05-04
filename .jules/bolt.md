## 2024-05-04 - Pre-computing Schedule Data
**Learning:** Redundant string manipulations (e.g., `split()`) and date lookups (e.g., `getHijriParts`) inside the render loop for both mobile and desktop views cause unnecessary calculations.
**Action:** Pre-compute an array of enriched `ProcessedScheduleDay` objects in a single `useMemo` hook in the parent component and pass this data to child components to eliminate redundant calculations during render.
