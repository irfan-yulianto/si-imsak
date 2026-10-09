// Build timestamp for the end-to-end build: the last day of the previous month at
// 20:00 UTC. At that moment UTC is still on that day while WIB (UTC+7) is already on
// the 1st of the new month, so the hydration tests always cover a month boundary.
// Staying close to "now" keeps every test date inside the year range /api/schedule
// accepts (current year ±1).
function e2eBuildTime(now = Date.now()) {
  const today = new Date(now);
  // Day 0 of the current month is the last day of the previous one
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0, 20, 0, 0);
}

module.exports = { e2eBuildTime };

if (require.main === module) console.log(e2eBuildTime());
