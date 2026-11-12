#!/usr/bin/env node
// Real-browser interaction tests: focus, clipboard paste, drag and drop, popovers and keyboard undo, none of which jsdom does faithfully.
//   npm run e2e                                   starts the dev server on :3101 and drives the system Chromium
//   E2E_URL=http://127.0.0.1:3000 npm run e2e     reuse a running server
//   CHROMIUM=google-chrome npm run e2e            pick the browser
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROMIUM || "chromium";
let base = process.env.E2E_URL, server = null;
if (!base) {
  server = spawn("npx", ["vite", "--port", "3101", "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore", cwd: new URL("..", import.meta.url).pathname }); base = "http://127.0.0.1:3101";
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)); }
}
const exe = CHROME.startsWith("/") ? CHROME : execFileSync("sh", ["-c", `command -v ${CHROME}`]).toString().trim();
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
let pass = 0; const fails = [];
const test = async (name, fn) => { const page = await ctx.newPage(); try { await fn(page); pass++; console.log(`  ok   ${name}`); } catch (e) { fails.push(name); console.log(`  FAIL ${name}\n       ${String(e.message).split("\n")[0]}`); } finally { await page.close(); } };
const ok = (c, m) => { if (!c) throw new Error(m); };
const go = async (page, path) => { await page.goto(base + path); await page.waitForSelector("main, .adm-main", { timeout: 15000 }); await page.waitForFunction(() => !document.querySelector('[data-testid="route-loading"]'), null, { timeout: 15000 }); };

console.log(`e2e against ${base}`);
await test("command palette: focus moves in, Escape returns it to the trigger", async (p) => {
  await go(p, "/orders"); await p.click('button[aria-label="Open command palette"]');
  await p.waitForSelector("dialog[open]"); ok(await p.evaluate(() => !!document.activeElement?.closest("dialog")), "focus should be inside the dialog");
  ok(await p.evaluate(() => document.querySelector("dialog")?.matches(":modal")), "dialog should be modal (inert page behind it)");
  await p.keyboard.press("Escape"); await p.waitForSelector("dialog[open]", { state: "detached" });
  ok(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Open command palette"), "focus should return to the trigger");
});
await test("type on a focused cell replaces its value, Enter commits", async (p) => {
  await go(p, "/tables/edit"); const cell = p.locator("tr", { hasText: "T-100" }).locator("td").nth(2); await cell.click(); await p.keyboard.type("Zed");
  ok((await p.locator('input[aria-label^="Task for T-100"]').inputValue()) === "Zed", "typed text should land in the editor"); await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.body.innerText.includes("Zed"));
});
await test("pasting a block from the real clipboard fills cells", async (p) => {
  await go(p, "/tables/edit"); await p.evaluate(() => navigator.clipboard.writeText("Alpha\tDone\nBeta\tOpen"));
  await p.locator("tr", { hasText: "T-100" }).locator("td").nth(2).click(); await p.keyboard.press("Control+V");
  await p.waitForFunction(() => document.body.innerText.includes("Alpha") && document.body.innerText.includes("Beta"), null, { timeout: 8000 });
});
await test("Tab moves the editor to the next editable cell", async (p) => {
  await go(p, "/tables/edit"); await p.locator("tr", { hasText: "T-100" }).locator("td").nth(2).dblclick(); await p.keyboard.press("Tab");
  await p.waitForSelector('[aria-label^="Status for T-100"]'); ok(await p.evaluate(() => document.activeElement?.closest("td") !== null), "focus should stay in the table");
});
await test("Ctrl+Z undoes an in-place edit", async (p) => {
  await go(p, "/tables/edit"); const row = p.locator("tr", { hasText: "T-101" }); const before = await row.locator("td").nth(2).innerText();
  await row.locator("td").nth(2).dblclick(); await p.keyboard.press("Control+A"); await p.keyboard.type("Changed"); await p.keyboard.press("Enter"); await p.waitForFunction(() => !!document.querySelector(".adm-editable__ok"), null, { timeout: 8000 });
  await p.locator("main").click({ position: { x: 5, y: 5 } }); await p.keyboard.press("Control+Z"); await p.waitForFunction((b) => document.body.innerText.includes(b), before, { timeout: 8000 });
});
await test("menus open in the top layer and close on Escape", async (p) => {
  await go(p, "/tables/edit"); await p.getByRole("button", { name: "Columns" }).click(); const open = await p.evaluate(() => document.querySelector(".adm-menu__list")?.matches(":popover-open"));
  ok(open, "menu should be a popover in the top layer");
  const place = await p.evaluate(() => { const list = document.querySelector(".adm-menu__list"); const b = list.parentElement.querySelector(".jp-btn").getBoundingClientRect(), l = list.getBoundingClientRect(); return { below: l.top >= b.bottom - 1, endAligned: Math.abs(l.right - b.right) < 3, anchored: document.querySelector(".adm-menu__list").classList.contains("is-anchored") }; });
  ok(place.below && place.endAligned, `menu should sit under its button, end-aligned (${JSON.stringify(place)})`); await p.keyboard.press("Escape"); await p.waitForFunction(() => !document.querySelector(".adm-menu__list"));
});
await test("rows can be reordered by dragging the handle", async (p) => {
  await go(p, "/tables/reorder"); const ids = () => p.$$eval("tr[data-row]", (r) => r.slice(0, 5).map((x) => x.getAttribute("data-row")));
  const first = (await ids())[0]; const handle = p.locator("[data-handle]").first(); const target = p.locator("tr[data-row]").nth(3);
  await handle.dragTo(target); await p.waitForTimeout(300); const after = await ids(); ok(after[0] !== first && after.includes(first), `row ${first} should have moved (now ${after.join(",")})`);
});
await test("space can be typed in a cell editor without toggling the row", async (p) => {
  await go(p, "/tables/edit"); const row = p.locator("tr", { hasText: "T-102" }); await row.locator("td").nth(2).dblclick(); await p.keyboard.press("Control+A"); await p.keyboard.type("a b c");
  ok((await p.locator('input[aria-label^="Task for T-102"]').inputValue()) === "a b c", "spaces must reach the input"); ok(!(await row.locator('input[type=checkbox]').isChecked()), "row must not be selected");
});
await test("dragging the fill handle repeats a cell down the column", async (p) => {
  await go(p, "/tables/edit"); const cell = p.locator("tr", { hasText: "T-100" }).locator("td").nth(2); const name = (await cell.innerText()).trim(); await cell.click();
  const handle = p.locator(".adm-fillhandle"); await handle.waitFor(); const to = p.locator("tr", { hasText: "T-102" }).locator("td").nth(2); const hb = await handle.boundingBox(); const tb = await to.boundingBox();
  await p.mouse.move(hb.x + 4, hb.y + 4); await p.mouse.down(); await p.mouse.move(tb.x + 20, tb.y + tb.height / 2, { steps: 8 }); await p.mouse.up();
  await p.waitForFunction((n) => [...document.querySelectorAll("tr")].filter((r) => /T-10[12]/.test(r.textContent) && r.textContent.includes(n)).length === 2, name, { timeout: 8000 });
});

await test("on a phone the sidebar opens from the menu button and closes after navigating", async (p) => {
  await p.setViewportSize({ width: 600, height: 800 }); await go(p, "/tokens");
  ok(!(await p.locator(".adm-side").isVisible()), "sidebar hidden on a phone"); await p.getByRole("button", { name: "Toggle sidebar" }).click();
  await p.waitForSelector(".adm-shell.is-nav-open .adm-side", { state: "visible" }); await p.locator(".adm-side a", { hasText: "Type specimen" }).first().click();
  await p.waitForURL(/\/fonts/); await p.waitForFunction(() => !document.querySelector(".adm-shell.is-nav-open"), null, { timeout: 5000 }); ok(!(await p.locator(".adm-side").isVisible()), "sidebar closes after navigating");
});

await browser.close(); server?.kill();
console.log(`\n${pass} passed, ${fails.length} failed`); process.exit(fails.length ? 1 : 0);
