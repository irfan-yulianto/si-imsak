## 2024-05-03 - Pre-computing complex list rendering data
**Learning:** Complex lists rendering data involving string manipulations, date conversions, and Hijri data lookups within the map loop directly affect React's rendering performance, causing redundant calculations on every render.
**Action:** Use a `useMemo` hook to enrich and pre-calculate all dynamic values for the data array before rendering, ensuring child components (wrapped in `React.memo()`) receive simple, primitive data and re-calculate only when the core data dependency changes.

## 2024-05-20 - Fast Tick Optimization in Countdown Timer
**Learning:** Found a performance bottleneck in the `CountdownTimer.tsx` where the 1-second `setInterval` loop was allocating new `Date` objects and doing heavy string parsing (`parseTimeToSeconds`) to recalculate current time boundaries every single tick.
**Action:** When working with continuous countdown timers, optimize the "hot path" loop by precomputing an absolute timestamp (`targetMs`) when the target changes, reducing the loop's work to simple arithmetic (`targetMs - now.getTime()`).

## 2026-04-28 - Antimeridian Wrap-around in Spatial Algorithms
**Learning:** When replacing full geographic formulas (like Haversine) with simpler, faster equirectangular approximations, longitude wrap-around at the antimeridian (180 / -180 degrees) is no longer natively handled by trigonometric functions. Naive arithmetic causes an artificial 360-degree jump that breaks nearest-neighbor searches in the Pacific.
**Action:** Always include wrap-around logic (`if (dLng > 180) dLng -= 360; else if (dLng < -180) dLng += 360;`) when computing raw longitude differences for Pythagorean approximations.

## 2024-05-24 - Haversine Pre-computation in Spatial Loops
**Learning:** Computing distances in a loop where one point (e.g., user location) remains constant means recalculating `Math.cos(lat1)` on every iteration needlessly. Furthermore, creating inline closures like `(deg) => deg * Math.PI / 180` and relying on module constants recalculations per loop execution affects high-throughput V8 engine performance.
**Action:** Extract constants (`Math.PI / 180`) to global scope, avoid dynamic closures in tight loops, and precompute scalar constant trigonometric values (like user latitude cosine) before the loop to pass them into utility functions.
