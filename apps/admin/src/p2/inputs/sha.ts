// Dependency-free SHA-1 / SHA-256 / HMAC / base32 / base64 / TOTP, so TOTP and SSH fingerprints are deterministic and testable
// without Web Crypto (which is async and missing in some test environments). Not for password hashing.
const enc = new TextEncoder();
export const utf8 = (s: string) => enc.encode(s);
export const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

function pad(msg: Uint8Array): { buf: Uint8Array; dv: DataView } {
  const l = msg.length; const buf = new Uint8Array(((l + 9 + 63) >> 6) << 6); buf.set(msg); buf[l] = 0x80;
  const dv = new DataView(buf.buffer); dv.setUint32(buf.length - 8, Math.floor((l * 8) / 2 ** 32)); dv.setUint32(buf.length - 4, (l * 8) >>> 0);
  return { buf, dv };
}
const rol = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
const ror = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
const out32 = (h: number[]) => { const o = new Uint8Array(h.length * 4); const dv = new DataView(o.buffer); h.forEach((v, i) => dv.setUint32(i * 4, v >>> 0)); return o; };

export function sha1(msg: Uint8Array): Uint8Array {
  const h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]; const { buf, dv } = pad(msg); const w = new Uint32Array(80);
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; } else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; } else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; } else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rol(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0; e = d; d = c; c = rol(b, 30); b = a; a = t;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0; h[4] = (h[4] + e) >>> 0;
  }
  return out32(h);
}

// SHA-256 constants are the fractional parts of the cube/square roots of the first primes (computed, not typed).
const PRIMES = (() => { const p: number[] = []; for (let n = 2; p.length < 64; n++) if (p.every((q) => n % q)) p.push(n); return p; })();
const frac32 = (x: number) => Math.floor((x - Math.floor(x)) * 2 ** 32) >>> 0;
const K256 = PRIMES.map((p) => frac32(Math.cbrt(p))); const H256 = PRIMES.slice(0, 8).map((p) => frac32(Math.sqrt(p)));
export function sha256(msg: Uint8Array): Uint8Array {
  const h = [...H256]; const { buf, dv } = pad(msg); const w = new Uint32Array(64);
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) { const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3); const s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25); const ch = (e & f) ^ (~e & g); const t1 = (hh + (S1 >>> 0) + (ch >>> 0) + K256[i] + w[i]) >>> 0;
      const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22); const maj = (a & b) ^ (a & c) ^ (b & c); const t2 = ((S0 >>> 0) + (maj >>> 0)) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) >>> 0; });
  }
  return out32(h);
}

export function hmacSha1(key: Uint8Array, msg: Uint8Array): Uint8Array {
  let k = key; if (k.length > 64) k = sha1(k); const ik = new Uint8Array(64), ok = new Uint8Array(64); ik.fill(0x36); ok.fill(0x5c); k.forEach((v, i) => { ik[i] ^= v; ok[i] ^= v; });
  const inner = sha1(Uint8Array.from([...ik, ...msg])); return sha1(Uint8Array.from([...ok, ...inner]));
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Encode(b: Uint8Array): string { let bits = 0, val = 0, out = ""; for (const x of b) { val = (val << 8) | x; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += B32[(val << (5 - bits)) & 31]; return out; }
export function base32Decode(s: string): Uint8Array { const clean = s.toUpperCase().replace(/[\s=-]/g, ""); let bits = 0, val = 0; const out: number[] = []; for (const ch of clean) { const i = B32.indexOf(ch); if (i < 0) throw new Error(`Invalid base32 character "${ch}"`); val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Uint8Array.from(out); }
export const b64decode = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const b64encodeNoPad = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/=+$/, "");

/** RFC 6238 TOTP (HMAC-SHA1). `time` in seconds since the epoch. */
export function totp(secretBase32: string, time: number, { step = 30, digits = 6 }: { step?: number; digits?: number } = {}): string {
  const counter = Math.floor(time / step); const msg = new Uint8Array(8); const dv = new DataView(msg.buffer); dv.setUint32(0, Math.floor(counter / 2 ** 32)); dv.setUint32(4, counter >>> 0);
  const h = hmacSha1(base32Decode(secretBase32), msg); const o = h[h.length - 1] & 15; const code = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 10 ** digits;
  return String(code).padStart(digits, "0");
}
