/**
 * A number that knows both its preview value (`v`, used by the SVG renderer) and the C++ expression that
 * produces it on the device (`e`, used by the lambda renderer). Constants fold; anything touching a sensor
 * expression stays symbolic. Widgets are written once, in terms of these.
 */
export interface N { v: number; e: string; k: boolean }

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(4)));
export const K = (n: number): N => ({ v: n, e: fmt(n), k: true });
/** A runtime value: `expr` is C++ evaluated on the device, `sim` is what the preview shows. */
export const S = (expr: string, sim: number): N => ({ v: sim, e: `(${expr})`, k: false });
const bin = (a: N, b: N, v: number, op: string): N => (a.k && b.k ? K(v) : { v, e: `(${a.e} ${op} ${b.e})`, k: false });
export const add = (a: N, b: N) => bin(a, b, a.v + b.v, "+");
export const sub = (a: N, b: N) => bin(a, b, a.v - b.v, "-");
export const mul = (a: N, b: N) => bin(a, b, a.v * b.v, "*");
export const div = (a: N, b: N) => bin(a, b, b.v === 0 ? 0 : a.v / b.v, "/");
export const lo = (a: N, b: N): N => (a.k && b.k ? K(Math.min(a.v, b.v)) : { v: Math.min(a.v, b.v), e: `fminf(${a.e}, ${b.e})`, k: false });
export const hi = (a: N, b: N): N => (a.k && b.k ? K(Math.max(a.v, b.v)) : { v: Math.max(a.v, b.v), e: `fmaxf(${a.e}, ${b.e})`, k: false });
export const clamp = (x: N, a: N, b: N) => hi(a, lo(x, b));
const RAD = Math.PI / 180;
export const cosd = (a: N): N => (a.k ? K(Math.cos(a.v * RAD)) : { v: Math.cos(a.v * RAD), e: `cosf(${a.e} * 0.0174533f)`, k: false });
export const sind = (a: N): N => (a.k ? K(Math.sin(a.v * RAD)) : { v: Math.sin(a.v * RAD), e: `sinf(${a.e} * 0.0174533f)`, k: false });
/** Boolean comparisons (v is 1 or 0). */
const cmp = (a: N, b: N, f: (x: number, y: number) => boolean, op: string): N => ({ v: f(a.v, b.v) ? 1 : 0, e: `(${a.e} ${op} ${b.e})`, k: a.k && b.k });
export const ge = (a: N, b: N) => cmp(a, b, (x, y) => x >= y, ">=");
export const lt = (a: N, b: N) => cmp(a, b, (x, y) => x < y, "<");
/** Fraction of `x` between `min` and `max`, clamped to 0..1. */
export const frac = (x: N, min: N, max: N) => clamp(div(sub(x, min), sub(max, min)), K(0), K(1));

export type Src = number | { expr: string; sim: number };
export const toN = (s: Src): N => (typeof s === "number" ? K(s) : S(s.expr, s.sim));
/** Replace the preview value of a source (keeps the expression). */
export const withSim = (s: Src, sim: number): Src => (typeof s === "number" ? sim : { expr: s.expr, sim });
