import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP } from "../theme/palette";

// RC12, finding 165. The listings map draws two kinds of mark on one canvas: a
// district bubble, which stands for however many spaces are inside a district
// and carries that number as a numeral, and an exact building pin, which stands
// for one building. Before this slice both painted `circle-color` from
// `MAP.pin` and `circle-stroke-color` from `MAP.pinStroke`, so they were the
// same colour in the same shape and the only thing separating them was radius,
// 16-to-34 against a flat 6.5.
//
// Radius is a sensory characteristic (SC 1.3.3) and it is also DATA here: the
// bubble's radius scales by count, so at the small end of the scale a district
// holding one space and a building were nearly the same mark. The legend
// repeated the problem by drawing both swatches as Harbor discs 13px and 11px
// across, which asks a reader to tell two things apart by comparing two sizes
// with nothing between them.
//
// The repair is an inversion, not a recolour: solid Harbor disc means an
// aggregate, Paper disc with a Harbor ring means one building. This file holds
// that the two marks keep differing by something other than size, that the
// legend keeps mirroring the canvas, and that the legend keeps SAYING which
// form is which rather than leaving the swatches to carry it alone.

const SRC = "src/components/ListingsMap.tsx";
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** The paint block of one addLayer call, located by its layer id. */
function layer(code: string, id: string): string {
  const at = code.indexOf(`id: "${id}"`);
  assert.ok(at > 0, `the map no longer declares a layer called ${id}`);
  const paint = code.indexOf("paint:", at);
  assert.ok(paint > at, `layer ${id} declares no paint`);
  // Layers are declared one per statement, so the next `addLayer` bounds this one.
  const next = code.indexOf("addLayer", at + 1);
  return code.slice(paint, next > 0 ? next : code.length);
}

test("the district bubble and the building pin do not share a fill", () => {
  const code = codeOnly(readFileSync(SRC, "utf8"));
  const district = layer(code, "d-c");
  const building = layer(code, "p-c");

  assert.ok(district.includes("MAP.pin"), "the district bubble no longer fills from the pin role");
  assert.ok(
    building.includes('"circle-color": MAP.exactFill'),
    "the building pin fills from something other than the exact-building role",
  );
  assert.ok(
    building.includes('"circle-stroke-color": MAP.exactRing'),
    "the building pin rings with something other than the exact-building role",
  );
  assert.equal(
    /"circle-color":\s*MAP\.pin\b/.test(building),
    false,
    "the building pin is painted the district colour again, which is finding 165",
  );
});

test("the inversion is a real inversion in the palette, not two names for one value", () => {
  // If these ever resolve to the same value the marks are identical again, and
  // the test above would still pass because it only reads names.
  assert.notEqual(MAP.exactFill, MAP.exactRing, "the building pin's fill and ring are the same colour");
  assert.notEqual(MAP.exactFill, MAP.pin, "the building pin fills with the district bubble's colour");
  assert.equal(MAP.exactRing, MAP.pin, "the ring left the Harbor family, so the two marks no longer read as one system");
  assert.equal(MAP.exactFill, MAP.pinStroke, "the building pin's fill is no longer the district bubble's stroke");
});

test("the pin stays smaller than the smallest bubble, so size still orders them", () => {
  const code = codeOnly(readFileSync(SRC, "utf8"));
  const building = layer(code, "p-c");
  const r = /"circle-radius":\s*([\d.]+)/.exec(building);
  assert.ok(r, "the building pin no longer declares a flat radius");
  const radius = Number(r![1]);
  // RADIUS interpolates from 16 at a count of 1. A pin at or above that would
  // invert the size ordering the map has always had.
  const floor = /RADIUS\s*=\s*\["interpolate",\s*\["linear"\],\s*\["get",\s*"count"\],\s*1,\s*(\d+)/.exec(code);
  assert.ok(floor, "the district radius ramp is not where this test expects it");
  assert.ok(
    radius < Number(floor![1]),
    `the building pin (${radius}) is not smaller than the smallest district bubble (${floor![1]})`,
  );
  const w = /"circle-stroke-width":\s*([\d.]+)/.exec(building);
  assert.ok(w && Number(w[1]) >= 2, "the ring is too thin to read as a ring at this radius");
});

test("the legend swatches differ by fill, not only by size", () => {
  const code = readFileSync(SRC, "utf8");
  const swatches = [...code.matchAll(/<span aria-hidden="true" style=\{\{([^}]*)\}\}/g)].map((m) => m[1]);
  assert.equal(swatches.length, 2, "the legend no longer draws exactly two swatches");
  const bg = swatches.map((s) => /background:\s*"([^"]+)"/.exec(s)?.[1]);
  assert.deepEqual(bg, ["var(--harbor)", "var(--paper)"], "the legend swatches share a fill again");
  assert.ok(swatches[1].includes('border: "2.5px solid var(--harbor)"'), "the building swatch is no longer a ring");
  // Both 13px, so nothing in the legend is told apart by size any more.
  const size = swatches.map((s) => /width:\s*(\d+)/.exec(s)?.[1]);
  assert.deepEqual(size, ["13", "13"], "the legend went back to distinguishing its two entries by size");
});

test("the legend names the form in both languages", () => {
  const code = readFileSync(SRC, "utf8");
  const grab = (k: string) => [...code.matchAll(new RegExp(k + ':\\s*"([^"]+)"', "g"))].map((m) => m[1]);
  const district = grab("legendDistrict");
  const building = grab("legendBuilding");
  assert.equal(district.length, 2, "legendDistrict is not stated in both languages");
  assert.equal(building.length, 2, "legendBuilding is not stated in both languages");

  const [ar1, en1] = district;
  const [ar2, en2] = building;
  assert.match(ar1, /[؀-ۿ]/);
  assert.match(ar2, /[؀-ۿ]/);
  // The form word is stated alongside the meaning, which is the way round
  // SC 1.3.3 asks for: the sensory characteristic may be named, it may not be
  // the only thing said.
  assert.match(en1, /solid dot/i);
  assert.match(en2, /ring/i);
  assert.ok(ar1.includes("مصمتة"), "the Arabic district legend no longer names the form");
  assert.ok(ar2.includes("حلقة"), "the Arabic building legend no longer names the form");
  // And the district is a district. This legend used to say "منطقة", region,
  // where every other Arabic string on the surface says "حي".
  assert.ok(ar1.includes("حي"), "the Arabic legend renames the thing it is explaining");
  assert.equal(ar1.includes("منطقة"), false, "the Arabic legend calls a district a region again");
});

test("the marks the legend explains are the marks the canvas draws", () => {
  // A legend is only true if it mirrors the paint. Harbor fill on the canvas,
  // Harbor fill in the swatch; Paper fill on the canvas, Paper fill in the swatch.
  const code = readFileSync(SRC, "utf8");
  assert.ok(MAP.pin.toUpperCase().startsWith("#"), "the district colour is no longer a literal");
  const css = readFileSync("src/styles/sat-platform.css", "utf8");
  const harbor = /--harbor:\s*(#[0-9A-Fa-f]{6})/.exec(css)?.[1];
  const paper = /--paper:\s*(#[0-9A-Fa-f]{6})/.exec(css)?.[1];
  assert.ok(harbor && paper, "the harbor or paper token is not where this test expects it");
  assert.equal(harbor!.toUpperCase(), MAP.pin.toUpperCase(), "the CSS token and the paint value drifted apart");
  assert.equal(paper!.toUpperCase(), MAP.exactFill.toUpperCase(), "the CSS token and the paint value drifted apart");
  assert.ok(code.includes('background: "var(--harbor)"') && code.includes('background: "var(--paper)"'));
});
