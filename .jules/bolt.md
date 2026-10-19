## 2024-10-19 - Fast fixed-format string parsing
**Learning:** Using `.split("-").map(Number)` for parsing fixed-format dates (like YYYY-MM-DD or HH:mm) is elegant but involves intermediate array allocations which can add up in tight loops (e.g. countdown timers checking every interval).
**Action:** Replace split-map with substring indexing and unary plus `+iso.substring(0, 4)` for static/zero-padded formats when executed frequently.
