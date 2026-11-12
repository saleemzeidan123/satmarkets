import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidShotKey,
  isValidMediaScope,
  isValidMediaCondition,
  MEDIA_SCOPES,
  MEDIA_CONDITIONS,
} from "./mediaCategorization";
import { mediaStandardFor } from "./mediaStandard";

// PKG-LISTING-CREATION-1B outcome B. This is the pure logic the categorize
// route (media/[mediaId]/route.ts PATCH) trusts to decide whether a shot key
// really belongs to a listing's asset type, so it is tested directly rather
// than through the route, matching this repository's convention of testing
// src/lib logic rather than mocking a Next.js route handler.

test("shot key: null is always valid, for any asset type including an unknown one", () => {
  assert.equal(isValidShotKey("warehouse", null), true);
  assert.equal(isValidShotKey("office", null), true);
  assert.equal(isValidShotKey("something_nobody_configured", null), true);
});

test("shot key: a real shot for this asset type is valid", () => {
  assert.equal(isValidShotKey("warehouse", "loading"), true);
  assert.equal(isValidShotKey("retail", "frontage"), true);
  // A base shot every asset type carries.
  assert.equal(isValidShotKey("warehouse", "approach"), true);
  assert.equal(isValidShotKey("office", "approach"), true);
});

test("shot key: a shot that belongs to a different asset type is rejected", () => {
  // "loading" is a warehouse shot (loading doors); an office has no such view.
  assert.equal(isValidShotKey("office", "loading"), false);
  // "floorplate" is an office shot; a warehouse has no such view.
  assert.equal(isValidShotKey("warehouse", "floorplate"), false);
});

test("shot key: an asset type outside the specific briefs gets only the base shots", () => {
  const std = mediaStandardFor("something_nobody_configured");
  for (const s of std.shots) assert.equal(isValidShotKey("something_nobody_configured", s.key), true);
  assert.equal(isValidShotKey("something_nobody_configured", "loading"), false);
});

test("shot key: an empty string or nonsense value is rejected, not silently accepted", () => {
  assert.equal(isValidShotKey("warehouse", ""), false);
  assert.equal(isValidShotKey("warehouse", "not_a_real_shot"), false);
  assert.equal(isValidShotKey("warehouse", "LOADING"), false);
});

test("shot key: every shot for every known asset type validates against that same type", () => {
  for (const t of [
    "office", "serviced", "retail", "showroom", "medical", "warehouse",
    "self_storage", "education", "hospitality", "land", "mixed_use",
    "gas_station", "wedding_hall", "worker_housing", "entertainment",
  ]) {
    for (const s of mediaStandardFor(t).shots) {
      assert.equal(isValidShotKey(t, s.key), true, `${s.key} should validate for ${t}`);
    }
  }
});

test("media scope: null and the two real values are valid", () => {
  assert.equal(isValidMediaScope(null), true);
  assert.equal(isValidMediaScope("building"), true);
  assert.equal(isValidMediaScope("unit"), true);
});

test("media scope: anything else is rejected", () => {
  assert.equal(isValidMediaScope(""), false);
  assert.equal(isValidMediaScope("Building"), false);
  assert.equal(isValidMediaScope("floor"), false);
});

test("media condition: null and the two real values are valid", () => {
  assert.equal(isValidMediaCondition(null), true);
  assert.equal(isValidMediaCondition("current"), true);
  assert.equal(isValidMediaCondition("illustrative"), true);
});

test("media condition: anything else is rejected", () => {
  assert.equal(isValidMediaCondition(""), false);
  assert.equal(isValidMediaCondition("Current"), false);
  assert.equal(isValidMediaCondition("staged"), false);
});

test("the exported vocabularies are exactly the two values each column's check constraint allows", () => {
  // Mirrors supabase/migrations/20260902b_pkg1b_media_categorization.sql's own
  // check (media_scope in ('building', 'unit')) and check (media_condition in
  // ('current', 'illustrative')). A drift here would validate a value the
  // database itself would refuse, or refuse one the database would accept.
  assert.deepEqual([...MEDIA_SCOPES].sort(), ["building", "unit"]);
  assert.deepEqual([...MEDIA_CONDITIONS].sort(), ["current", "illustrative"]);
});
