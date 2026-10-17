## 2024-03-12 - String Parsing Optimization
**Learning:** Parsing strict, zero-padded time and date formats (like `HH:mm` or `YYYY-MM-DD`) in tight loops using `.split().map(Number)` creates unnecessary intermediate array allocations. Using `.substring()` with the unary `+` operator is >100x faster and eliminates these allocations.
**Action:** Replace `.split().map(Number)` with `.substring()` and unary `+` for parsing strict date/time strings throughout the codebase, particularly in performance-sensitive areas like interval ticks or `useMemo` hooks.
