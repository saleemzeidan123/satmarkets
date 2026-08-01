import { test } from "node:test";
import assert from "node:assert";
import {
  assessLocationConsistency,
  isLocationContradicted,
  CONTRADICTION_KM,
} from "./locationConsistency";
import type { LocationPoint } from "./nearestLocation";

const OLAYA: LocationPoint = {
  id: "olaya", name_en: "Al Olaya", name_ar: "العليا", city: "riyadh", kind: "district", lat: 24.6926, lng: 46.6857,
};
const KAFD: LocationPoint = {
  id: "kafd", name_en: "KAFD", name_ar: "كافد", city: "riyadh", kind: "development", lat: 24.7616, lng: 46.6386,
};
const CORNICHE: LocationPoint = {
  id: "corniche", name_en: "Corniche", name_ar: "الكورنيش", city: "jeddah", kind: "district", lat: 21.581, lng: 39.136,
};
const NO_POINT: LocationPoint = {
  id: "nogeo", name_en: "No geo", city: "riyadh", kind: "district",
  lat: NaN as unknown as number, lng: NaN as unknown as number,
};

test("no pin and no recorded location are states, not accusations", () => {
  const a = assessLocationConsistency({ lat: null, lng: null, recorded: OLAYA });
  assert.equal(a.verdict, "no_pin");
  assert.equal(a.statement_en, null);
  assert.ok(a.note_en && a.note_ar);

  const b = assessLocationConsistency({ lat: 24.69, lng: 46.68, recorded: null });
  assert.equal(b.verdict, "no_location_recorded");
  assert.equal(b.statement_ar, null);
});

test("a recorded location with no point on file is unverifiable, never contradicted", () => {
  const a = assessLocationConsistency({ lat: 21.58, lng: 39.13, recorded: NO_POINT });
  assert.equal(a.verdict, "unverifiable");
  assert.equal(a.distanceKm, null);
  assert.equal(isLocationContradicted(a), false);
});

test("a pin beside the recorded location is consistent but never verified", () => {
  const a = assessLocationConsistency({ lat: 24.695, lng: 46.688, recorded: OLAYA, nearest: OLAYA });
  assert.equal(a.verdict, "consistent_unverified");
  assert.equal(a.statement_en, null);
  assert.ok((a.distanceKm ?? 99) < 1);
  // The note must say out loud that agreement is not confirmation.
  assert.match(a.note_en ?? "", /not a confirmed match/);
});

test("a pin in another city contradicts, in both languages, and names the city problem", () => {
  const a = assessLocationConsistency({ lat: 24.7616, lng: 46.6386, recorded: CORNICHE, nearest: KAFD });
  assert.equal(a.verdict, "contradicted");
  assert.ok(isLocationContradicted(a));
  assert.deepEqual([...a.reasons], ["far_from_recorded_location", "different_city"]);
  assert.match(a.statement_en ?? "", /different city/);
  assert.match(a.statement_ar ?? "", /مدينة/);
  assert.match(a.statement_en ?? "", /Corniche \(District\)/);
  assert.match(a.statement_ar ?? "", /الكورنيش \(حي\)/);
});

test("a far pin inside one city states the distance in Western numerals in both languages", () => {
  const a = assessLocationConsistency({ lat: 25.2, lng: 46.6857, recorded: OLAYA, nearest: OLAYA });
  assert.equal(a.verdict, "contradicted");
  assert.deepEqual([...a.reasons], ["far_from_recorded_location"]);
  const km = Math.round(a.distanceKm ?? 0);
  assert.ok(km > CONTRADICTION_KM, `expected a contradicting distance, got ${km}`);
  assert.ok((a.statement_en ?? "").includes(`${km} km`));
  assert.ok((a.statement_ar ?? "").includes(`${km} كم`));
  assert.equal(/[٠-٩۰-۹]/.test(a.statement_ar ?? ""), false);
});

test("Law 7: a development recorded as the location is never called a district", () => {
  const a = assessLocationConsistency({ lat: 21.581, lng: 39.136, recorded: KAFD, nearest: CORNICHE });
  assert.equal(a.verdict, "contradicted");
  assert.match(a.statement_en ?? "", /KAFD \(Development\)/);
  assert.match(a.statement_ar ?? "", /كافد \(مشروع تطويري\)/);
  assert.equal(/District/.test(a.statement_en ?? ""), false);
  assert.equal(/حي/.test(a.statement_ar ?? ""), false);
});

test("an unknown kind gets no invented descriptor and no invented parenthesis", () => {
  const odd: LocationPoint = { id: "x", name_en: "Somewhere", name_ar: "مكان ما", city: "riyadh", kind: null, lat: 24.69, lng: 46.68 };
  const a = assessLocationConsistency({ lat: 21.581, lng: 39.136, recorded: odd });
  assert.equal(a.verdict, "contradicted");
  assert.ok((a.statement_en ?? "").includes("Somewhere"));
  assert.equal((a.statement_en ?? "").includes("("), false);
});

test("the threshold is the published constant, and just below it does not accuse", () => {
  // 0.2 degrees of latitude is about 22 km, which is under the floor by design.
  const near = assessLocationConsistency({ lat: 24.6926 + 0.2, lng: 46.6857, recorded: OLAYA });
  assert.ok((near.distanceKm ?? 0) < CONTRADICTION_KM);
  assert.equal(near.verdict, "consistent_unverified");
  assert.ok(CONTRADICTION_KM >= 20, "the floor must stay generous; see the module header");
});

test("no input can ever produce a verified verdict, because no boundary data exists", () => {
  const cases = [
    { lat: 24.6926, lng: 46.6857, recorded: OLAYA, nearest: OLAYA },
    { lat: null, lng: null, recorded: OLAYA },
    { lat: 24.7, lng: 46.7, recorded: null },
    { lat: 24.7, lng: 46.7, recorded: NO_POINT },
    { lat: 21.5, lng: 39.1, recorded: OLAYA, nearest: CORNICHE },
  ];
  for (const c of cases) {
    const v = assessLocationConsistency(c);
    assert.notEqual(v.verdict as string, "verified");
    // Law 2. Built from the code point so this file does not itself carry one.
    const emDash = String.fromCharCode(8212);
    assert.equal((v.statement_en ?? "").includes(emDash), false);
    assert.equal((v.note_ar ?? "").includes(emDash), false);
  }
});
