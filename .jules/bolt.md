## 2024-10-21 - [Optimizing Date/Time Parsing]
**Learning:** Parsing fixed-format strings (like ISO dates `YYYY-MM-DD` or zero-padded times `HH:mm`) in tight loops using `.split().map(Number)` causes unnecessary intermediate array allocations and performance hits.
**Action:** Use `.substring()` with the unary `+` operator instead of `.split().map(Number)` for parsing fixed-format strings. This eliminates intermediate array allocations and improves performance.
