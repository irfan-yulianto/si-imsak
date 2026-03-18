const HIJRI_MONTH_NAMES: Record<number, string> = {
  1: "Muharram",
  2: "Safar",
  3: "Rabi'ul Awwal",
  4: "Rabi'ul Akhir",
  5: "Jumadil Awwal",
  6: "Jumadil Akhir",
  7: "Rajab",
  8: "Sya'ban",
  9: "Ramadan",
  10: "Syawal",
  11: "Dzulqa'dah",
  12: "Dzulhijjah",
};

const hijriFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const hijriCache = new Map<string, { day: number; month: number; year: number }>();

function parseHijri(dateStr: string): { day: number; month: number; year: number } {
  const cached = hijriCache.get(dateStr);
  if (cached) return cached;

  try {
    const date = new Date(`${dateStr}T12:00:00Z`);
    if (isNaN(date.getTime())) return { day: 0, month: 0, year: 0 };
    const parts = hijriFormatter.formatToParts(date);
    let day = 0,
      month = 0,
      year = 0;
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      if (p.type === "day") day = parseInt(p.value, 10);
      else if (p.type === "month") month = parseInt(p.value, 10);
      else if (p.type === "year") year = parseInt(p.value, 10);
    }
    const result = { day, month, year };
    hijriCache.set(dateStr, result);
    return result;
  } catch {
    return { day: 0, month: 0, year: 0 };
  }
}

export interface HijriParts {
  day: number;
  month: number;
  monthName: string;
  year: number;
}

/** Returns structured Hijri date for any Gregorian date (YYYY-MM-DD). */
export function getHijriParts(dateStr: string): HijriParts {
  const { day, month, year } = parseHijri(dateStr);
  return { day, month, monthName: HIJRI_MONTH_NAMES[month] ?? "", year };
}

/** Returns human-readable Hijri date string, e.g. "1 Ramadan 1447H". */
export function getHijriDate(dateStr: string): string {
  const { day, monthName, year } = getHijriParts(dateStr);
  return `${day} ${monthName} ${year}H`;
}

export interface HijriMonthLabel {
  monthName: string;
  year: number;
}

/**
 * Returns the Hijri month name(s) within a given Gregorian month.
 * A Gregorian month can span two Hijri months.
 */
export function getHijriMonthsForGregorianMonth(
  gregYear: number,
  gregMonth: number
): HijriMonthLabel[] {
  const lastDay = new Date(gregYear, gregMonth, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const firstDateStr = `${gregYear}-${pad(gregMonth)}-01`;
  const lastDateStr = `${gregYear}-${pad(gregMonth)}-${pad(lastDay)}`;

  const first = parseHijri(firstDateStr);
  const last = parseHijri(lastDateStr);

  const result: HijriMonthLabel[] = [
    { monthName: HIJRI_MONTH_NAMES[first.month] ?? "", year: first.year },
  ];
  if (last.month !== first.month || last.year !== first.year) {
    result.push({ monthName: HIJRI_MONTH_NAMES[last.month] ?? "", year: last.year });
  }
  return result;
}
