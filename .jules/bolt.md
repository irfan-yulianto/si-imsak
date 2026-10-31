## 2026-10-31 - Optimize fixed-format string parsing
**Learning:** In hot loops like schedule calculations, `.split("-").map(Number)` on fixed-length strings (like ISO dates `YYYY-MM-DD` and `HH:mm`) creates unnecessary intermediate array allocations, slowing down execution significantly compared to primitive string manipulation.
**Action:** Use `.substring()` combined with the unary `+` operator for parsing strict fixed-format string structures in tight loops to boost performance and reduce memory churn.
