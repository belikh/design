import { describe, expect, it } from "vitest";
import { b64decode, base32Decode, hex, hmacSha1, sha1, sha256, totp, utf8 } from "./sha.ts";
import { qrEncode } from "./qr.ts";
import { abnValid, applyMask, bsbValid, checkUsername, entropyBits, formatCard, generatePassword, ibanValid, luhn, parseSshKey, demoEd25519, slugify } from "./logic-text.ts";
import { format, lint } from "./lint.ts";
import { convert, fiscalOf, fiscalRange, formatDuration, hoursOverlap, isoDate, parseAmount, parseDuration, parseNaturalDate, rebalance, simplifyRatio, tzOffsetMin, zonedToInstant } from "./logic-num.ts";
import { cidrContains, dnsIssue, fwRuleIssues, hostnameIssue, intToIpv4, ipv4ToInt, ipv6Valid, isCidr, normaliseMac, parseCidr, parsePorts, pfIssues, prefixForHosts, shadowed, splitSubnet, vlanIssue, vlsm, type FwRule } from "./logic-net.ts";
import { breaches, checkState, chunkPlan, completeness, diffFields, evalFilter, evalRule, folderTree, humanSize, matchTokens, normalisePerms, parseCsv, parseQuery, parseSchema, placeholderIssues, suggestMapping, toggleNode, validateSchema, type Schema, type TNode } from "./logic-data.ts";
import { haversineKm, coordIssue, searchAddresses } from "./geo.tsx";
import { checkImportUrl, ean13Valid, altTextIssues } from "./files.tsx";
import { stepErrors, resolveMode } from "./behaviour.tsx";

describe("crypto against published vectors", () => {
  it("SHA-1 and SHA-256", () => {
    expect(hex(sha1(utf8("abc")))).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(hex(sha256(utf8("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(utf8("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("HMAC-SHA1 (RFC 2202 case 2)", () => { expect(hex(hmacSha1(utf8("Jefe"), utf8("what do ya want for nothing?")))).toBe("effcdf6ae5eb2fa2d27416d5f184df9c259a7c79"); });
  it("TOTP (RFC 6238 SHA-1 vectors, 8 digits)", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"; // "12345678901234567890"
    expect(totp(secret, 59, { digits: 8 })).toBe("94287082"); expect(totp(secret, 1111111109, { digits: 8 })).toBe("07081804"); expect(totp(secret, 2000000000, { digits: 8 })).toBe("69279037");
    expect(new TextDecoder().decode(base32Decode(secret))).toBe("12345678901234567890");
  });
});
describe("QR", () => {
  it("makes a square symbol with finder patterns that grows with data", () => {
    const a = qrEncode("hi"), b = qrEncode("otpauth://totp/Jupiter:ava@example.com?secret=GEZDGNBVGY3TQOJQ&issuer=Jupiter");
    expect(a.length).toBe(a[0].length); expect(a.length).toBe(21); expect(b.length).toBeGreaterThan(a.length);
    for (const q of [a, b]) { expect(q[0].slice(0, 7).every(Boolean)).toBe(true); expect(q[3][3]).toBe(true); expect(q[1][1]).toBe(false); }
  });
  it("rejects data that is too long", () => { expect(() => qrEncode("x".repeat(400))).toThrow(); });
});
describe("masks and validators", () => {
  it("Luhn, IBAN, BSB, ABN", () => {
    expect(luhn("4111111111111111")).toBe(true); expect(luhn("4111111111111112")).toBe(false); expect(formatCard("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(ibanValid("GB82 WEST 1234 5698 7654 32")).toBe(true); expect(ibanValid("GB82 WEST 1234 5698 7654 33")).toBe(false);
    expect(bsbValid("123-456")).toBe(true); expect(bsbValid("12-456")).toBe(false);
    expect(abnValid("51 824 753 556")).toBe(true); expect(abnValid("51 824 753 557")).toBe(false);
  });
  it("applyMask only emits literals while more input follows", () => {
    expect(applyMask("0412345678", "#### ### ###").text).toBe("0412 345 678"); expect(applyMask("0412", "#### ### ###").text).toBe("0412");
    expect(applyMask("04123", "#### ### ###").text).toBe("0412 3"); expect(applyMask("0412345678", "#### ### ###").complete).toBe(true); expect(applyMask("04", "#### ### ###").complete).toBe(false);
  });
});
describe("generators and text helpers", () => {
  it("password honours options and entropy rises with length", () => {
    const pick = (n: number) => 7 % n; const p = generatePassword({ length: 16, upper: true, lower: true, digits: true, symbols: false, avoidAmbiguous: true }, pick);
    expect(p).toHaveLength(16); expect(/[O0Il1]/.test(p)).toBe(false); expect(/[^A-Za-z0-9]/.test(p)).toBe(false); expect(entropyBits("abcdefghijklmnop")).toBeGreaterThan(entropyBits("abcd"));
  });
  it("slug and username availability", () => {
    expect(slugify("  Quarterly Review: Q4 — Ünïcode! ")).toBe("quarterly-review-q4-unicode"); expect(checkUsername("admin").ok).toBe(false); expect(checkUsername("zz").ok).toBe(false); expect(checkUsername("brand-new").ok).toBe(true);
  });
  it("SSH fingerprint is SHA256 of the key blob, and bad keys are rejected", () => {
    const line = demoEd25519(7, "me"); const info = parseSshKey(line); expect(info.valid).toBe(true); expect(info.type).toBe("ED25519"); expect(info.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}$/);
    expect(info.fingerprint).toBe(`SHA256:${btoa(String.fromCharCode(...sha256(b64decode(line.split(" ")[1])))).replace(/=+$/, "")}`);
    expect(parseSshKey("ssh-rsa notbase64!!").valid).toBe(false); expect(parseSshKey("hello").valid).toBe(false);
  });
});
describe("lint and format", () => {
  it("flags JSON trailing commas and unquoted keys, and formats valid JSON", () => {
    expect(lint("json", '{"a": 1,}').some((i) => i.sev === "warn" || i.sev === "error")).toBe(true); expect(lint("json", '{"a": 1}')).toEqual([]);
    expect(format("json", '{"a":1,"b":[1,2]}')).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}\n');
  });
});
describe("numbers, money, time", () => {
  it("parseAmount understands suffixes and separators", () => { expect(parseAmount("12k")).toBe(12000); expect(parseAmount("1.5m")).toBe(1500000); expect(parseAmount("1,250.50")).toBe(1250.5); expect(Number.isNaN(parseAmount("abc"))).toBe(true); });
  it("durations round-trip", () => { expect(parseDuration("1h 30m")).toBe(5400); expect(parseDuration("1h30m")).toBe(5400); expect(parseDuration("01:30:00")).toBe(5400); expect(parseDuration("2d 3h")).toBe(2 * 86400 + 3 * 3600); expect(parseDuration("garbage")).toBeNull(); expect(formatDuration(5400)).toBe("1h 30m"); });
  it("unit conversion", () => { expect(convert(1, "m", "cm", "length")).toBeCloseTo(100); expect(convert(100, "°C", "°F", "temperature")).toBeCloseTo(212); expect(convert(0, "°C", "K", "temperature")).toBeCloseTo(273.15); expect(simplifyRatio(1920, 1080)).toEqual([16, 9]); });
  it("rebalance keeps the total at 100 and respects locks", () => {
    const r = rebalance([40, 30, 20, 10], 0, 70); expect(r.reduce((a, b) => a + b, 0)).toBe(100); expect(r[0]).toBe(70);
    const l = rebalance([40, 30, 20, 10], 0, 90, [false, true, false, false]); expect(l[1]).toBe(30); expect(l.reduce((a, b) => a + b, 0)).toBe(100); expect(l[0]).toBe(70);
  });
  const today = new Date(2026, 10, 12); // Thursday 12 Nov 2026
  it("natural dates against a fixed today", () => {
    const d = (s: string) => { const r = parseNaturalDate(s, today); return r ? isoDate(r) : null; };
    expect(d("today")).toBe("2026-11-12"); expect(d("tomorrow")).toBe("2026-11-13"); expect(d("next friday")).toBe("2026-11-20"); expect(d("in 2 weeks")).toBe("2026-11-26"); expect(d("2026-12-01")).toBe("2026-12-01"); expect(d("blah")).toBeNull();
  });
  it("Australian financial year", () => {
    expect(fiscalOf(new Date(2026, 6, 1)).fy).toBe(2027); expect(fiscalOf(new Date(2026, 5, 30)).fy).toBe(2026); expect(fiscalOf(today).quarter).toBe(2);
    const [a, b] = fiscalRange(2027); expect(isoDate(a)).toBe("2026-07-01"); expect(isoDate(b)).toBe("2027-06-30");
  });
  it("time zones include daylight saving at that date", () => {
    expect(tzOffsetMin("Australia/Brisbane", new Date(Date.UTC(2026, 0, 1)))).toBe(600); expect(tzOffsetMin("Australia/Sydney", new Date(Date.UTC(2026, 0, 1)))).toBe(660); expect(tzOffsetMin("Australia/Sydney", new Date(Date.UTC(2026, 6, 1)))).toBe(600);
    expect(zonedToInstant(2026, 11, 12, 9, 0, "Australia/Brisbane").toISOString()).toBe("2026-11-11T23:00:00.000Z");
  });
  it("working-hours overlap reflects the offset", () => {
    const wk = { mon: [540, 1020], tue: [540, 1020], wed: [540, 1020], thu: [540, 1020], fri: [540, 1020], sat: null, sun: null } as Record<string, [number, number] | null>;
    expect(hoursOverlap(wk, "Australia/Brisbane", wk, "Australia/Brisbane", today).mon).toEqual([540, 1020]);
    expect(hoursOverlap(wk, "Australia/Brisbane", wk, "Europe/London", today).mon).toBeNull();
    expect(hoursOverlap(wk, "Australia/Brisbane", wk, "Pacific/Auckland", today).mon).not.toBeNull();
  });
});
describe("network logic", () => {
  it("IPs", () => { expect(ipv4ToInt("10.0.0.1")).toBe(167772161); expect(ipv4ToInt("256.0.0.1")).toBeNull(); expect(intToIpv4(167772161)).toBe("10.0.0.1"); expect(ipv6Valid("2001:db8::1")).toBe(true); expect(ipv6Valid("2001::db8::1")).toBe(false); });
  it("CIDR maths", () => {
    const c = parseCidr("10.20.4.0/22"); expect(isCidr(c)).toBe(true); if (!isCidr(c)) return; expect(intToIpv4(c.broadcast)).toBe("10.20.7.255"); expect(c.hosts).toBe(1022); expect(intToIpv4(c.mask)).toBe("255.255.252.0"); expect(cidrContains(c, ipv4ToInt("10.20.5.77")!)).toBe(true); expect(cidrContains(c, ipv4ToInt("10.20.8.1")!)).toBe(false);
    expect(parseCidr("10.20.5.9/24")).toMatchObject({ normalised: "10.20.5.0/24", hostBitsSet: true }); expect(isCidr(parseCidr("10.0.0.0/33"))).toBe(false); expect(splitSubnet(c, 24)).toEqual(["10.20.4.0/24", "10.20.5.0/24", "10.20.6.0/24", "10.20.7.0/24"]);
  });
  it("VLSM packs largest first and reports overflow", () => {
    const p = parseCidr("10.20.4.0/22"); if (!isCidr(p)) throw new Error("bad"); expect(prefixForHosts(100)).toBe(25); const plan = vlsm(p, [{ name: "a", hosts: 100 }, { name: "b", hosts: 250 }]); expect(plan).toEqual([{ name: "b", hosts: 250, cidr: "10.20.4.0/24", usable: 254 }, { name: "a", hosts: 100, cidr: "10.20.5.0/25", usable: 126 }]);
    expect("error" in (vlsm(p, [{ name: "big", hosts: 5000 }]) as object)).toBe(true);
  });
  it("MAC, ports, hostname, VLAN", () => {
    expect(normaliseMac("00-1A-2b-3c-4D-5e")).toMatchObject({ ok: true, mac: "00:1a:2b:3c:4d:5e" }); expect(normaliseMac("00:1a:2b").ok).toBe(false);
    expect(parsePorts("80, 443, 8000-8100").ranges).toEqual([[80, 80], [443, 443], [8000, 8100]]); expect(parsePorts("1-5, 3-9").ranges).toEqual([[1, 9]]); expect(parsePorts("70000").error).toBeTruthy(); expect(parsePorts("90-80").error).toBeTruthy(); expect(parsePorts("abc").error).toBeTruthy();
    expect(hostnameIssue("gateway.example.com")).toBeNull(); expect(hostnameIssue("-bad.example.com")).toBeTruthy(); expect(hostnameIssue("a..b")).toBeTruthy(); expect(vlanIssue(0).level).toBe("error"); expect(vlanIssue(4095).level).toBe("error"); expect(vlanIssue(120).level).toBe("ok"); expect(vlanIssue(1).level).toBe("warn");
  });
  it("firewall shadowing, port forwards, DNS", () => {
    const r = (id: string, o: Partial<FwRule>): FwRule => ({ id, action: "allow", proto: "tcp", src: "any", dst: "any", ports: "443", comment: "", ...o });
    expect(shadowed([r("1", { src: "10.0.0.0/16" }), r("2", { src: "10.0.1.0/24" }), r("3", { src: "192.168.0.0/16" })])).toEqual({ "2": "1" }); expect(fwRuleIssues(r("x", { src: "10.0.0.0/40" })).length).toBe(1);
    const pf = pfIssues([{ id: "a", proto: "tcp", extPort: "443", ip: "192.168.1.2", intPort: "", note: "" }, { id: "b", proto: "tcp", extPort: "443", ip: "192.168.1.3", intPort: "", note: "" }, { id: "c", proto: "udp", extPort: "443", ip: "8.8.8.8", intPort: "", note: "" }]); expect(pf.b?.length).toBeGreaterThan(0); expect(pf.c?.length).toBeGreaterThan(0); expect(pf.a ?? []).toEqual([]);
    expect(dnsIssue("A", "api", "203.0.113.999")).toBeTruthy(); expect(dnsIssue("A", "api", "203.0.113.9")).toBeNull(); expect(dnsIssue("CNAME", "@", "example.com")).toBeTruthy(); expect(dnsIssue("AAAA", "x", "2001:db8::1")).toBeNull();
  });
});
describe("structured data logic", () => {
  const schema: Schema = { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 3 }, age: { type: "integer", minimum: 0, maximum: 10 }, tags: { type: "array", minItems: 1, items: { type: "string" } }, mail: { type: "string", format: "email" } } };
  it("validates against a schema", () => {
    expect(validateSchema(schema, { name: "Ava", age: 3, tags: ["x"] })).toEqual({}); const e = validateSchema(schema, { name: "A", age: 11, tags: [], mail: "nope" }); expect(Object.keys(e).sort()).toEqual(["/age", "/mail", "/name", "/tags"]); expect(validateSchema(schema, {})["/name"]).toBeTruthy();
    expect(parseSchema("{").error).toBeTruthy(); expect(parseSchema(JSON.stringify(schema)).schema).toBeTruthy();
  });
  it("filters and tokens", () => {
    const row = { name: "Acme", mrr: 1200, joined: "2026-02-14", status: "Active" };
    expect(evalFilter({ id: "1", field: "mrr", op: "between", value: "1000", value2: "2000" }, row, "number")).toBe(true); expect(evalFilter({ id: "1", field: "status", op: "isnot", value: "active" }, row, "enum")).toBe(false); expect(evalFilter({ id: "1", field: "joined", op: "inlast", value: "400" }, row, "date", new Date(2026, 10, 12))).toBe(true); expect(evalFilter({ id: "1", field: "name", op: "contains", value: "cm" }, row, "text")).toBe(true);
    const t = parseQuery("status:active mrr>500 -name:zed acme"); expect(t.length).toBe(4); expect(matchTokens(row, t, ["name", "status", "mrr"])).toBe(true); expect(matchTokens(row, parseQuery("mrr>5000"), ["mrr"])).toBe(false); expect(matchTokens(row, parseQuery("-status:active"), ["status"])).toBe(false);
  });
  it("tri-state trees", () => {
    const tree: TNode = { id: "r", label: "R", children: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }; expect(checkState(tree, new Set(["a"]))).toBe("indeterminate"); expect([...toggleNode(tree, new Set(["a"]))].sort()).toEqual(["a", "b"]); expect(toggleNode(tree, new Set(["a", "b"])).size).toBe(0);
  });
  it("permissions imply view; diffs", () => { const p = normalisePerms({ Orders: { view: false, edit: true } }); expect(p.Orders.view).toBe(true); });
  it("chunks and folder trees", () => {
    const plan = chunkPlan(20 * 1048576 + 5, 8 * 1048576); expect(plan.map((c) => c.size)).toEqual([8388608, 8388608, 4194304 + 5]); expect(plan.reduce((a, c) => a + c.size, 0)).toBe(20 * 1048576 + 5); expect(humanSize(1536)).toBe("1.5 KB");
    const t = folderTree([{ path: "a/b/c.txt", size: 10 }, { path: "a/d.txt", size: 5 }]); expect(t.children[0].name).toBe("a"); expect(t.children[0].bytes).toBe(15);
  });
  it("column mapping uses names, aliases and fuzzy matching", () => {
    const m = suggestMapping(["Customer", "E-mail address", "Mobile", "Notes"], [{ key: "name", label: "Full name", aliases: ["customer"] }, { key: "email", label: "Email" }, { key: "phone", label: "Phone", aliases: ["mobile"] }]); expect(m).toEqual({ Customer: "name", "E-mail address": "email", Mobile: "phone", Notes: null });
    expect(parseCsv('a,"b,c",d\n1,"x ""q""",3')).toEqual([["a", "b,c", "d"], ["1", 'x "q"', "3"]]);
  });
  it("translations, versions, rules, thresholds", () => {
    expect(placeholderIssues("{n} items", "{count} articles").length).toBe(1); expect(placeholderIssues("{n} items", "{n} Artikel")).toEqual([]); expect(completeness({ a: { en: "x", fr: "" }, b: { en: "y", fr: "z" } }, ["fr"]).fr).toBe(50);
    expect(diffFields({ a: 1, b: 2 }, { a: 1, b: 3 }, "me", "now").map((c) => c.field)).toEqual(["b"]);
    expect(evalRule({ join: "all", conds: [{ field: "x", op: ">", value: "5" }, { field: "s", op: "=", value: "a" }] }, { x: 6, s: "a" })).toBe(true); expect(evalRule({ join: "any", conds: [{ field: "x", op: ">", value: "5" }, { field: "s", op: "=", value: "b" }] }, { x: 1, s: "a" })).toBe(false);
    expect(breaches([1, 9, 9, 1, 9, 1], 5, 2)).toEqual([{ start: 1, end: 2 }]); expect(breaches([1, 9, 9, 1, 9, 1], 5, 1).length).toBe(2); expect(breaches([9, 9], 5, 2)).toEqual([{ start: 0, end: 1 }]);
  });
});
describe("geo, files, behaviour helpers", () => {
  it("haversine and search", () => { expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(111.19, 1); expect(searchAddresses("wattle").length).toBe(2); expect(searchAddresses("w")).toEqual([]); expect(coordIssue("-91", "0")).toBeTruthy(); expect(coordIssue("-27", "153")).toBeNull(); });
  it("URL import blocks unsafe targets", () => { expect(checkImportUrl("https://example.com/a/b.pdf")).toMatchObject({ ok: true, name: "b.pdf" }); expect(checkImportUrl("http://example.com/x").ok).toBe(false); expect(checkImportUrl("https://localhost/x").ok).toBe(false); expect(checkImportUrl("https://192.168.1.5/x").ok).toBe(false); expect(checkImportUrl("nope").ok).toBe(false); });
  it("EAN-13 and alt text", () => { expect(ean13Valid("5901234123457")).toBe(true); expect(ean13Valid("5901234123458")).toBe(false); expect(altTextIssues("", false)[0].level).toBe("error"); expect(altTextIssues("", true)[0].level).toBe("ok"); expect(altTextIssues("photo.png", false, "photo.png").some((i) => i.level === "error")).toBe(true); expect(altTextIssues("Image of a dog", false).some((i) => i.level === "warn")).toBe(true); });
  it("wizard step validation and field modes", () => { expect(Object.keys(stepErrors({ name: "", email: "x", role: "", years: "", cover: "", agree: false }, 0))).toEqual(["name", "email"]); expect(Object.keys(stepErrors({ name: "A", email: "a@b.co", role: "", years: "3", cover: "x".repeat(30), agree: true }, 2))).toEqual([]); expect(resolveMode({ f: { HR: "edit" } }, "HR", "f")).toBe("edit"); expect(resolveMode({}, "HR", "f")).toBe("hidden"); });
});
