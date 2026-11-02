## 2026-11-02 - Testing Fake Timers
**Learning:** `vi.useFakeTimers` must be explicitly declared within blocks like `describe` if they rely on mocked current time, especially when functions like `Date.now()` determine cache eviction rules (`pinnedMonths`). Otherwise, the default system time is used, which can cause intermittent CI test failures as time passes.
**Action:** Always ensure `vi.useFakeTimers` is explicitly initialized for individual isolated test blocks that rely on relative date assumptions.
