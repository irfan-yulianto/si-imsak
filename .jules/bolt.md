## 2024-05-15 - Fast Fixed-Format String Parsing
**Learning:** Using `.split("-").map(Number)` in hot loops creates unnecessary array and object allocations that trigger garbage collection. In environments like background timers handling thousands of elements, this causes noticeable pauses.
**Action:** Replace `.split().map(Number)` with `.substring()` and the unary `+` operator for strictly fixed-format strings (like ISO dates `YYYY-MM-DD` or zero-padded times `HH:mm`) in tight loops.
