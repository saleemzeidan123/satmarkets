import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, nearest, walkMinutes, relevanceFor, WALKABLE_KM, type Anchor } from "./locationFacts";

const A = (o: Partial<Anchor>): Anchor => ({ kind: "metro", name_en: "X", name_ar: "س", line: "Blue line", lat: 0, lng: 0, ...o });

test("haversine: known Riyadh spans are in the right ballpark", () => {
  // KAFD (24.7680,46.6436) to Qasr Al Hokm (24.6286,46.7161): ~16-17 km straight line
  const d = haversineKm(24.7680, 46.6436, 24.6286, 46.7161);
  assert.ok(d > 15 && d < 18, `expected ~16km, got ${d}`);
});

test("haversine: zero distance", () => {
  assert.equal(haversineKm(24.7, 46.6, 24.7, 46.6), 0);
});

test("nearest: picks the closest anchor of the kind", () => {
  const origin = { lat: 24.7680, lng: 46.6436, exact: true };
  const anchors = [
    A({ name_en: "Far", lat: 24.60, lng: 46.80 }),
    A({ name_en: "Near", lat: 24.7690, lng: 46.6440 }),
    A({ name_en: "Mid", lat: 24.72, lng: 46.66 }),
  ];
  const r = nearest(origin, anchors, "metro");
  assert.equal(r?.anchor.name_en, "Near");
});

test("nearest: ignores other kinds and returns null when none match", () => {
  const origin = { lat: 24.7, lng: 46.6, exact: true };
  const anchors = [A({ kind: "airport", name_en: "KKIA", lat: 24.95, lng: 46.70 })];
  assert.equal(nearest(origin, anchors, "metro"), null);
  assert.equal(nearest(origin, anchors, "airport")?.anchor.name_en, "KKIA");
});

test("walkMinutes: ~1.2km is ~15 min, never below 1", () => {
  assert.equal(walkMinutes(1.2), 15);
  assert.equal(walkMinutes(0.01), 1);
});

test("relevance: logistics demotes transit, retail demotes airport, office shows all", () => {
  assert.deepEqual(relevanceFor("warehouse"), { primary: ["airport"], less: ["metro", "rail"] });
  assert.deepEqual(relevanceFor("retail"), { primary: ["metro", "rail"], less: ["airport"] });
  assert.deepEqual(relevanceFor("office"), { primary: ["metro", "rail", "airport"], less: [] });
  assert.deepEqual(relevanceFor("land"), { primary: ["metro", "rail", "airport"], less: [] });
});

test("WALKABLE_KM threshold is a sane walking cap", () => {
  assert.ok(WALKABLE_KM >= 1 && WALKABLE_KM <= 2);
});
