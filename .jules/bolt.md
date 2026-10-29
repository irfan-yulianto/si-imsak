## 2025-03-02 - Fast Parsing of Date/Time strings in tight loops
**Learning:** Parsing fixed-format strings (like ISO dates YYYY-MM-DD or zero-padded times HH:mm) using .split().map(Number) is slow because of intermediate array allocations.
**Action:** Replace .split().map(Number) with primitive string manipulation (.substring()) and the unary + operator in tight loops (like calculating timestamps) to improve performance significantly. Ensure inputs are strictly fixed-format to avoid parsing NaN.
