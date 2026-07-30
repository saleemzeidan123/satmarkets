import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROCESSING_AGREEMENTS_IN_FORCE,
  decideGeoCall,
  decideGeoProvider,
  type GeoBoundaryContext,
} from "./boundary";
import { GEO_PROVIDERS, geoProvider, providersFor } from "./registry";
import type { SourceRights } from "@/lib/sourceRights";

// ADV-5A. What this file is for.
//
// The old `driveMinutes` degraded correctly when the token was missing, which is
// exactly why nobody noticed that it consulted no permission. Every test here is
// written so that adding a credential cannot make it pass. Where a test asserts a
// denial, it asserts the CODE as well as the fact, because "denied because the
// licence says no" and "denied because the key is unset" are different claims and
// only one of them survives a deployment change.

const rights = (over: Partial<SourceRights> & { sourceId: string }): SourceRights => ({
  storagePolicy: "full",
  redisplayPolicy: "none",
  derivedDisplayPolicy: "none",
  exportPolicy: "none",
  aiRetrievalPolicy: "none",
  modelInputPolicy: "none",
  rightsStatus: "evidenced",
  stopCondition: null,
  reviewedAt: null,
  reviewedNote: null,
  ...over,
});

const register = (...rows: SourceRights[]) =>
  new Map(rows.map((r) => [r.sourceId, r]));

// Credential NAMES are read from the registry rather than written here. The
// structural guard in `gateway.test.ts` requires that every geo credential name
// appears in exactly one file, and a test that hardcoded them would be the first
// thing to quietly reopen that.
const MAPBOX_KEYS = [...geoProvider("mapbox_directions")!.envKeys];
const GOOGLE_KEYS = [...geoProvider("google_places")!.envKeys];
const SPL_KEYS = [...geoProvider("spl_national_address")!.envKeys];

const ctx = (over: Partial<GeoBoundaryContext> = {}): GeoBoundaryContext => ({
  capability: "travel_time",
  audience: "public",
  rights: new Map(),
  credentials: [],
  ...over,
});

// ---------------------------------------------------------------- the gate

test("the processing gate is closed, and is not derived from the environment", () => {
  assert.equal(PROCESSING_AGREEMENTS_IN_FORCE, false);
});

test("no declared provider retains anything", () => {
  for (const p of GEO_PROVIDERS) assert.equal(p.retention, "never");
});

test("no credential VALUE appears in the registry, only names", () => {
  for (const p of GEO_PROVIDERS) {
    for (const k of p.envKeys) {
      assert.match(k, /^[A-Za-z_][A-Za-z0-9_]*$/, `${p.id} declares a non-identifier credential`);
    }
  }
});

// ------------------------------------------------------------- check order

test("an unread register denies, and says so, even with a credential present", () => {
  const p = geoProvider("mapbox_directions")!;
  const d = decideGeoProvider(p, ctx({ rights: undefined, credentials: MAPBOX_KEYS }));
  assert.equal(d.allowed, false);
  assert.equal(d.allowed === false && d.code, "rights_unreadable");
});

test("a source with no row denies as a rights denial, not a credential denial", () => {
  const p = geoProvider("google_places")!;
  const d = decideGeoProvider(
    p,
    ctx({ capability: "place_suggest", rights: new Map(), credentials: GOOGLE_KEYS })
  );
  assert.equal(d.allowed, false);
  assert.equal(d.allowed === false && d.code, "no_rights_row");
});

test("rights are evaluated BEFORE the credential: the defect that hid driveMinutes", () => {
  // foursquare_mapbox as the register actually records it: derived display none.
  const p = geoProvider("mapbox_directions")!;
  const denied = decideGeoProvider(
    p,
    ctx({
      rights: register(rights({ sourceId: "foursquare_mapbox", storagePolicy: "id_only" })),
      credentials: [],
    })
  );
  assert.equal(denied.allowed, false);
  // Without the credential present it would be tempting to report no_credential.
  // The point of the ordering is that it does not, because a rights denial
  // survives someone adding a token and a credential denial survives nothing.
  assert.equal(denied.allowed === false && denied.code, "use_denied");

  const stillDenied = decideGeoProvider(
    p,
    ctx({
      rights: register(rights({ sourceId: "foursquare_mapbox", storagePolicy: "id_only" })),
      credentials: MAPBOX_KEYS,
    })
  );
  assert.equal(stillDenied.allowed, false);
  assert.equal(stillDenied.allowed === false && stillDenied.code, "use_denied");
});

test("the right policy column governs: redisplay does not open derived", () => {
  const p = geoProvider("mapbox_directions")!;
  // Public redisplay, derived still none. A travel time is derived.
  const d = decideGeoProvider(
    p,
    ctx({
      rights: register(rights({ sourceId: "foursquare_mapbox", redisplayPolicy: "public" })),
      credentials: MAPBOX_KEYS,
    })
  );
  assert.equal(d.allowed, false);
  assert.equal(d.allowed === false && d.code, "use_denied");
});

test("internal permission does not reach the public audience", () => {
  const p = geoProvider("mapbox_directions")!;
  const row = register(rights({ sourceId: "foursquare_mapbox", derivedDisplayPolicy: "internal" }));
  assert.equal(
    decideGeoProvider(p, ctx({ rights: row, credentials: MAPBOX_KEYS })).allowed,
    false
  );
  assert.equal(
    decideGeoProvider(p, ctx({ rights: row, audience: "internal", credentials: MAPBOX_KEYS }))
      .allowed,
    true
  );
});

test("a permitted derived use still needs its credential, and that denial is named honestly", () => {
  const p = geoProvider("mapbox_directions")!;
  const d = decideGeoProvider(
    p,
    ctx({
      rights: register(rights({ sourceId: "foursquare_mapbox", derivedDisplayPolicy: "public" })),
      credentials: [],
    })
  );
  assert.equal(d.allowed, false);
  assert.equal(d.allowed === false && d.code, "no_credential");
});

test("a fully permitted, credentialled, endpointed provider is allowed", () => {
  const p = geoProvider("mapbox_directions")!;
  const d = decideGeoProvider(
    p,
    ctx({
      rights: register(rights({ sourceId: "foursquare_mapbox", derivedDisplayPolicy: "public" })),
      credentials: MAPBOX_KEYS,
    })
  );
  assert.equal(d.allowed, true);
});

// ------------------------------------------------------------ user-typed text

test("user-typed text is denied while no processing agreement is recorded, even with full display rights", () => {
  const p = geoProvider("mapbox_search")!;
  const d = decideGeoProvider(
    p,
    ctx({
      capability: "place_suggest",
      rights: register(rights({ sourceId: "foursquare_mapbox", redisplayPolicy: "public" })),
      credentials: MAPBOX_KEYS,
    })
  );
  assert.equal(d.allowed, false);
  assert.equal(d.allowed === false && d.code, "user_text_denied");
});

test("the display licence and the processing agreement are separate gates", () => {
  // The same row, the same credential, the only difference is the agreement.
  const p = geoProvider("mapbox_search")!;
  const base = {
    capability: "place_suggest" as const,
    rights: register(rights({ sourceId: "foursquare_mapbox", redisplayPolicy: "public" })),
    credentials: MAPBOX_KEYS,
  };
  assert.equal(decideGeoProvider(p, ctx(base)).allowed, false);
  assert.equal(decideGeoProvider(p, ctx({ ...base, agreementsInForce: true })).allowed, true);
});

test("a provider with no endpoint is denied for a rights reason first", () => {
  const p = geoProvider("spl_national_address")!;
  const d = decideGeoProvider(
    p,
    ctx({ capability: "address_lookup", rights: new Map(), credentials: SPL_KEYS })
  );
  assert.equal(d.allowed, false);
  // Not no_endpoint. The register is consulted before the wiring.
  assert.equal(d.allowed === false && d.code, "no_rights_row");
});

test("a declared but unwired provider with full rights is denied for having no endpoint", () => {
  const p = geoProvider("spl_national_address")!;
  const d = decideGeoProvider(
    p,
    ctx({
      capability: "address_lookup",
      rights: register(rights({ sourceId: "spl_address", redisplayPolicy: "public" })),
      credentials: SPL_KEYS,
      agreementsInForce: true,
    })
  );
  assert.equal(d.allowed, false);
  assert.equal(d.allowed === false && d.code, "no_endpoint");
});

// --------------------------------------------------------------- capability

test("decideGeoCall walks candidates in declared order and takes the first permitted", () => {
  const order = providersFor("place_suggest").map((p) => p.id);
  assert.deepEqual(order, ["google_places", "mapbox_search", "photon_suggest"]);

  const d = decideGeoCall(
    ctx({
      capability: "place_suggest",
      // Only the Mapbox-backed source is permitted; Google has no row.
      rights: register(rights({ sourceId: "foursquare_mapbox", redisplayPolicy: "public" })),
      credentials: MAPBOX_KEYS,
      agreementsInForce: true,
    })
  );
  assert.equal(d.allowed, true);
  assert.equal(d.allowed === true && d.provider.id, "mapbox_search");
});

test("every candidate's reason is retained on a total denial", () => {
  const d = decideGeoCall(ctx({ capability: "place_suggest" }));
  assert.equal(d.allowed, false);
  assert.equal(d.reasons.length, providersFor("place_suggest").length);
});

test("a capability with no declared provider denies rather than throwing", () => {
  const d = decideGeoCall(ctx({ capability: "travel_time", rights: undefined }));
  assert.equal(d.allowed, false);
});

// -------------------------------------------- the state the product ships in

test("with the register as it actually stands, every public geo call is denied", () => {
  // The register rows for the two geo sources that HAVE rows, transcribed from
  // docs/regulatory-register.md. Nothing here is invented in the product's favour.
  const actual = register(
    rights({ sourceId: "foursquare_mapbox", storagePolicy: "id_only", rightsStatus: "evidenced" }),
    rights({
      sourceId: "spl_address",
      redisplayPolicy: "public",
      rightsStatus: "asserted_unverified",
    })
  );
  for (const capability of ["travel_time", "place_suggest", "place_geocode", "address_lookup", "mobility"] as const) {
    const d = decideGeoCall({ capability, audience: "public", rights: actual, credentials: [] });
    assert.equal(d.allowed, false, `${capability} was permitted, which the register does not support`);
  }
});

test("adding every credential does not open a single one of them", () => {
  const actual = register(
    rights({ sourceId: "foursquare_mapbox", storagePolicy: "id_only" }),
    rights({ sourceId: "spl_address", redisplayPolicy: "public", rightsStatus: "asserted_unverified" })
  );
  const everyKey = GEO_PROVIDERS.flatMap((p) => p.envKeys);
  for (const capability of ["travel_time", "place_suggest", "place_geocode", "address_lookup", "mobility"] as const) {
    const d = decideGeoCall({ capability, audience: "public", rights: actual, credentials: everyKey });
    assert.equal(d.allowed, false, `${capability} opened once credentials were present`);
  }
});
