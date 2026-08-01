import { test } from "node:test";
import assert from "node:assert/strict";
import { placeName, entityName } from "@/lib/displayName";

// PKG-NM1. The two policies in `displayName.ts` differ on purpose, so they are
// tested against each other: the same row shape, the same missing field, and
// two deliberately different answers.

const LATIN = /[A-Za-z]/;

test("a district is named in the reader's own language when we hold it", () => {
  const d = { name_en: "Al Olaya", name_ar: "العليا", city: "riyadh" };
  assert.equal(placeName(d, "en"), "Al Olaya");
  assert.equal(placeName(d, "ar"), "العليا");
});

test("a district we hold in one language only widens to its city, never to the other name", () => {
  const d = { name_en: "Al Olaya", name_ar: null, city: "riyadh" };
  const ar = placeName(d, "ar");
  assert.equal(ar, "الرياض");
  assert.equal(LATIN.test(ar), false, ar);
  // And the mirror case, so the rule is not an Arabic special case.
  assert.equal(placeName({ name_en: null, name_ar: "العليا", city: "riyadh" }, "en"), "Riyadh");
});

test("a whitespace-only district name is not a name", () => {
  assert.equal(placeName({ name_en: "  ", name_ar: null, city: "riyadh" }, "en"), "Riyadh");
});

test("a district with neither a name nor a city is empty rather than wrong", () => {
  assert.equal(placeName({ name_en: null, name_ar: null, city: null }, "ar"), "");
  assert.equal(placeName(null, "ar"), "");
  assert.equal(placeName(undefined, "en"), "");
});

test("an entity keeps the one spelling we hold, because a registered name has no wider true form", () => {
  const a = { name_en: "Riyadh Holding", name_ar: null };
  assert.equal(entityName(a, "en"), "Riyadh Holding");
  assert.equal(entityName(a, "ar"), "Riyadh Holding");
  const b = { name_en: null, name_ar: "شركة الرياض" };
  assert.equal(entityName(b, "en"), "شركة الرياض");
  assert.equal(entityName(b, "ar"), "شركة الرياض");
});

test("an entity prefers the reader's language when both spellings exist", () => {
  const a = { name_en: "Riyadh Holding", name_ar: "شركة الرياض" };
  assert.equal(entityName(a, "ar"), "شركة الرياض");
  assert.equal(entityName(a, "en"), "Riyadh Holding");
});

test("a nameless entity is empty, so the caller decides what to say instead", () => {
  assert.equal(entityName({ name_en: "  ", name_ar: null }, "en"), "");
  assert.equal(entityName(null, "ar"), "");
  assert.equal(entityName(undefined, "en"), "");
});

test("the two policies genuinely differ on the same input", () => {
  const row = { name_en: "Al Olaya", name_ar: null, city: "riyadh" };
  assert.notEqual(placeName(row, "ar"), entityName(row, "ar"));
  assert.equal(placeName(row, "ar"), "الرياض");
  assert.equal(entityName(row, "ar"), "Al Olaya");
});
