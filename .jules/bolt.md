## 2024-10-24 - [Avoid Array Allocations in Hot Path String Parsing]
**Learning:** Parsing fixed-format strings (like ISO dates YYYY-MM-DD and times HH:mm) inside loops or hooks using `.split("-").map(Number)` allocates intermediate arrays which incurs measurable performance overhead (e.g. ~490ms vs ~3ms for 1M iterations in V8).
**Action:** Use `.substring()` with the unary `+` operator instead of `.split().map(Number)` to eliminate array allocations and improve parsing performance of fixed-width ISO date/time strings, especially in code paths executing frequently.
