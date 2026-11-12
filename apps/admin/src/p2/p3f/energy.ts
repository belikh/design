/** Maths for D063 (tariff bands, battery state of charge) and D064 (comfort band). */
export type Band = { from: number; to: number; rate: number; name: string };
/** Tariff band for an hour 0..23; bands may wrap midnight (from > to). */
export const bandAt = (bands: Band[], hour: number) => bands.find((b) => (b.from <= b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to));
/** Energy (kWh, one value per hour) and cost per tariff band; costs sum to the total. */
export function tariffCost(kwhPerHour: number[], bands: Band[]) {
  const per = bands.map((b) => ({ name: b.name, kwh: 0, cost: 0 }));
  kwhPerHour.forEach((kwh, h) => { const b = bandAt(bands, h % 24); if (!b) return; const p = per[bands.indexOf(b)]; p.kwh += kwh; p.cost += kwh * b.rate; });
  return { per, kwh: per.reduce((a, b) => a + b.kwh, 0), cost: per.reduce((a, b) => a + b.cost, 0) };
}
/** Battery state of charge (kWh) from net power in kW per hour (positive = charging). Losses apply on the way in; the result is clamped to 0..capacity. */
export function socSeries(netKw: number[], capacityKwh: number, start: number, efficiency = 0.95) {
  const out = [Math.min(capacityKwh, Math.max(0, start))];
  for (const p of netKw) out.push(Math.min(capacityKwh, Math.max(0, out[out.length - 1] + (p > 0 ? p * efficiency : p / efficiency))));
  return out;
}
/** Share of readings inside a comfort rectangle. */
export function comfortFraction(pts: { t: number; rh: number }[], band: { tLo: number; tHi: number; rhLo: number; rhHi: number }) {
  return pts.length ? pts.filter((p) => p.t >= band.tLo && p.t <= band.tHi && p.rh >= band.rhLo && p.rh <= band.rhHi).length / pts.length : 0;
}
export const stack = (series: number[][]) => { const acc = (series[0] ?? []).map(() => 0); return series.map((s) => { const base = [...acc]; s.forEach((v, i) => (acc[i] += v)); return { base, top: [...acc] }; }); };
