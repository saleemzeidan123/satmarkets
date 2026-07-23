import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeKind, isLocationKind, kindLabel, locationUmbrella, isDevelopment, LOCATION_KINDS } from "./locationKind";
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

test("location kind: unknown kinds are NOT coerced to area (area is a real assertion)", () => {
  // normalizeKind returns null for unknown, never a fabricated "area".
  assert.equal(normalizeKind(null), null);
  assert.equal(normalizeKind(undefined), null);
  assert.equal(normalizeKind("neighbourhood"), null);
  assert.equal(normalizeKind(""), null);
  assert.equal(normalizeKind("garbage"), null);
  assert.equal(normalizeKind("area"), "area"); // a real value survives
  assert.ok(!isLocationKind("garbage"));
  assert.ok(isLocationKind("development"));
  // An unknown kind labels as the neutral Location umbrella, not Area, not District.
  assert.equal(kindLabel("garbage", false), "Location");
  assert.equal(kindLabel(null, true), "الموقع");
  assert.notEqual(kindLabel("garbage", false), "Area");
  assert.notEqual(kindLabel("garbage", false), "District");
  // A real area still reads Area.
  assert.equal(kindLabel("area", false), "Area");
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
    assert.ok(["verified", "info", "attention", "neutral"].includes(stateTone(s)));
  }
});

test("release state: only verified uses the verified (green) tone; available is info, not green", () => {
  assert.equal(stateTone("verified"), "verified");
  assert.equal(stateTone("available"), "info"); // Harbor/informational, never confirmed green
  assert.notEqual(stateTone("available"), "verified");
  assert.equal(stateTone("reconfirm"), "attention");
  assert.equal(stateTone("preview"), "neutral");
  assert.equal(stateTone("sample"), "neutral");
  assert.equal(stateTone("planned"), "neutral");
  // Exactly one state may claim the verified tone.
  const verifiedStates = RELEASE_STATES.filter((s) => stateTone(s) === "verified");
  assert.deepEqual(verifiedStates, ["verified"]);
});
