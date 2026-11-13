import { test } from "node:test";
import assert from "node:assert/strict";
import { AREA_TOLERANCE, scaleBarMetres, spacePlanOf } from "./spaceDrawing";
import { ASSET_FIELDS } from "./assetFields";

// The owner ruling of 2026-11-13, as tests: a space is drawn to scale only when
// the lister entered every size the drawing needs and those sizes agree with
// the stated area.

const retail = (attributes: Record<string, unknown>, area_sqm: unknown = 150) => ({ asset_type: "retail", area_sqm, attributes });

test("a retail unit with frontage, depth and an agreeing area earns a plan", () => {
  const p = spacePlanOf(retail({ frontage_m: 8, unit_depth_m: 20 }));
  assert.ok(p, "8 m by 20 m is 160 m2, within a tenth of 150 m2");
  assert.equal(p!.product, 160);
  assert.equal(p!.area, 150);
  assert.equal(p!.frontage, 8);
  assert.equal(p!.depth, 20);
});

test("a missing size means no plan, whichever size it is", () => {
  assert.equal(spacePlanOf(retail({ unit_depth_m: 20 })), null, "no frontage");
  assert.equal(spacePlanOf(retail({ frontage_m: 8 })), null, "no depth");
  assert.equal(spacePlanOf(retail({ frontage_m: 8, unit_depth_m: 20 }, null)), null, "no stated area");
  assert.equal(spacePlanOf(retail({ frontage_m: "", unit_depth_m: 20 })), null, "an empty string is not a size");
  assert.equal(spacePlanOf(retail({ frontage_m: 0, unit_depth_m: 20 })), null, "zero is not a size");
  assert.equal(spacePlanOf(retail({ frontage_m: "abc", unit_depth_m: 20 })), null, "a word is not a size");
  assert.equal(spacePlanOf({ asset_type: "retail", area_sqm: 150 }), null, "no attributes at all");
});

test("sizes that disagree with the stated area mean no plan", () => {
  // 8 by 20 is 160. Against 200 that is a fifth short; against 120 a third over.
  assert.equal(spacePlanOf(retail({ frontage_m: 8, unit_depth_m: 20 }, 200)), null);
  assert.equal(spacePlanOf(retail({ frontage_m: 8, unit_depth_m: 20 }, 120)), null);
});

test("the tolerance is a tenth of the stated area, and the boundary is inside it", () => {
  assert.equal(AREA_TOLERANCE, 0.1);
  // 10 by 11 is 110, exactly a tenth over 100.
  assert.ok(spacePlanOf(retail({ frontage_m: 10, unit_depth_m: 11 }, 100)), "exactly a tenth over is still agreement");
  assert.equal(spacePlanOf(retail({ frontage_m: 10, unit_depth_m: 11.2 }, 100)), null, "more than a tenth over is not");
  assert.ok(spacePlanOf(retail({ frontage_m: 10, unit_depth_m: 9 }, 100)), "exactly a tenth under is still agreement");
  assert.equal(spacePlanOf(retail({ frontage_m: 10, unit_depth_m: 8.9 }, 100)), null, "more than a tenth under is not");
});

test("an asset type whose form does not record both sides is never drawn", () => {
  // An office with numbers under the same keys has not been asked for them by
  // its form, so they are not that listing's recorded sizes.
  assert.equal(spacePlanOf({ asset_type: "office", area_sqm: 160, attributes: { frontage_m: 8, unit_depth_m: 20 } }), null);
  assert.equal(spacePlanOf({ asset_type: "warehouse", area_sqm: 160, attributes: { frontage_m: 8, unit_depth_m: 20 } }), null);
  assert.equal(spacePlanOf({ asset_type: "no_such_type", area_sqm: 160, attributes: { frontage_m: 8, unit_depth_m: 20 } }), null);
});

test("the set of drawable types is read from the registry and is stated here so a change is noticed", () => {
  const drawable = Object.keys(ASSET_FIELDS)
    .filter((t) => ASSET_FIELDS[t].some((f) => f.key === "frontage_m") && ASSET_FIELDS[t].some((f) => f.key === "unit_depth_m"))
    .sort();
  assert.deepEqual(drawable, ["retail"], "the asset types whose form records a frontage and a depth changed; the listing page will now draw (or stop drawing) them, so confirm that is intended");
});

test("the scale bar is a round length no longer than two fifths of the frontage", () => {
  assert.equal(scaleBarMetres(8), 2);
  assert.equal(scaleBarMetres(12.5), 5);
  assert.equal(scaleBarMetres(30), 10);
  assert.equal(scaleBarMetres(60), 20);
  assert.equal(scaleBarMetres(200), 50);
  assert.equal(scaleBarMetres(1.5), 1, "never shorter than a metre");
});

// ---------------------------------------------------------------------------
// The listing page, held to the two owner rulings at source level. No React
// renderer runs in `npm test`, the constraint every law test here states.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";

const PAGE = fs.readFileSync(path.join(import.meta.dirname, "../app/[locale]/listings/[id]/page.tsx"), "utf8");
const PAGE_CODE = PAGE.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");

test("the listing page draws a space only through spacePlanOf", () => {
  assert.match(PAGE_CODE, /const plan = spacePlanOf\(l as any\); return plan \? <SpaceDrawing plan=\{plan\} t=\{dict\.ld\} ar=\{ar\} \/> : null;/, "the drawing must be gated on spacePlanOf and on nothing else");
  assert.equal((PAGE_CODE.match(/<SpaceDrawing\b/g) || []).length, 1, "the drawing has exactly one call site on the page");
  const drawing = fs.readFileSync(path.join(import.meta.dirname, "../components/listing/SpaceDrawing.tsx"), "utf8");
  assert.match(drawing, /role="img" [^>]*aria-label=\{fill\(t\.drawAlt/, "the drawing must be named for assistive technology by the sizes it shows");
  assert.match(drawing, /fill\(t\.drawNote, \{/, "the drawing must state, in words, the two sizes, the area they make and the area stated");
});

test("the listing page shows a listing's own photographs or none, never a library photograph", () => {
  assert.doesNotMatch(PAGE_CODE, /photoFor|@\/lib\/photos/, "the listing page must not reach for the library photographs in src/lib/photos.ts");
  assert.match(PAGE_CODE, /mediaPhotos\.length > 1 \?/, "several photographs go to the gallery");
  assert.match(PAGE_CODE, /mediaPhotos\.length === 1 \?/, "one photograph is shown as itself");
  assert.match(PAGE_CODE, /\{mediaDataOk \? dict\.ld\.noPhotos : dict\.ld\.mediaUnavailable\}/, "no photograph is said in words, and a failed read is still told apart from an empty one");
  assert.match(PAGE_CODE, /<Photo src=\{mediaPhotos\[0\]\}/, "the single photograph must be the listing's own");
});

test("the facts grid is handed the asking figure the page worked out", () => {
  // `factsGridTiles` reads `price`. The listing row has no such column, so the
  // bare row printed "On request" beside a rail that printed the figure.
  assert.match(PAGE_CODE, /factsGridTiles\(\{ \.\.\.\(l as any\), price \}, dict, lp\)/, "the page must pass the resolved price to factsGridTiles");
  assert.doesNotMatch(PAGE_CODE, /factsGridTiles\(l, dict, lp\)/, "the bare row carries no `price` field");
});

test("the drawing's wording exists in both languages and names the tolerance it applies", () => {
  for (const lang of ["en", "ar"]) {
    const d = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, `../i18n/dictionaries/${lang}.json`), "utf8")).ld;
    for (const k of ["drawTitle", "drawAlt", "drawNote", "drawStreet", "noPhotos", "crumbAria"]) {
      assert.ok(typeof d[k] === "string" && d[k].length > 0, `ld.${k} is missing from ${lang}.json`);
    }
    for (const v of ["{frontage}", "{depth}", "{product}", "{area}"]) assert.ok(d.drawNote.includes(v), `ld.drawNote in ${lang}.json must state ${v}`);
    assert.ok(d.drawNote.includes(String(Math.round(AREA_TOLERANCE * 100))), `ld.drawNote in ${lang}.json must state the tolerance spacePlanOf applies`);
  }
});
