## 2025-05-18 - Target Time Cache
**Learning:** Pre-calculating \`targetTimeMs\` instead of recalculating from current time each tick inside the interval avoids doing date/time parsing multiple times every second.
**Action:** Always pre-calculate and store the absolute target time for simple arithmetics inside fast-running loops.
