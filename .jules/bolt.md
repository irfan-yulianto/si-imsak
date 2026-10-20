## 2025-02-20 - Fast string parsing
**Learning:** Using `split("-").map(Number)` on fixed-format strings (like ISO dates `YYYY-MM-DD` or zero-padded times `HH:mm`) inside tight loops is inefficient due to intermediate array allocations.
**Action:** Use `.substring()` with the unary `+` operator instead for measurable performance gains without sacrificing correctness.
