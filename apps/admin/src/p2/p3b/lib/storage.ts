export type StorageClass = "standard" | "infrequent" | "archive";
export type Obj = { key: string; size: number; modified: string; type: string; cls: StorageClass; etag: string };
export type Entry = { id: string; kind: "folder" | "object"; name: string; key: string; size: number; modified: string; type: string; cls: StorageClass | ""; count?: number };
const mk = (key: string, size: number, day: number, type: string, cls: StorageClass = "standard"): Obj => ({ key, size, modified: `2026-${day > 30 ? "11" : "10"}-${String(day > 30 ? day - 30 : day).padStart(2, "0")}`, type, cls, etag: ((size * 2654435761) % 4294967296).toString(16).padStart(8, "0") });
export const BUCKETS: Record<string, Obj[]> = {
  "media-prod": [
    mk("photos/2026/hobart/IMG_0101.jpg", 3_200_000, 3, "image/jpeg"), mk("photos/2026/hobart/IMG_0102.jpg", 2_900_000, 4, "image/jpeg"), mk("photos/2026/perth/IMG_0201.jpg", 3_800_000, 9, "image/jpeg", "infrequent"),
    mk("photos/2025/old-site/IMG_0001.jpg", 2_100_000, 12, "image/jpeg", "archive"), mk("video/tour.mp4", 184_000_000, 15, "video/mp4"), mk("video/intro.webm", 22_000_000, 17, "video/webm", "infrequent"),
    mk("docs/handbook.pdf", 1_400_000, 20, "application/pdf"), mk("docs/specs/rev-a.pdf", 880_000, 22, "application/pdf"), mk("docs/specs/rev-b.pdf", 910_000, 31, "application/pdf"), mk("README.txt", 1_200, 1, "text/plain"),
  ],
  backups: [
    mk("db/2026-11-10.sql.gz", 612_000_000, 40, "application/gzip", "infrequent"), mk("db/2026-11-11.sql.gz", 618_000_000, 41, "application/gzip"), mk("db/2026-11-12.sql.gz", 621_000_000, 42, "application/gzip"),
    mk("config/hass-snapshot.tar", 41_000_000, 35, "application/x-tar", "archive"), mk("config/nginx.conf", 4_800, 33, "text/plain"),
  ],
};
/** List the immediate children of a prefix ("" or ending with "/"), like an S3 delimiter listing. */
export function listPrefix(objs: Obj[], prefix: string, query = ""): Entry[] {
  const folders = new Map<string, { size: number; count: number; modified: string }>(); const out: Entry[] = [];
  for (const o of objs) {
    if (!o.key.startsWith(prefix)) continue; const rest = o.key.slice(prefix.length); const i = rest.indexOf("/");
    if (i >= 0) { const f = rest.slice(0, i); const cur = folders.get(f) ?? { size: 0, count: 0, modified: "" }; folders.set(f, { size: cur.size + o.size, count: cur.count + 1, modified: o.modified > cur.modified ? o.modified : cur.modified }); }
    else out.push({ id: o.key, kind: "object", name: rest, key: o.key, size: o.size, modified: o.modified, type: o.type, cls: o.cls });
  }
  const fs: Entry[] = [...folders].map(([f, v]) => ({ id: `${prefix}${f}/`, kind: "folder", name: f, key: `${prefix}${f}/`, size: v.size, modified: v.modified, type: "folder", cls: "", count: v.count }));
  const q = query.trim().toLowerCase();
  return [...fs, ...out].filter((e) => !q || e.name.toLowerCase().includes(q));
}
export const crumbs = (prefix: string) => prefix.split("/").filter(Boolean).map((p, i, a) => ({ name: p, prefix: `${a.slice(0, i + 1).join("/")}/` }));
export const monthlyCost = (objs: Obj[]) => objs.reduce((s, o) => s + (o.size / 1e9) * (o.cls === "standard" ? 0.023 : o.cls === "infrequent" ? 0.0125 : 0.004), 0);
