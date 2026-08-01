import { test } from "node:test";
import assert from "node:assert";
import { nearestLocation, locationById, distanceKm, type LocationPoint } from "./nearestLocation";

const DISTRICTS: LocationPoint[] = [
  { id: "olaya", name_en: "Al Olaya", city: "Riyadh", lat: 24.6949, lng: 46.6853 },
  { id: "granada", name_en: "Granada", city: "Riyadh", lat: 24.7743, lng: 46.7386 },
  { id: "corniche", name_en: "Corniche", city: "Jeddah", lat: 21.5810, lng: 39.1360 },
];

test("distanceKm is roughly correct for a known pair", () => {
  // Al Olaya to Granada is ~10 to 12 km
  const km = distanceKm(24.6949, 46.6853, 24.7743, 46.7386);
  assert.ok(km > 8 && km < 15, `expected ~10km, got ${km}`);
  assert.equal(distanceKm(24.6949, 46.6853, 24.6949, 46.6853), 0);
});

test("a point next to Al Olaya resolves to Al Olaya, not Jeddah", () => {
  const d = nearestLocation(24.696, 46.686, DISTRICTS);
  assert.equal(d?.id, "olaya");
});

test("a point in Jeddah resolves to the Jeddah district", () => {
  const d = nearestLocation(21.585, 39.140, DISTRICTS);
  assert.equal(d?.id, "corniche");
});

test("invalid coordinates or empty list yield null", () => {
  assert.equal(nearestLocation(NaN, 46, DISTRICTS), null);
  assert.equal(nearestLocation(24.7, 46.7, []), null);
});

test("districts with missing centroids are skipped, not chosen", () => {
  const withHole: LocationPoint[] = [
    { id: "nogeo", name_en: "No geo", lat: NaN as unknown as number, lng: NaN as unknown as number },
    { id: "olaya", name_en: "Al Olaya", lat: 24.6949, lng: 46.6853 },
  ];
  assert.equal(nearestLocation(24.70, 46.69, withHole)?.id, "olaya");
});

test("kind travels with the row, so a caller can refuse to call a development a district", () => {
  const mixed: LocationPoint[] = [
    { id: "kafd", name_en: "KAFD", kind: "development", lat: 24.7616, lng: 46.6386 },
    { id: "olaya", name_en: "Al Olaya", kind: "district", lat: 24.6926, lng: 46.6857 },
  ];
  const hit = nearestLocation(24.7616, 46.6386, mixed);
  assert.equal(hit?.id, "kafd");
  assert.equal(hit?.kind, "development");
});

test("locationById resolves what is already recorded, and null when it is not in the set", () => {
  assert.equal(locationById("granada", DISTRICTS)?.name_en, "Granada");
  assert.equal(locationById("missing", DISTRICTS), null);
  assert.equal(locationById(null, DISTRICTS), null);
  assert.equal(locationById(undefined, DISTRICTS), null);
});
