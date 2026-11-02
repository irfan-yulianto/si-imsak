## 2024-05-24 - String Parsing in Tight Loops
**Learning:** Using `.split().map(Number)` for fixed-format strings (like ISO dates `YYYY-MM-DD` or `HH:mm`) in tight loops causes significant overhead due to intermediate array allocations.
**Action:** Use `.substring()` with the unary `+` operator instead for parsing fixed-format strings. Ensure inputs are strictly zero-padded to avoid parsing `NaN`.
