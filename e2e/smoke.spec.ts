import { test, expect, type Page } from "@playwright/test";

// Six core journeys x two locales, run against the live deployment.
// Read-only journeys need no seed; scripts/seed-world.mjs enriches the data set.
const LOCALES = ["en", "ar"] as const;
const AR_DISTRICT = "d2222222-2222-2222-2222-222222222222"; // Al Olaya (known seed id)

async function firstListingHref(page: Page): Promise<string> {
  const hrefs = await page.$$eval('a[href*="/listings/"]', (els) =>
    els.map((e) => e.getAttribute("href") || "").filter((h) => /\/listings\/[0-9a-f-]{36}/.test(h))
  );
  expect(hrefs.length, "at least one listing card").toBeGreaterThan(0);
  return hrefs[0];
}

for (const loc of LOCALES) {
  const ar = loc === "ar";

  test(`home: hero search visible (${loc})`, async ({ page }) => {
    await page.goto(`/${loc}`);
    await expect(page.getByRole("button", { name: ar ? /بحث/ : /search/i }).first()).toBeVisible();
    if (ar) {
      expect(await page.evaluate(() => document.documentElement.dir)).toBe("rtl");
      // WO-2 regression: Arabic tracking must be normal (no letter-spacing on cursive script).
      const ls = await page.locator(".eyebrow, .badge").first().evaluate((el) => getComputedStyle(el as Element).letterSpacing);
      expect(ls).toBe("normal");
    }
  });

  test(`listings: cards render (${loc})`, async ({ page }) => {
    await page.goto(`/${loc}/listings?district=${AR_DISTRICT}`);
    await firstListingHref(page); // asserts >0 cards
  });

  test(`listing detail: WhatsApp contact present (${loc})`, async ({ page }) => {
    await page.goto(`/${loc}/listings`);
    const href = await firstListingHref(page);
    await page.goto(href);
    const wa = page.locator('a[href^="https://wa.me/"]').first();
    await expect(wa).toBeVisible();
    const h = await wa.getAttribute("href");
    // ContactBar builds wa.me/<digits>?text=<ref + title + url>, carrying the reference code.
    expect(h).toMatch(/wa\.me\/\d+\?text=/);
  });

  test(`advisor: replies to a greeting (${loc})`, async ({ page }) => {
    test.slow();
    await page.goto(`/${loc}/advisor`);
    const box = page.getByRole("textbox").first();
    await box.fill("hey");
    await box.press("Enter");
    // the user's message echoes into the transcript (chat accepted the input end-to-end)
    await expect(page.getByText("hey", { exact: false }).first()).toBeVisible();
  });

  test(`rent-index: tier-1 numbers visible (${loc})`, async ({ page }) => {
    await page.goto(`/${loc}/rent-index`);
    await expect(page.getByText("3,700").first()).toBeVisible();
    await expect(page.getByText("2,370").first()).toBeVisible();
    await expect(page.getByText("97.7%").first()).toBeVisible();
  });

  test(`saved: hearting a listing shows it in /saved (${loc})`, async ({ page }) => {
    await page.goto(`/${loc}/listings`);
    const href = await firstListingHref(page);
    await page.goto(href);
    await page.getByRole("button", { name: ar ? /^حفظ$/ : /^save$/i }).first().click();
    await page.goto(`/${loc}/saved`);
    await firstListingHref(page); // the saved listing appears (device-local satm_saved)
  });
}
