import { test, expect } from "@playwright/test";

// Route-level computed-style gate (PKG-1B, Codex correction 1 + strengthened per
// QA review). Fails if any Arabic-bearing TEXT NODE resolves, via its parent's
// computed font, to the Latin UI font (Hanken Grotesk) or IBM Plex Mono. It
// inspects real text nodes (not whole-element leaves), so Arabic text inside an
// element that also holds icons or child spans is still checked, and there is NO
// selector allowlist: Western numerals and Latin labels contain no Arabic and
// never enter the check; an Arabic word inside a .fig/.tnum must fail, not hide.
// Runs against the live deployment (PLAYWRIGHT_BASE_URL).

const ROUTES = [
  "/ar",
  "/ar/listings",
  "/ar/rent-index",
  "/ar/advisor",
  "/ar/market",
  "/ar/requirements",
  "/ar/brokers",
  "/ar/locations",
  "/ar/post-requirement",
  // A stable Arabic listing-detail fixture (oldest published listing with an Arabic title).
  "/ar/listings/ff29f2d0-d343-4b96-ac8c-8d1b6c25a372",
];

for (const route of ROUTES) {
  test(`Arabic text nodes use the Arabic family on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });
    // Let webfonts and any client render settle before reading computed styles.
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.waitForTimeout(600);

    const offenders = await page.evaluate(() => {
      const arabic = /[؀-ۿ]/;
      const bad: { tag: string; cls: string; fam: string; text: string }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = (n.nodeValue || "").trim();
        if (!t || !arabic.test(t)) continue;
        const el = n.parentElement;
        if (!el) continue;
        const fam = getComputedStyle(el).fontFamily;
        const isLatin = /Hanken|Plex.?Mono/i.test(fam) && !/Plex.?Sans.?Arabic/i.test(fam);
        if (isLatin) bad.push({ tag: el.tagName, cls: el.className.toString().slice(0, 40), fam: fam.split(",")[0], text: t.slice(0, 24) });
      }
      return bad;
    });

    expect(offenders, `Arabic text nodes in Latin/Mono on ${route}: ${JSON.stringify(offenders.slice(0, 10), null, 2)}`).toEqual([]);
  });
}
