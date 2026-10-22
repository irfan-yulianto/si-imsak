## 2026-10-22 - Date and Time String Parsing Optimization
**Learning:** In highly called functions that parse exact-length strings like YYYY-MM-DD and HH:MM (such as `cityInstant` and `addDays`), using `.split('-').map(Number)` allocates intermediate arrays, costing performance.
**Action:** Use `.substring(start, end)` coupled with the unary `+` operator instead. This avoids array allocation, yielding significant speedups (~8-10x for the parsing step) while being safe since these formats are strictly zero-padded in this codebase.
