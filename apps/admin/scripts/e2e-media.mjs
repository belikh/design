#!/usr/bin/env node
// Real-browser tests for the media and colour tools (C042, C043, C048) on /p3/*: fake camera and microphone, real MediaRecorder,
// real decodeAudioData, real video seeking and canvas capture.
//   E2E_URL=http://127.0.0.1:3000 npm run e2e:media     reuse a running server
//   npm run e2e:media                                    starts one on :3102
//   CHROMIUM=/usr/bin/chromium npm run e2e:media
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROMIUM || "/usr/bin/chromium";
let base = process.env.E2E_URL, server = null;
if (!base) {
  server = spawn("npx", ["vite", "--port", "3102", "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore", cwd: new URL("..", import.meta.url).pathname }); base = "http://127.0.0.1:3102";
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)); }
}
const exe = CHROME.startsWith("/") ? CHROME : execFileSync("sh", ["-c", `command -v ${CHROME}`]).toString().trim();
// --disable-audio-output keeps the Web Audio clock running on machines with no sound card (otherwise AnalyserNode sees nothing);
// --use-file-for-fake-audio-capture feeds the fake microphone a steady 440 Hz tone so the level meter has something to show.
const tmp = mkdtempSync(`${tmpdir()}/e2e-media-`); const toneFile = `${tmp}/mic.wav`;
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required", "--disable-audio-output", `--use-file-for-fake-audio-capture=${toneFile}`] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, permissions: ["microphone", "camera"], acceptDownloads: true });
let pass = 0; const fails = [];
const test = async (name, fn) => { const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message)); try { await fn(page); if (errs.length) throw new Error(`page error: ${errs[0]}`); pass++; console.log(`  ok   ${name}`); } catch (e) { fails.push(name); console.log(`  FAIL ${name}\n       ${String(e.message).split("\n")[0]}`); } finally { await page.close(); } };
const ok = (c, m) => { if (!c) throw new Error(m); };
const near = (a, b, tol, m) => ok(Math.abs(a - b) <= tol, `${m}: got ${a}, want ${b} +/- ${tol}`);
const go = async (page, path) => { await page.goto(base + path); await page.waitForSelector("main, .adm-main", { timeout: 15000 }); await page.waitForFunction(() => !document.querySelector('[data-testid="route-loading"]'), null, { timeout: 15000 }); };
const entry = (page, title) => page.locator(".p3-entry", { has: page.locator(".jp-panel__title, h2, h3", { hasText: title }) }).first();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* a 16-bit mono WAV written here, independent of the app's encoder */
const makeWav = (sr, seconds, hz, amp) => { const n = Math.round(sr * seconds), b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp * 32767 * Math.sin((2 * Math.PI * hz * i) / sr)), 44 + i * 2); return b; };
writeFileSync(toneFile, makeWav(48000, 4, 440, 0.5));
const parseWav = (buf) => { ok(buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE" && buf.toString("ascii", 12, 16) === "fmt " && buf.toString("ascii", 36, 40) === "data", "not a RIFF/WAVE/fmt/data file"); const ch = buf.readUInt16LE(22), sr = buf.readUInt32LE(24), bits = buf.readUInt16LE(34), bytes = buf.readUInt32LE(40); ok(buf.readUInt32LE(4) === buf.length - 8, "RIFF size field"); ok(bytes === buf.length - 44, "data size field"); ok(buf.readUInt16LE(20) === 1, "PCM"); const frames = bytes / (ch * bits / 8); let peak = 0; for (let i = 0; i < bytes / 2; i++) peak = Math.max(peak, Math.abs(buf.readInt16LE(44 + i * 2)) / 32768); return { ch, sr, bits, frames, seconds: frames / sr, peak }; };
const fetchBlob = async (page, href) => Buffer.from(await page.evaluate(async (u) => { const b = await (await fetch(u)).arrayBuffer(); let s = ""; const a = new Uint8Array(b); for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); }, href), "base64");
const handleVal = async (page, name) => Number(await page.getByRole("slider", { name, exact: true }).getAttribute("aria-valuenow"));
const MEDIA = "/p3/audio-video-media";

console.log(`e2e-media against ${base}`);

await test("C042 colour pad: keyboard, hex/RGB/HSL/alpha sync, eyedropper feature check", async (p) => {
  await go(p, "/p3/design-tools"); const cp = entry(p, "Colour picker"); const pad = cp.getByRole("slider", { name: "Saturation and brightness" }); await pad.scrollIntoViewIfNeeded();
  const hex = cp.getByRole("textbox", { name: "Hex" }); await hex.fill("#ff0000"); await hex.blur();
  ok((await pad.getAttribute("aria-valuetext")) === "Saturation 100%, brightness 100%", "pad reflects hex");
  await pad.focus(); await p.keyboard.press("ArrowLeft"); await p.keyboard.press("Shift+ArrowDown"); ok((await pad.getAttribute("aria-valuetext")) === "Saturation 99%, brightness 90%", "arrow keys");
  const box = await pad.boundingBox(); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); const t = await pad.getAttribute("aria-valuetext"); ok(/Saturation 5\d%, brightness 5\d%/.test(t), `pointer click lands in the middle: ${t}`);
  await cp.getByLabel("Red", { exact: true }).fill("10"); await cp.getByLabel("Green", { exact: true }).fill("20"); await cp.getByLabel("Blue", { exact: true }).fill("30"); ok((await hex.inputValue()) === "#0a141e", `hex from rgb: ${await hex.inputValue()}`);
  await cp.getByLabel("Alpha", { exact: true }).fill("50"); ok((await hex.inputValue()) === "#0a141e80", "alpha appended to hex"); ok(await cp.getByText("rgb(10 20 30 / 0.5)").isVisible(), "rgb readout with alpha");
  await hex.fill("#336699"); await hex.blur(); ok((await cp.getByLabel("HSL hue").inputValue()) === "210", "hsl hue");
  const hasEye = await p.evaluate(() => "EyeDropper" in window); ok((await cp.getByRole("button", { name: "Eyedropper" }).count()) === (hasEye ? 1 : 0), "eyedropper only when supported");
});

await test("C042 font picker: shipped families with real availability and live preview", async (p) => {
  await go(p, "/p3/design-tools"); const grp = p.getByRole("radiogroup", { name: "Font family" }); await grp.scrollIntoViewIfNeeded();
  await p.waitForFunction(() => [...document.querySelectorAll('[aria-label="Font family"] [role=radio]')].every((r) => !/Checking/.test(r.textContent)), null, { timeout: 15000 });
  const jb = grp.getByRole("radio", { name: /JetBrains Mono/ }); ok(/Available/.test(await jb.textContent()), "JetBrains Mono ships and loads");
  const sgiThere = existsSync(new URL("../public/fonts/sgi-text-400.woff2", import.meta.url).pathname); const sgi = grp.getByRole("radio", { name: /SGI Text/ });
  ok(/Available/.test(await sgi.textContent()) === sgiThere, `SGI Text badge matches the file (${sgiThere ? "present" : "absent"}): ${await sgi.textContent()}`);
  await sgi.click(); await p.getByLabel("Weight", { exact: true }).selectOption("700"); await p.getByLabel("Size", { exact: true }).selectOption("40");
  await p.waitForFunction(() => /(available|not found)/.test(document.querySelector('p[role=status]:has(b)')?.textContent ?? "") || true);
  const prev = p.getByLabel("Preview in SGI Text"); const fs = await prev.evaluate((e) => getComputedStyle(e).fontSize); ok(fs === "40px", `preview size ${fs}`); ok((await prev.evaluate((e) => getComputedStyle(e).fontWeight)) === "700", "preview weight");
  await p.getByRole("radio", { name: /JetBrains Mono/ }).click(); const ff = await prev.count() ? "" : ""; void ff; const jprev = p.getByLabel("Preview in JetBrains Mono"); ok(/JetBrains Mono/.test(await jprev.evaluate((e) => getComputedStyle(e).fontFamily)), "preview family");
  ok(await jprev.evaluate((e) => document.fonts.check(`16px "JetBrains Mono"`) && getComputedStyle(e).fontFamily.includes("JetBrains")), "browser reports the face as loaded");
  const georgia = grp.getByRole("radio", { name: /Georgia/ }); ok(/(Available|Not found)/.test(await georgia.textContent()), "system font gets a detected badge");
});

await test("C043 -> C048 audio: record from the fake microphone, meter, decode, trim, export WAV", async (p) => {
  await go(p, MEDIA); const rec = entry(p, "Audio / video recorder"); await rec.scrollIntoViewIfNeeded();
  ok(await rec.getByText("Live device").isVisible(), "live mode by default");
  await rec.getByRole("button", { name: "Enable devices" }).click(); await p.waitForFunction(() => document.querySelector('select[aria-label="Microphone"]')?.options.length > 1, null, { timeout: 8000 });
  const mics = await rec.getByLabel("Microphone").locator("option").allTextContents(); ok(mics.length >= 2, `device list has real devices: ${mics}`);
  ok(/granted/.test(await rec.getByText(/Microphone permission/).textContent()), "permission shown as granted");
  await rec.getByRole("button", { name: "Start recording" }).click(); await rec.getByText("Recording…").waitFor();
  let maxLevel = 0; for (let i = 0; i < 18; i++) { maxLevel = Math.max(maxLevel, Number(await rec.getByRole("meter").getAttribute("aria-valuenow"))); await sleep(150); } ok(maxLevel > 0, `meter moved (max ${maxLevel})`);
  await rec.getByRole("button", { name: "Pause" }).click(); const frozen = await rec.getByRole("timer").textContent(); await sleep(1200); ok((await rec.getByRole("timer").textContent()) === frozen, "timer holds while paused");
  await rec.getByRole("button", { name: "Resume" }).click(); await sleep(1500); await rec.getByRole("button", { name: "Stop and save" }).click();
  const clip = rec.getByRole("list", { name: "Recordings" }).locator("li").first(); await clip.waitFor(); ok(!/simulated/.test(await clip.textContent()), "real clip, not simulated");
  const href = await clip.getByRole("link", { name: /Download clip/ }).getAttribute("href"); const info = await p.evaluate(async (u) => { const b = await (await fetch(u)).blob(); return { size: b.size, type: b.type }; }, href); ok(info.size > 1000 && /audio\//.test(info.type), `recorded blob ${info.size} bytes ${info.type}`);
  const dur = await p.evaluate(async (u) => { const a = new Audio(u); a.preload = "metadata"; await new Promise((r) => { a.onloadedmetadata = r; a.onerror = r; }); return a.duration; }, href); void dur;
  /* playback of the recording */
  await clip.locator("audio").evaluate(async (a) => { await a.play(); await new Promise((r) => setTimeout(r, 400)); const t = a.currentTime; a.pause(); if (!(t > 0)) throw new Error("audio element did not advance"); });
  /* C048: open that recording, decode it */
  const wt = entry(p, "Audio waveform trim"); await wt.scrollIntoViewIfNeeded(); await wt.getByLabel("Use a audio recording").selectOption({ index: 1 });
  const wave = wt.getByRole("img", { name: /^Waveform of audio-clip-1/ }); await wave.waitFor({ timeout: 10000 });
  const peaks = await wave.locator("rect").evaluateAll((rs) => rs.map((r) => Number(r.getAttribute("height")))); ok(peaks.length === 320 && Math.max(...peaks) > 1, `real peaks drawn (max height ${Math.max(...peaks)})`);
  const total = await handleVal(p, "Trim end"); ok(total > 1.5, `decoded duration ${total}s`);
  const a = Math.round(total * 0.2 * 100) / 100, b = Math.round(total * 0.7 * 100) / 100;
  await wt.getByRole("slider", { name: "Trim start" }).focus(); await p.keyboard.press("Shift+ArrowRight"); const afterKey = await handleVal(p, "Trim start"); near(afterKey, 1, 0.001, "Shift+Right moves one second");
  await wt.getByLabel("Start (seconds)").fill(String(a)); await wt.getByLabel("Start (seconds)").press("Enter"); await wt.getByLabel("End (seconds)").fill(String(b)); await wt.getByLabel("End (seconds)").press("Enter");
  near(await handleVal(p, "Trim start"), a, 0.011, "start field"); near(await handleVal(p, "Trim end"), b, 0.011, "end field");
  await wt.getByRole("button", { name: "Play selection" }).click(); await wt.getByRole("button", { name: "Stop playback" }).waitFor(); await wt.getByRole("button", { name: "Stop playback" }).click();
  await wt.getByRole("button", { name: "Export WAV" }).click(); const dl = wt.getByRole("link", { name: "Download WAV" }); await dl.waitFor();
  const wavBuf = await fetchBlob(p, await dl.getAttribute("href")); const w = parseWav(wavBuf); near(w.seconds, b - a, 0.012, "WAV duration equals the trimmed length"); ok(w.bits === 16 && (w.ch === 1 || w.ch === 2), "16-bit PCM"); ok(w.peak > 0.001, `WAV has real audio (peak ${w.peak})`);
  const dec = await p.evaluate(async (u) => { const ac = new AudioContext(); const buf = await ac.decodeAudioData(await (await fetch(u)).arrayBuffer()); return { d: buf.duration, sr: buf.sampleRate }; }, await dl.getAttribute("href")); near(dec.d, b - a, 0.012, "browser decodes the exported WAV to the same duration"); near(dec.sr, w.sr, 0, "sample rate preserved");
  const dlp = p.waitForEvent("download"); await dl.click(); const d = await dlp; ok(/-trim\.wav$/.test(d.suggestedFilename()), `download name ${d.suggestedFilename()}`);
});

await test("C048 audio: exact peaks, trim and WAV for a known 440 Hz tone (uploaded file)", async (p) => {
  await go(p, MEDIA); const wt = entry(p, "Audio waveform trim"); await wt.scrollIntoViewIfNeeded();
  await wt.getByLabel("Choose audio file").setInputFiles({ name: "tone.wav", mimeType: "audio/wav", buffer: makeWav(22050, 2, 440, 0.5) });
  const wave = wt.getByRole("img", { name: /^Waveform of tone.wav, 0:02.00 long/ }); await wave.waitFor({ timeout: 8000 });
  const hs = await wave.locator("rect").evaluateAll((rs) => rs.map((r) => ({ y: Number(r.getAttribute("y")), h: Number(r.getAttribute("height")) }))); const top = Math.min(...hs.map((r) => r.y)), bottom = Math.max(...hs.map((r) => r.y + r.h)); near(20 - top, 0.5 * 19, 0.6, "positive peak is 0.5 of full scale"); near(bottom - 20, 0.5 * 19, 0.6, "negative peak mirrors it");
  await wt.getByLabel("Start (seconds)").fill("0.5"); await wt.getByLabel("Start (seconds)").press("Enter"); await wt.getByLabel("End (seconds)").fill("1.25"); await wt.getByLabel("End (seconds)").press("Enter");
  ok(/Keeps 0:00.75 of 0:02.00/.test(await wt.getByText(/^Keeps/).textContent()), "status text");
  await wt.getByRole("button", { name: "Export WAV" }).click(); const dl = wt.getByRole("link", { name: "Download WAV" }); await dl.waitFor(); const w = parseWav(await fetchBlob(p, await dl.getAttribute("href")));
  ok(w.ch === 1 && w.bits === 16 && [44100, 48000, 22050].includes(w.sr), `format ${w.ch}ch ${w.bits}bit ${w.sr}Hz (decodeAudioData resamples to the context rate)`); near(w.frames, 0.75 * w.sr, 1, "frame count"); near(w.peak, 0.5, 0.01, "exported peak");
  /* silence trimming on a tone padded with silence is covered by the sample button */
  await wt.getByRole("button", { name: "Load a sample tone" }).click(); await wave.waitFor({ state: "detached" }).catch(() => undefined);
  await wt.getByRole("img", { name: /^Waveform of sample-tone.wav/ }).waitFor(); await wt.getByRole("button", { name: "Trim silence" }).click(); const s = await handleVal(p, "Trim start"), e = await handleVal(p, "Trim end"); ok(s >= 0.35 && s < 0.6 && e <= 5.65 && e > 5.4, `silence trimmed to ${s}..${e}`);
  await wt.getByRole("slider", { name: "Trim end" }).focus(); await p.keyboard.press("Home"); ok((await handleVal(p, "Trim end")) > (await handleVal(p, "Trim start")), "end handle cannot cross start");
});

/* a 3 s 320x180 webm drawn on a canvas and recorded in the page: colour changes with time so frames differ */
const makeVideo = (page) => page.evaluate(async () => {
  const c = document.createElement("canvas"); c.width = 320; c.height = 180; const g = c.getContext("2d"); const rs = c.captureStream(25); const mr = new MediaRecorder(rs, { mimeType: "video/webm;codecs=vp8" }); const chunks = []; mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const t0 = performance.now(); const draw = () => { const t = (performance.now() - t0) / 1000; g.fillStyle = `hsl(${(t * 120) % 360} 70% 50%)`; g.fillRect(0, 0, 320, 180); g.fillStyle = "white"; g.fillRect(20 + t * 80, 60, 40, 60); g.fillStyle = "black"; g.font = "24px sans-serif"; g.fillText(t.toFixed(1), 10, 30); if (t < 3.2) requestAnimationFrame(draw); }; draw();
  mr.start(100); await new Promise((r) => setTimeout(r, 3200)); const done = new Promise((r) => (mr.onstop = r)); mr.stop(); await done; const b = new Blob(chunks, { type: "video/webm" }); const ab = new Uint8Array(await b.arrayBuffer()); let s = ""; for (let i = 0; i < ab.length; i += 8192) s += String.fromCharCode(...ab.subarray(i, i + 8192)); return btoa(s);
});
const pngDims = (buf) => { ok(buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", "PNG signature"); ok(buf.toString("ascii", 12, 16) === "IHDR", "IHDR"); return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; };

await test("C048 video: load a generated file, seek, capture frames, thumbnail strip, export PNG", async (p) => {
  await go(p, MEDIA); const vt = entry(p, "Video thumbnail picker"); await vt.scrollIntoViewIfNeeded(); const video = Buffer.from(await makeVideo(p), "base64"); ok(video.length > 2000, `generated video ${video.length} bytes`);
  await vt.getByLabel("Choose video file").setInputFiles({ name: "gen.webm", mimeType: "video/webm", buffer: video });
  await vt.getByText("320 × 180").waitFor({ timeout: 15000 }); const dtxt = await vt.locator(".jp-badge", { hasText: /^0:0\d\.\d\d$/ }).first().textContent(); const secs = Number(dtxt.split(":")[1]); near(secs, 3.2, 0.7, `duration found despite an infinite webm header (${dtxt})`);
  await p.waitForFunction(() => document.querySelectorAll('[aria-label="Thumbnail frames"] [role=radio]').length === 12 && ![...document.querySelectorAll('[aria-label="Thumbnail frames"] [role=radio]')].some((r) => r.disabled), null, { timeout: 30000 });
  const imgs = await vt.getByRole("radiogroup", { name: "Thumbnail frames" }).locator("img").evaluateAll(async (is) => { const out = []; for (const i of is) { const b = await (await fetch(i.src)).blob(); out.push(b.size); } return out; }); ok(imgs.length === 12 && imgs.every((s) => s > 200), `12 thumbnails with content: ${imgs}`);
  const colours = await vt.getByRole("radiogroup", { name: "Thumbnail frames" }).locator("img").evaluateAll(async (is) => { const out = []; for (const i of is) { await i.decode(); const c = document.createElement("canvas"); c.width = c.height = 8; const g = c.getContext("2d"); g.drawImage(i, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; out.push([d[0], d[1], d[2]].map((x) => x >> 4).join(",")); } return out; }); ok(new Set(colours).size >= 5, `frames really differ over time: ${colours}`);
  ok((await vt.getByText("Best", { exact: true }).count()) === 1, "one suggested frame");
  const canvasHash = () => vt.locator("canvas.p3-canvas").evaluate((c) => c.toDataURL().length + ":" + c.toDataURL().slice(-80));
  const h0 = await canvasHash(); const sl = vt.getByLabel("Scrub through the video"); await sl.focus(); for (let i = 0; i < 20; i++) await p.keyboard.press("ArrowRight"); await p.waitForFunction((x) => !!x, 1); await sleep(600); const h1 = await canvasHash(); ok(h0 !== h1, "scrubbing with the keyboard changes the captured frame"); ok(/0:01\.00/.test(await vt.locator("output").first().textContent()), "scrub position 1.00 s");
  const radios = vt.getByRole("radio"); await radios.nth(9).click(); ok((await radios.nth(9).getAttribute("aria-checked")) === "true", "picked frame 10"); const status = await vt.getByText(/^Cover:/).textContent(); ok(/frame 10/.test(status), status);
  await vt.getByRole("button", { name: "Suggest best frame" }).click(); ok(/suggested/.test(await vt.locator('[role=radio][aria-checked=true]').getAttribute("aria-label")), "suggest selects the best frame");
  await vt.getByRole("button", { name: "Export cover as PNG" }).click(); const dl = vt.getByRole("link", { name: "Download PNG" }); await dl.waitFor({ timeout: 10000 }); const png = await fetchBlob(p, await dl.getAttribute("href")); const dim = pngDims(png); ok(dim.w === 320 && dim.h === 180, `PNG is the native ${dim.w}x${dim.h}`);
  const dlp = p.waitForEvent("download"); await dl.click(); ok(/-cover-.*\.png$/.test((await dlp).suggestedFilename()), "PNG download name");
  const bad = await vt.getByLabel("Choose video file").setInputFiles({ name: "x.webm", mimeType: "video/webm", buffer: Buffer.from("not a video") }).then(() => vt.getByText(/could not decode|no readable video/i).waitFor({ timeout: 10000 }).then(() => true)); ok(bad, "undecodable file reports an error");
});

await test("C043 -> C048 video: record from the fake camera, play back, use it for thumbnails", async (p) => {
  await go(p, MEDIA); const rec = entry(p, "Audio / video recorder"); await rec.scrollIntoViewIfNeeded(); await rec.getByRole("button", { name: "Video" }).click();
  await rec.getByRole("button", { name: "Enable devices" }).click(); await p.waitForFunction(() => document.querySelector('select[aria-label="Camera"]')?.options.length > 1, null, { timeout: 8000 });
  await rec.getByRole("button", { name: "Start recording" }).click(); await rec.getByText("Recording…").waitFor(); await sleep(400);
  ok(await rec.locator("video[aria-label='Camera preview']").evaluate((v) => !!v.srcObject), "live camera preview attached"); await sleep(2000); await rec.getByRole("button", { name: "Stop and save" }).click();
  const clip = rec.getByRole("list", { name: "Recordings" }).locator("li").first(); await clip.waitFor(); ok(/Video clip 1/.test(await clip.textContent()) && !/simulated/.test(await clip.textContent()), "real video clip");
  await clip.locator("video").evaluate(async (v) => { v.muted = true; await v.play(); await new Promise((r) => setTimeout(r, 500)); if (!(v.currentTime > 0)) throw new Error("video did not advance"); v.pause(); });
  const vt = entry(p, "Video thumbnail picker"); await vt.scrollIntoViewIfNeeded(); await vt.getByLabel("Use a video recording").selectOption({ index: 1 });
  await p.waitForFunction(() => document.querySelectorAll('[aria-label="Thumbnail frames"] [role=radio]').length === 12 && ![...document.querySelectorAll('[aria-label="Thumbnail frames"] [role=radio]')].some((r) => r.disabled), null, { timeout: 40000 });
  await vt.getByRole("button", { name: "Export cover as PNG" }).click(); const dl = vt.getByRole("link", { name: "Download PNG" }); await dl.waitFor({ timeout: 10000 }); const dim = pngDims(await fetchBlob(p, await dl.getAttribute("href"))); ok(dim.w >= 160 && dim.h >= 90, `recorded video cover ${dim.w}x${dim.h}`);
});

await test("C043 falls back to simulated recording only on denial, explicitly", async (p) => {
  await p.addInitScript(() => { const md = navigator.mediaDevices; md.getUserMedia = () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })); });
  await go(p, MEDIA); const rec = entry(p, "Audio / video recorder"); await rec.scrollIntoViewIfNeeded(); await rec.getByRole("button", { name: "Start recording" }).click();
  await rec.getByText(/Permission to use the microphone or camera was denied/).waitFor(); ok(/denied/.test(await rec.getByText(/Microphone permission/).textContent()), "permission badge shows denied");
  await rec.getByRole("button", { name: "Use simulated recording" }).click(); ok(await rec.getByText("Simulated", { exact: true }).isVisible(), "now simulated");
  await rec.getByRole("button", { name: "Start recording" }).click(); await sleep(700); await rec.getByRole("button", { name: "Stop and save" }).click(); ok(/simulated/.test(await rec.getByRole("list", { name: "Recordings" }).textContent()), "clip marked simulated"); ok((await rec.getByRole("link", { name: /Download clip/ }).count()) === 0, "no download for simulated clips");
});

await test("axe: the loaded states (waveform with handles, exported WAV, thumbnail strip, colour pad) have no violations", async (p) => {
  await go(p, MEDIA); await p.addScriptTag({ path: createRequire(import.meta.url).resolve("axe-core/axe.min.js") });
  const wt = entry(p, "Audio waveform trim"); await wt.getByRole("button", { name: "Load a sample tone" }).click(); await wt.getByRole("slider", { name: "Trim start" }).waitFor(); await wt.getByRole("button", { name: "Export WAV" }).click(); await wt.getByRole("link", { name: "Download WAV" }).waitFor();
  const vt = entry(p, "Video thumbnail picker"); await vt.getByLabel("Choose video file").setInputFiles({ name: "gen.webm", mimeType: "video/webm", buffer: Buffer.from(await makeVideo(p), "base64") });
  await p.waitForFunction(() => document.querySelectorAll('[aria-label="Thumbnail frames"] [role=radio]').length === 12 && ![...document.querySelectorAll('[aria-label="Thumbnail frames"] [role=radio]')].some((r) => r.disabled), null, { timeout: 30000 });
  await vt.getByRole("button", { name: "Export cover as PNG" }).click(); await vt.getByRole("link", { name: "Download PNG" }).waitFor();
  const res = await p.evaluate(async () => (await window.axe.run(document.querySelector("main") ?? document, { resultTypes: ["violations"] })).violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`));
  ok(res.length === 0, `axe violations: ${res.join(" ;; ")}`);
  await go(p, "/p3/design-tools"); await p.addScriptTag({ path: createRequire(import.meta.url).resolve("axe-core/axe.min.js") }); await p.waitForFunction(() => [...document.querySelectorAll('[aria-label="Font family"] [role=radio]')].every((r) => !/Checking/.test(r.textContent)), null, { timeout: 15000 });
  const res2 = await p.evaluate(async () => (await window.axe.run({ include: [...document.querySelectorAll(".p3-entry")].filter((e) => /C042/.test(e.textContent.slice(0, 40)))}, { resultTypes: ["violations"] })).violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`)); ok(res2.length === 0, `axe violations in the C042 entries: ${res2.join(" ;; ")}`);
});

await browser.close(); server?.kill();
console.log(`\n${pass} passed, ${fails.length} failed`); process.exit(fails.length ? 1 : 0);
