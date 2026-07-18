import { test } from "node:test";
import assert from "node:assert";
import { parseLatLng, isMapShareUrl } from "./parseLatLng";

test("reads the @lat,lng map centre from a Google Maps URL", () => {
  const r = parseLatLng("https://www.google.com/maps/@24.7136,46.6753,15z");
  assert.deepEqual(r, { lat: 24.7136, lng: 46.6753 });
});

test("prefers the precise !3d!4d place marker over the @ centre", () => {
  const url = "https://www.google.com/maps/place/KAFD/@24.7600,46.6400,17z/data=!3d24.7625!4d46.6389";
  assert.deepEqual(parseLatLng(url), { lat: 24.7625, lng: 46.6389 });
});

test("reads a q= coordinate query (plain and URL-encoded comma)", () => {
  assert.deepEqual(parseLatLng("https://maps.google.com/?q=24.7136,46.6753"), { lat: 24.7136, lng: 46.6753 });
  assert.deepEqual(parseLatLng("https://www.google.com/maps?q=21.4225%2C39.8262"), { lat: 21.4225, lng: 39.8262 });
});

test("reads a bare 'lat, lng' pair", () => {
  assert.deepEqual(parseLatLng("24.7136, 46.6753"), { lat: 24.7136, lng: 46.6753 });
  assert.deepEqual(parseLatLng("21.5,39.2"), { lat: 21.5, lng: 39.2 });
});

test("rejects non-coordinate text and out-of-range or null-island values", () => {
  assert.equal(parseLatLng("Al Olaya, Riyadh"), null);
  assert.equal(parseLatLng("0,0"), null);
  assert.equal(parseLatLng("200,999"), null);
  assert.equal(parseLatLng(""), null);
  assert.equal(parseLatLng(null), null);
});

test("does not treat a stray number pair inside prose as coordinates", () => {
  // bare-pair rule requires the WHOLE string to be the pair
  assert.equal(parseLatLng("the unit is 300 sqm, 5 floors"), null);
});

test("isMapShareUrl recognises Google short and long map links, rejects others", () => {
  assert.ok(isMapShareUrl("https://maps.app.goo.gl/abc123"));
  assert.ok(isMapShareUrl("https://goo.gl/maps/xyz"));
  assert.ok(isMapShareUrl("https://www.google.com/maps/place/x"));
  assert.ok(isMapShareUrl("https://google.com.sa/maps?q=1,2"));
  assert.ok(!isMapShareUrl("https://evil.example.com/maps"));
  assert.ok(!isMapShareUrl("not a url"));
});
