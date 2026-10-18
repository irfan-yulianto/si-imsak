## 2025-02-28 - Fast string parsing
**Learning:** Using `.split("-").map(Number)` allocates intermediate arrays which incurs a performance penalty when parsing many short standard fixed-format string like ISO dates or time strings.
**Action:** Use string `.substring(start, end)` together with the unary `+` operator to avoid arrays for parsing standard date and time strings.
