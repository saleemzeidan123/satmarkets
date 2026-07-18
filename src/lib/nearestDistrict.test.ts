import { test } from "node:test";
import assert from "node:assert";
import { nearestDistrict, distanceKm, type DistrictPoint } from "./nearestDistrict";

const DISTRICTS: DistrictPoint[] = [
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
  const d = nearestDistrict(24.696, 46.686, DISTRICTS);
  assert.equal(d?.id, "olaya");
});

test("a point in Jeddah resolves to the Jeddah district", () => {
  const d = nearestDistrict(21.585, 39.140, DISTRICTS);
  assert.equal(d?.id, "corniche");
});

test("invalid coordinates or empty list yield null", () => {
  assert.equal(nearestDistrict(NaN, 46, DISTRICTS), null);
  assert.equal(nearestDistrict(24.7, 46.7, []), null);
});

test("districts with missing centroids are skipped, not chosen", () => {
  const withHole: DistrictPoint[] = [
    { id: "nogeo", name_en: "No geo", lat: NaN as unknown as number, lng: NaN as unknown as number },
    { id: "olaya", name_en: "Al Olaya", lat: 24.6949, lng: 46.6853 },
  ];
  assert.equal(nearestDistrict(24.70, 46.69, withHole)?.id, "olaya");
});
