## 2025-02-28 - Next Prayer Interval Optimization
**Learning:** The background interval that recalculates the next prayer every 3000ms performs unnecessary date calculations and loop iterations when the cached target time hasn't passed yet.
**Action:** Always implement an early return based on expiration checking (e.g. comparing the current time to the cached target timestamp) for periodic background loops that wait for a specific time event, bypassing unnecessary calculations.
