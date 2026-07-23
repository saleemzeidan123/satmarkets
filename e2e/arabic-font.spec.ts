import { test, expect } from "@playwright/test";

// Route-level computed-style gate (PKG-1B, Codex correction 1). Fails if any
// Arabic-bearing leaf element resolves to the Latin UI font (Hanken Grotesk) or
// to IBM Plex Mono, outside a narrowly documented allowlist. Runs against the
// live deployment (PLAYWRIGHT_BASE_URL). Target: zero exceptions on these public
// Arabic routes.
const ROUTES = [
  "/ar",
  "/ar/listings",
  "/ar/rent-index",
  "/ar/advisor",
  "/ar/market",
  "/ar/requirements",
  "/ar/brokers",
  "/ar/locations",
];

// Allowlist: element selectors whose Latin/Mono family is intentional. Kept
// narrow and documented. Figures (.fig/.tnum) and the Latin language toggle
// (.lang-seg) legitimately carry Western-numeral or Latin content.
const ALLOW = [".fig", ".tnum", ".lang-seg"];

for (const route of ROUTES) {
  test(`Arabic leaves use the Arabic family on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    const offenders = await page.evaluate((allow) => {
      const bad: { tag: string; cls: string; fam: string; text: string }[] = [];
      const arabic = /[؀-ۿ]/;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
        if (el.children.length > 0) continue; // leaf only
        const t = (el.textContent || "").trim();
        if (!t || !arabic.test(t)) continue;
        if (allow.some((sel: string) => el.matches(sel) || el.closest(sel))) continue;
        const fam = getComputedStyle(el).fontFamily;
        const isLatin = /Hanken|Plex.?Mono/i.test(fam) && !/Plex.?Sans.?Arabic/i.test(fam);
        if (isLatin) bad.push({ tag: el.tagName, cls: el.className.toString().slice(0, 40), fam: fam.split(",")[0], text: t.slice(0, 24) });
      }
      return bad;
    }, ALLOW);
    expect(offenders, `Arabic-in-Latin/Mono leaves on ${route}: ${JSON.stringify(offenders.slice(0, 8), null, 2)}`).toEqual([]);
  });
}
