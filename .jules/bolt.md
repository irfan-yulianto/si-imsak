## 2024-02-25 - Optimize String Parsing safely
**Learning:** Parsing fixed-format strings (like ISO dates `YYYY-MM-DD` or `HH:mm`) using `.split().map(Number)` allocates intermediate arrays, slowing down execution in tight loops or repeated calls. Hardcoding `.substring(0, 4)` is unsafe because strings might not be zero-padded.
**Action:** Use `.indexOf()` to find delimiters and then `.substring()` with the unary `+` operator. This handles both padded and non-padded formats safely and eliminates array allocations, significantly improving parsing performance.
