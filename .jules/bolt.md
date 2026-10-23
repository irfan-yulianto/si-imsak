## 2023-10-23 - [String parsing performance]
**Learning:** Using `.split().map(Number)` for fixed-format strings (like ISO dates and times) introduces unnecessary array allocations that can be slow in tight loops.
**Action:** Replace them with `.substring()` and unary `+` operator for primitive math to improve performance.
