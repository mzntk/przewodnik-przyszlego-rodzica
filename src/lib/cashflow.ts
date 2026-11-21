import type { BenefitSegment } from "@/models/types";

/** Rozkłada okresy zasiłkowe na miesiące kalendarzowe (kwota = stawka dzienna × dni w miesiącu). */
export function monthlyCashflow(segments: BenefitSegment[], who?: "matka" | "ojciec") {
  const map = new Map<string, number>();
  for (const s of segments) {
    if (who && s.who !== who) continue;
    let t = Date.parse(s.from);
    const end = Date.parse(s.to);
    while (t <= end) {
      const key = new Date(t).toISOString().slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + s.dailyAmount);
      t += 86400000;
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));
}
