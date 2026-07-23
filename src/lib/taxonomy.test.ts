import { test } from "node:test";
import assert from "node:assert/strict";
import { coerceKind, isLocationKind, kindLabel, locationUmbrella, isDevelopment, LOCATION_KINDS } from "./locationKind";
import { releaseLabel, stateTone, RELEASE_STATES } from "./releaseState";

// WS04: a development is never a district.
test("location kind: developments are labelled as developments, never districts", () => {
  assert.equal(kindLabel("development", false), "Development");
  assert.equal(kindLabel("development", true), "مشروع تطويري");
  assert.notEqual(kindLabel("development", false), kindLabel("district", false));
  assert.notEqual(kindLabel("development", true), "حي");
  assert.ok(isDevelopment("development"));
  assert.ok(!isDevelopment("district"));
});

test("location kind: unknown or legacy kinds fall back to neutral area, never district", () => {
  assert.equal(coerceKind(null), "area");
  assert.equal(coerceKind(undefined), "area");
  assert.equal(coerceKind("neighbourhood"), "area");
  assert.equal(coerceKind(""), "area");
  assert.notEqual(coerceKind("garbage"), "district");
  assert.ok(!isLocationKind("garbage"));
  assert.ok(isLocationKind("development"));
});

test("location kind: mixed lists use the neutral Location umbrella, not District", () => {
  assert.equal(locationUmbrella(false), "Location");
  assert.equal(locationUmbrella(true), "الموقع");
  assert.ok(!/district/i.test(locationUmbrella(false)));
  assert.ok(!/حي/.test(locationUmbrella(true)));
});

test("location kind: every kind has a bilingual label", () => {
  for (const k of LOCATION_KINDS) {
    assert.ok(kindLabel(k, false).length > 0);
    assert.ok(kindLabel(k, true).length > 0);
  }
});

// WS05: every release state has an approved bilingual label and a tone.
test("release state: all states have EN and AR labels and a tone", () => {
  for (const s of RELEASE_STATES) {
    const en = releaseLabel(s, false), ar = releaseLabel(s, true);
    assert.ok(en.length > 0, `${s} missing EN`);
    assert.ok(ar.length > 0, `${s} missing AR`);
    assert.notEqual(en, ar, `${s} EN and AR should differ`);
    assert.ok(["positive", "attention", "neutral"].includes(stateTone(s)));
  }
});

test("release state: sample and preview are neutral, verified and available positive, reconfirm is attention", () => {
  assert.equal(stateTone("preview"), "neutral");
  assert.equal(stateTone("sample"), "neutral");
  assert.equal(stateTone("planned"), "neutral");
  assert.equal(stateTone("verified"), "positive");
  assert.equal(stateTone("available"), "positive");
  assert.equal(stateTone("reconfirm"), "attention");
});
