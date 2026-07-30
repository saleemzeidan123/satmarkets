import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ADDRESS_FIELDS,
  PERMITTED_ADDRESS_FIELDS,
  buildAddressRequest,
  lookupNationalAddress,
} from "./address";
import { callGeoAddress } from "./gateway";
import { providersFor } from "./registry";

// ADV-5B. What this file is for.
//
// The claim being tested is not "the SPL integration is disabled". It is that
// there are three independent reasons no address request can be made, and that
// removing any one of them still leaves a refusal: the permitted field set is
// empty so no request can be built, the register holds `spl_address` at the
// internal ceiling so a public caller is refused on rights, and the transport
// has no branch to run. A test that only checked the outcome would pass if two
// of the three quietly disappeared.

const withThrowingFetch = async (fn: () => Promise<unknown>) => {
  const original = globalThis.fetch;
  let opened = 0;
  globalThis.fetch = (() => {
    opened += 1;
    throw new Error("a socket was opened");
  }) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
  return opened;
};

// 1. Nothing may be requested.

test("address: no field is permitted for receipt or display", () => {
  assert.deepEqual([...PERMITTED_ADDRESS_FIELDS], []);
  assert.ok(ADDRESS_FIELDS.length > 0, "the declared field list should still document the service");
});

test("address: no request can be built from an empty permitted set", () => {
  assert.equal(buildAddressRequest({ kind: "short_code", value: "RRRD2929" }), null);
  assert.equal(buildAddressRequest({ kind: "coordinates", lat: 24.71, lng: 46.67 }), null);
});

test("address: a lookup is unavailable at the permitted-fields stage and opens no socket", async () => {
  let result: Awaited<ReturnType<typeof lookupNationalAddress>> | null = null;
  const opened = await withThrowingFetch(async () => {
    result = await lookupNationalAddress(
      { kind: "short_code", value: "RRRD2929" },
      { audience: "public" }
    );
  });
  assert.equal(opened, 0);
  assert.ok(result);
  const r = result as unknown as Awaited<ReturnType<typeof lookupNationalAddress>>;
  assert.equal(r.status, "unavailable");
  if (r.status !== "unavailable") return;
  assert.equal(r.stage, "permitted_fields");
  assert.match(r.reasons.join(" "), /redisplay terms/);
});

// 2. The rights refusal underneath it.

test("address: the gateway refuses a public address call on rights, not on a missing endpoint", async () => {
  let out: Awaited<ReturnType<typeof callGeoAddress>> | null = null;
  const opened = await withThrowingFetch(async () => {
    out = await callGeoAddress("RRRD2929", { audience: "public", rights: new Map() });
  });
  assert.equal(opened, 0);
  const o = out as unknown as Awaited<ReturnType<typeof callGeoAddress>>;
  assert.equal(o.ok, false);
  if (o.ok) return;
  assert.equal(o.failure, "boundary");
  assert.equal(o.code, "no_rights_row");
});

test("address: exactly one provider is declared for the capability, with no endpoint", () => {
  const declared = providersFor("address_lookup");
  assert.equal(declared.length, 1);
  assert.equal(declared[0].host, null);
  assert.equal(declared[0].carriesUserText, true);
});

// 3. The transport refusal underneath that.

const read = (rel: string) =>
  fs.readFileSync(path.join(process.cwd(), rel), "utf8");

test("address: the transport declares no address branch at all", () => {
  const t = read("src/lib/location/trans" + "port.ts");
  // Needles assembled from fragments so this file does not match its own scan.
  assert.doesNotMatch(t, new RegExp('case "spl' + '_national_address"'));
  assert.doesNotMatch(t, new RegExp("address" + "\\.gov\\.sa"));
  assert.doesNotMatch(t, new RegExp("api" + "\\.address\\."));
  // The dispatcher exists and is a default-only switch: no `case` inside it.
  const i = t.indexOf("function fetchAddress");
  assert.ok(i > 0, "the address dispatcher is missing");
  const body = t.slice(i);
  assert.doesNotMatch(body, /\bcase\b/);
});

test("address: the address entry point is reached only through the gateway", () => {
  const a = read("src/lib/location/address.ts");
  assert.doesNotMatch(a, new RegExp("from \"\\./trans" + "port\""));
  assert.match(a, /from "\.\/gateway"/);
  assert.doesNotMatch(a, /\bfetch\s*\(/);
});
