## 2024-05-03 - Pre-computing complex list rendering data
**Learning:** Complex lists rendering data involving string manipulations, date conversions, and Hijri data lookups within the map loop directly affect React's rendering performance, causing redundant calculations on every render.
**Action:** Use a `useMemo` hook to enrich and pre-calculate all dynamic values for the data array before rendering, ensuring child components (wrapped in `React.memo()`) receive simple, primitive data and re-calculate only when the core data dependency changes.

## 2024-05-20 - Fast Tick Optimization in Countdown Timer
**Learning:** Found a performance bottleneck in the `CountdownTimer.tsx` where the 1-second `setInterval` loop was allocating new `Date` objects and doing heavy string parsing (`parseTimeToSeconds`) to recalculate current time boundaries every single tick.
**Action:** When working with continuous countdown timers, optimize the "hot path" loop by precomputing an absolute timestamp (`targetMs`) when the target changes, reducing the loop's work to simple arithmetic (`targetMs - now.getTime()`).

## 2026-04-28 - Antimeridian Wrap-around in Spatial Algorithms
**Learning:** When replacing full geographic formulas (like Haversine) with simpler, faster equirectangular approximations, longitude wrap-around at the antimeridian (180 / -180 degrees) is no longer natively handled by trigonometric functions. Naive arithmetic causes an artificial 360-degree jump that breaks nearest-neighbor searches in the Pacific.
**Action:** Always include wrap-around logic (`if (dLng > 180) dLng -= 360; else if (dLng < -180) dLng += 360;`) when computing raw longitude differences for Pythagorean approximations.

## 2024-05-25 - Pre-computing unchanging data dependencies for intervals
**Learning:** Found a performance bottleneck in `TodayCard.tsx` where the 1-minute `setInterval` loop was doing redundant string parsing (`split(":")`) and math conversion on the same static schedule strings every single tick.
**Action:** When working with `setInterval` loops inside React components, always pull out and pre-calculate any unchanging data dependencies (e.g. using `useMemo`) outside the interval, leaving only the bare minimum fast comparison logic inside the tick.
## 2024-06-08 - Optimize static array filtering in React components
**Learning:** Using `Array.filter(...).slice(0, max)` on static datasets forces a full O(N) array scan, which can block the main thread during rapid user input, even with small datasets.
**Action:** Replace it with an explicit `for` loop with an early `break` when the maximum elements are found (O(K) lookups), and wrap the logic in an idiomatic debounce (`setTimeout` inside `useEffect`) to further protect the main thread during rapid typing.

## 2024-06-15 - Fast Padding Optimization in Countdown Timer Loop
**Learning:** Found that string allocations via `String().padStart()` create measurable overhead when executed in a hot path like a 1000ms `setInterval` tick loop, leading to more garbage collection.
**Action:** When formatting basic numbers in a high-frequency loop, use primitive comparisons and string concatenations (`num < 10 ? "0" + num : "" + num`) instead of complex built-in padding functions to drastically reduce execution time overhead.

## 2024-06-25 - Precomputing trigonometric values for geographic calculations
**Learning:** Computing geographic distances in a loop against a static user coordinate redundantly recalculates trigonometric functions and primitive math conversions (like degrees to radians) within each loop iteration. Memory allocation for closure functions inside these frequently called math routines further degrades V8 performance.
**Action:** When computing distances for many points against a single origin point (like nearest-neighbor searches), extract constant multipliers (like `TO_RAD`) to the module scope and precalculate origin-specific trigonometric values (e.g. `Math.cos(originLat)`) outside the processing loop. Passing these precalculated scalars significantly accelerates approximate equirectangular distance calculations.
