import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import ListPage from "@/app/[locale]/list/page";
import { intakeStages, intakeSize, intakeRequirements } from "@/lib/listIntake";
import { studioSteps, DRAFT_REQUIRED_CHECK_KEYS, type StudioStepKind } from "@/lib/listingStudio";
import { assessListing } from "@/lib/listingQuality";
import { ASSET_FIELDS } from "@/lib/assetFields";
import { getDictionary } from "@/i18n/getDictionary";

// PKG-SUP1, finding 35.
//
// The route rendered eight `<label>` elements over zero controls. A `<label>`
// with nothing to label is not a cosmetic problem: a screen reader announces a
// field, and the user reaches for something that is not there. So the first
// guard below is a general one over the rendered markup rather than a count of
// the strings that happened to be wrong on the day, and it has its own
// sensitivity test, because a guard nobody has watched fail is a guard nobody
// knows works.
//
// The second set fixes the model. `/list` now describes the intake by computing
// it, which is only worth doing if the computation is pinned: the page claims
// every asset type shares these ten stages, and it claims the only required
// fact whose name depends on the deal is the asking figure. Both are asserted
// here rather than believed.

const LOCALES = ["en", "ar"] as const;

// Next.js 16 made route params a promise, so `ListPage` is an async server
// component and is no longer something `renderToStaticMarkup` can be handed as
// an element: the synchronous renderer has no way to await it. The component is
// therefore called as the function it is, its returned tree is awaited once, and
// that plain tree is rendered synchronously exactly as before. Nothing that this
// file asserts changes; only the shape of the call does.
const render = async (locale: string): Promise<string> =>
  renderToStaticMarkup(await ListPage({ params: Promise.resolve({ locale }) }));

/** Visible text only. Attribute values are not what a reader reads. */
const text = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

/**
 * Every `<label>` in the markup that labels nothing.
 *
 * Two legitimate shapes, and this accepts both: an explicit `for` naming the
 * `id` of a control that exists in the same document, or a control nested
 * inside the label element. Anything else is announced to a screen-reader user
 * as a field they cannot reach.
 */
function orphanLabels(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/<(?:input|textarea|select)\b[^>]*\bid="([^"]+)"/g)) ids.add(m[1]);
  const out: string[] = [];
  for (const m of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
    const attrs = m[1];
    const inner = m[2];
    const htmlFor = /\bfor="([^"]+)"/.exec(attrs);
    if (htmlFor && ids.has(htmlFor[1])) continue;
    if (/<(?:input|textarea|select)\b/.test(inner)) continue;
    out.push(text(m[0]).trim().slice(0, 80));
  }
  return out;
}

// The answers the page used to display as though a visitor had typed them.
// Kept as literals so that reintroducing any of them fails here rather than in
// front of an owner who believes they have filled a form in.
const FABRICATED = [
  "Grade A office floor",
  "Al Olaya",
  "Drag photos here",
  "Live preview",
  "High zone",
  "Your price",
  "SAR/m",
  "دور مكاتب فئة A",
  "العليا",
  "اسحب الصور هنا",
  "معاينة مباشرة",
  "سعرك",
];

test("the public listing entry has no label that labels nothing", async () => {
  for (const locale of LOCALES) {
    assert.deepEqual(
      orphanLabels(await render(locale)),
      [],
      `/${locale}/list announces a field a user cannot reach`,
    );
  }
});

test("the orphan-label guard catches the shape it was written for", () => {
  const wasHere = '<div class="field"><label>Listing title</label><div class="input"><span>Grade A office floor</span></div></div>';
  assert.equal(orphanLabels(wasHere).length, 1, "the shipped defect must be caught");
  const explicit = '<label for="t">Listing title</label><input id="t" name="t" />';
  assert.deepEqual(orphanLabels(explicit), [], "an explicit for/id pair is a real label");
  const nested = "<label>Listing title<input name=\"t\" /></label>";
  assert.deepEqual(orphanLabels(nested), [], "a wrapped control is a real label");
  const dangling = '<label for="t">Listing title</label><div id="t"></div>';
  assert.equal(orphanLabels(dangling).length, 1, "a for pointing at a non-control is still an orphan");
});

test("no answer is displayed as though a visitor had entered it", async () => {
  for (const locale of LOCALES) {
    const body = text(await render(locale));
    for (const needle of FABRICATED) {
      assert.equal(body.includes(needle), false, `/${locale}/list still shows the fabricated value ${needle}`);
    }
  }
});

test("the dictionary no longer holds the values the mock displayed", () => {
  // The markup guard above would pass if the strings moved rather than left, so
  // the keys are checked too. Deleting the page without deleting these would
  // leave the fabricated answers one import away.
  const gone = ["fTitlePh", "fLocationPh", "fFloorPh", "dragPhotos", "livePreview", "pricePlaceholder", "alOlaya", "stepAsset", "stepPricing"];
  for (const locale of LOCALES) {
    const block = getDictionary(locale).list as Record<string, unknown>;
    for (const key of gone) assert.equal(key in block, false, `list.${key} (${locale}) is a mock value and must not exist`);
  }
});

test("the page shows the real stages, in the real order, in both languages", async () => {
  for (const locale of LOCALES) {
    const body = text(await render(locale));
    const stages = intakeStages(locale === "ar");
    assert.equal(stages.length, 10);
    let at = -1;
    for (const s of stages) {
      const found = body.indexOf(s.title);
      assert.ok(found >= 0, `/${locale}/list does not show the stage "${s.title}"`);
      assert.ok(found > at, `/${locale}/list shows "${s.title}" out of intake order`);
      at = found;
      assert.ok(body.includes(s.purpose), `/${locale}/list does not say why "${s.title}" exists`);
    }
  }
});

test("the stages the page shows are the Studio's own, not a second list", () => {
  // The defect this replaces was a four-step wizard that no asset type ran.
  for (const locale of LOCALES) {
    const ar = locale === "ar";
    const shown = intakeStages(ar).map((s) => s.title);
    for (const type of Object.keys(ASSET_FIELDS)) {
      const kinds: StudioStepKind[] = [];
      for (const s of studioSteps(type)) if (!kinds.includes(s.kind)) kinds.push(s.kind);
      assert.deepEqual(
        kinds,
        intakeStages(ar).map((s) => s.kind),
        `${type} does not run the stages /list describes`,
      );
    }
    assert.equal(new Set(shown).size, shown.length, "a stage is named twice");
  }
});

test("every stage has an unsplit occurrence, so no title carries a part number", () => {
  // `partSuffix` appends ", part 1" to a stage split across two screens. That is
  // true of the step and false of the stage, so `intakeStages` takes the title
  // from an unsplit occurrence. If a stage were ever split for every asset type
  // there would be no such occurrence and the page would start saying "part 1"
  // to a visitor who has chosen nothing.
  const types = Object.keys(ASSET_FIELDS);
  for (const stage of intakeStages(false)) {
    const unsplit = types.some((t) => studioSteps(t).some((s) => s.kind === stage.kind && s.parts === 1));
    assert.ok(unsplit, `every asset type splits the ${stage.kind} stage, so its title carries a part number`);
  }
  for (const locale of LOCALES) {
    for (const stage of intakeStages(locale === "ar")) {
      assert.equal(/part \d|الجزء \d/.test(stage.title), false, `${stage.kind} (${locale}) carries a part number`);
    }
  }
});

test("the step range is computed and only stated when the ends differ", async () => {
  const size = intakeSize();
  assert.equal(size.stages, intakeStages(false).length);
  assert.ok(size.minSteps >= size.stages, "a step count cannot be smaller than the stage count");
  assert.ok(size.maxSteps >= size.minSteps);
  const counts = Object.keys(ASSET_FIELDS).map((t) => studioSteps(t).length);
  assert.equal(size.minSteps, Math.min(...counts));
  assert.equal(size.maxSteps, Math.max(...counts));
  for (const locale of LOCALES) {
    const body = text(await render(locale));
    const note = getDictionary(locale).list.stageCountNote;
    const rendered = note
      .replace("{stages}", String(size.stages))
      .replace("{min}", String(size.minSteps))
      .replace("{max}", String(size.maxSteps));
    if (size.minSteps === size.maxSteps) {
      assert.equal(body.includes(rendered), false, "the range note is shown when there is no range");
    } else {
      assert.ok(body.includes(rendered), `/${locale}/list does not state the step range`);
    }
  }
});

test("the page lists exactly what the write path refuses to save a draft without", async () => {
  for (const locale of LOCALES) {
    const ar = locale === "ar";
    const body = text(await render(locale));
    const needs = intakeRequirements(ar, getDictionary(locale).list.orWord);
    assert.deepEqual(needs.map((r) => r.key), [...DRAFT_REQUIRED_CHECK_KEYS]);
    for (const r of needs) {
      assert.ok(body.includes(r.label), `/${locale}/list does not name the required fact ${r.key}`);
      assert.ok(body.includes(r.why), `/${locale}/list does not say why ${r.key} is required`);
    }
  }
});

test("the asking figure is the only required fact whose name depends on the deal", () => {
  // `intakeRequirements` joins the two labels for exactly this reason. If a
  // second field ever diverged, the page would silently show the lease wording
  // to a seller, so the divergence is pinned rather than assumed.
  const differ: string[] = [];
  for (const type of ["office", "land"]) {
    for (const ar of [false, true]) {
      const of = (deal: string) =>
        new Map(assessListing({ asset_type: type, deal_type: deal }).checks.map((c) => [c.key, c]));
      const lease = of("lease");
      const sale = of("sale");
      for (const key of DRAFT_REQUIRED_CHECK_KEYS) {
        const a = lease.get(key);
        const b = sale.get(key);
        if (!a || !b) continue;
        const la = ar ? a.label_ar : a.label_en;
        const lb = ar ? b.label_ar : b.label_en;
        if (la !== lb && !differ.includes(key)) differ.push(key);
      }
    }
  }
  assert.deepEqual(differ, ["price"]);
  const joined = intakeRequirements(false, "or").find((r) => r.key === "price");
  assert.ok(joined && joined.label.includes(" or "), "the asking figure must name both deals");
});

test("the route carries its own metadata rather than inheriting the root title", () => {
  // Finding 12 on this route: `/list` served the root layout's generic title,
  // so a shared link and a browser tab both said the site name and nothing else.
  for (const locale of LOCALES) {
    const block = getDictionary(locale).list;
    assert.ok(block.metaTitle.length > 0 && block.metaDesc.length > 0);
    assert.ok(block.metaTitle.includes(locale === "ar" ? "سات ماركتس" : "SAT Markets"));
  }
});
