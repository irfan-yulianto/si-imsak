## 2024-10-16 - Eliminate array allocations in tight loops
**Learning:** Using `.split().map()` on fixed-format strings (like ISO dates `YYYY-MM-DD` and times `HH:mm`) inside frequently called functions creates intermediate array allocations that slow down execution significantly. `cityInstant` is called in a loop for every prayer key in `getNextPrayer` which itself runs periodically via `setInterval`.
**Action:** For fixed-length strings like dates and times, use `.substring()` combined with unary `+` to extract and parse integers directly without instantiating intermediate arrays.
