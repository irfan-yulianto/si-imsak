## 2023-11-09 - Optimized array spread in findCityCoords
**Learning:** In `src/lib/cities.ts`, `findCityCoords` used array spread `[...(existing ?? []), newItem]` inside a loop to dynamically initialize a Map over 500+ items. This causes O(N^2) memory allocations instead of O(N).
**Action:** Replaced array spreading with `.push()` in-place update for dynamically initialized map items inside loops to reduce garbage collection overhead and improve initialization speed.
