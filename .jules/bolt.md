## 2025-02-21 - Prevent redundant target checks in useNextPrayer
**Learning:** The `useNextPrayer` hook runs a `setInterval` loop every 3 seconds to re-calculate the next prayer target, passing down into `getNextPrayer` which loops over prayers and computes `cityInstant`. This is redundant when the previous target is still in the future.
**Action:** Added an early return using `nowMs < targetRef.current.targetMs` to skip redundant computation while preserving the expiration check.
