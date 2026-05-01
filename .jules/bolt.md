## 2025-02-28 - Fast Countdown Tick Optimization
**Learning:** In the CountdownTimer fast tick loop (every 1s), we are redundantly computing the current time and parsing targetTime using operations like getAdjustedTime, getLocalDate, and parseTimeToSeconds. This creates objects and runs logic every second that could be precomputed as an absolute timestamp targetMs, which would turn the hot loop into simple targetMs - Date.now().
**Action:** Optimize recurring intervals by precomputing target timestamp values so the interval loop only does simple subtraction.
