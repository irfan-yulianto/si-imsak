import { bench, describe } from 'vitest';
import { haversineDistance } from './lib/mosques';

const TO_RAD = Math.PI / 180;
const R = 6371000;

function haversineDistanceOptimized(lat1: number, lng1: number, lat2: number, lng2: number) {
  const lat1Rad = lat1 * TO_RAD;
  const lat2Rad = lat2 * TO_RAD;
  const dLat = lat2Rad - lat1Rad;

  let dLngDeg = lng2 - lng1;
  if (dLngDeg > 180) dLngDeg -= 360;
  else if (dLngDeg < -180) dLngDeg += 360;
  const dLng = dLngDeg * TO_RAD;

  const x = dLng * Math.cos((lat1Rad + lat2Rad) / 2);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
}

describe('haversineDistance', () => {
  bench('current implementation', () => {
    haversineDistance(-6.17, 106.85, -6.18, 106.86);
  });
  bench('optimized implementation', () => {
    haversineDistanceOptimized(-6.17, 106.85, -6.18, 106.86);
  });
});
