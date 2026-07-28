import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_FIELDS, fieldsFor } from "./assetFields";
import { assessListing } from "./listingQuality";
import * as mod from "./factScope";
import {
  SCOPE_ORDER,
  SECTION_SCOPE_LOCK,
  PLATFORM_FACT_SCOPE,
  attributionOf,
  declaredScopeEntries,
  factScope,
  factScopeHint,
  factScopeLabel,
  scopeGroupsFor,
  unscopedFields,
  type FactScope,
} from "./factScope";

const TYPES = Object.keys(ASSET_FIELDS);

function allPairs(): Array<{ assetType: string; key: string; section: string }> {
  const out: Array<{ assetType: string; key: string; section: string }> = [];
  for (const assetType of TYPES) {
    for (const field of ASSET_FIELDS[assetType]) {
      out.push({ assetType, key: field.key, section: field.section });
    }
  }
  return out;
}

test("every registry field resolves to a scope, so a new field forces a decision", () => {
  const unresolved = allPairs().filter((p) => factScope(p.assetType, p.key) === null);
  assert.deepEqual(unresolved, [], "these registry fields have no scope entry");
  assert.ok(allPairs().length > 300, "the sweep must actually be walking the registry");
});

test("no asset type carries an unscoped field", () => {
  for (const assetType of TYPES) {
    assert.deepEqual(unscopedFields(assetType), [], `${assetType} has unscoped fields`);
  }
});

test("no scope entry outlives the field it classifies", () => {
  const { keys, overrides } = declaredScopeEntries();
  const registryKeys = new Set(allPairs().map((p) => p.key));
  const registryPairs = new Set(allPairs().map((p) => `${p.assetType}:${p.key}`));
  assert.deepEqual(keys.filter((k) => !registryKeys.has(k)), [], "declared keys with no registry field");
  assert.deepEqual(overrides.filter((o) => !registryPairs.has(o)), [], "overrides with no registry field");
  assert.equal(keys.length, registryKeys.size, "one entry per distinct registry key");
});

test("every override changes the answer rather than restating the default", () => {
  const { overrides } = declaredScopeEntries();
  assert.ok(overrides.length > 0);
  for (const pair of overrides) {
    const [assetType, key] = [pair.slice(0, pair.indexOf(":")), pair.slice(pair.indexOf(":") + 1)];
    const others = TYPES.filter((t) => t !== assetType && ASSET_FIELDS[t].some((f) => f.key === key));
    assert.ok(others.length > 0, `${pair} is declared by one asset type only, so it needs no override`);
    // At least one other asset type must still read the default, otherwise the
    // override is the majority answer wearing an exception's clothes and the
    // default is the one that should move. Two types may share an override,
    // which is why this is not asserted against every other type.
    const differs = others.some((other) => factScope(other, key) !== factScope(assetType, key));
    assert.ok(differs, `${pair} matches every other asset type, so it is not an exception`);
  }
});

test("nothing resolves by fallback: an unknown key has no scope", () => {
  assert.equal(factScope("office", "no_such_field_key"), null);
  assert.equal(factScope("no_such_asset_type", "no_such_field_key"), null);
});

test("scope is a property of the pair, not of the key alone", () => {
  // The plot is the offered thing for land, so its frontage is a fact of the
  // property. For a shop the frontage belongs to the unit on offer.
  assert.equal(factScope("land", "frontage_m"), "property");
  assert.equal(factScope("retail", "frontage_m"), "space");
  assert.equal(factScope("showroom", "frontage_m"), "space");
});

test("an override wins over the default, and each one changes the answer", () => {
  // Every override below is paired with a type that takes the default, so an
  // override that stopped differing would fail here rather than sit unused.
  // wedding_hall is offered whole, so what would be a unit fact elsewhere is a
  // fact of the venue here.
  assert.equal(factScope("wedding_hall", "ceiling_height_m"), "property");
  assert.equal(factScope("office", "ceiling_height_m"), "space");
  assert.equal(factScope("worker_housing", "ac_type"), "property");
  assert.equal(factScope("showroom", "ac_type"), "space");
  assert.equal(factScope("mixed_use", "power_capacity_kva"), "property");
  assert.equal(factScope("entertainment", "power_capacity_kva"), "space");
  assert.equal(factScope("hospitality", "furnished"), "property");
  assert.equal(factScope("serviced", "furnished"), "space");
});

test("a compliance section field is a permission, and a permission is a compliance section field", () => {
  for (const p of allPairs()) {
    const scope = factScope(p.assetType, p.key);
    if (p.section === "compliance") {
      assert.equal(scope, SECTION_SCOPE_LOCK.compliance, `${p.assetType}:${p.key}`);
    }
    if (scope === "compliance") {
      assert.equal(p.section, "compliance", `${p.assetType}:${p.key}`);
    }
  }
});

test("a market section field is a fact of the surroundings, in both directions", () => {
  for (const p of allPairs()) {
    const scope = factScope(p.assetType, p.key);
    if (p.section === "market") assert.equal(scope, SECTION_SCOPE_LOCK.market, `${p.assetType}:${p.key}`);
    if (scope === "area") assert.equal(p.section, "market", `${p.assetType}:${p.key}`);
  }
});

test("scope is not the display section: a fact reads where a viewer expects it and belongs where it is true", () => {
  // Rendered beside the space, owned by the offer: a landlord can withdraw the
  // allocation without the space changing.
  assert.equal(factScope("retail", "parking_allocation"), "deal");
  assert.equal(factScope("retail", "signage_allowance"), "deal");
  // Rendered beside the commercial terms, owned by the asset: the next offer
  // over the same station inherits the ground lease rather than setting it.
  assert.equal(factScope("gas_station", "ground_lease_years_remaining"), "property");
  assert.equal(factScope("warehouse", "modon_ground_lease"), "property");
  assert.equal(factScope("hospitality", "management_agreement"), "property");
});

test("an asset offered whole has no offered-space facts", () => {
  // There is no unit inside a plot, so nothing about a plot can be a fact of a
  // space within it.
  const landScopes = new Set(fieldsFor("land").map((f) => factScope("land", f.key)));
  assert.ok(!landScopes.has("space"), [...landScopes].join(","));
  assert.ok(landScopes.has("property"));
});

test("an asset offered as a unit inside a building has facts of both kinds", () => {
  for (const assetType of ["office", "retail", "warehouse", "medical"]) {
    const scopes = new Set(fieldsFor(assetType).map((f) => factScope(assetType, f.key)));
    assert.ok(scopes.has("property"), `${assetType} has no property fact`);
    assert.ok(scopes.has("space"), `${assetType} has no space fact`);
  }
});

test("attribution is asymmetric: a property fact travels down, a space fact never travels up", () => {
  assert.equal(attributionOf("property", "building"), "own");
  assert.equal(attributionOf("property", "unit"), "context");
  assert.equal(attributionOf("space", "unit"), "own");
  assert.equal(attributionOf("space", "building"), "denied");
});

test("an offer is never restated as a fact of the building", () => {
  assert.equal(attributionOf("deal", "unit"), "own");
  assert.equal(attributionOf("deal", "building"), "denied");
  assert.equal(attributionOf("compliance", "unit"), "own");
  assert.equal(attributionOf("compliance", "building"), "denied");
});

test("a fact of the surroundings is nobody's own", () => {
  assert.equal(attributionOf("area", "unit"), "context");
  assert.equal(attributionOf("area", "building"), "context");
});

test("no scope is its own on both pages", () => {
  for (const scope of SCOPE_ORDER) {
    const both = attributionOf(scope, "unit") === "own" && attributionOf(scope, "building") === "own";
    assert.equal(both, false, scope);
  }
});

test("every scope carries a label and a hint in both locales", () => {
  const seen = new Set<string>();
  for (const scope of SCOPE_ORDER) {
    for (const ar of [false, true]) {
      for (const text of [factScopeLabel(scope, ar), factScopeHint(scope, ar)]) {
        assert.ok(text.length > 0, `${scope} ${ar}`);
        assert.ok(!/\u2014/.test(text), `${scope} ${ar} em dash`);
        assert.ok(!/[٠-٩]/.test(text), `${scope} ${ar} eastern numerals`);
        seen.add(text);
      }
    }
  }
  for (const scope of SCOPE_ORDER) {
    assert.notEqual(factScopeLabel(scope, false), factScopeLabel(scope, true), scope);
    assert.notEqual(factScopeHint(scope, false), factScopeHint(scope, true), scope);
  }
  assert.equal(seen.size, SCOPE_ORDER.length * 4, "two locales of label and hint must all differ");
});

test("scope vocabulary never reads as verification", () => {
  const forbidden = /verif|موثّق/i;
  for (const scope of SCOPE_ORDER) {
    for (const ar of [false, true]) {
      assert.ok(!forbidden.test(factScopeLabel(scope, ar)), `${scope} label`);
      assert.ok(!forbidden.test(factScopeHint(scope, ar)), `${scope} hint`);
    }
  }
});

test("the scope order lists each scope exactly once and covers every scope in use", () => {
  assert.equal(new Set(SCOPE_ORDER).size, SCOPE_ORDER.length);
  const used = new Set<FactScope>();
  for (const p of allPairs()) {
    const scope = factScope(p.assetType, p.key);
    if (scope) used.add(scope);
  }
  for (const scope of Object.values(PLATFORM_FACT_SCOPE)) used.add(scope);
  for (const scope of used) assert.ok(SCOPE_ORDER.includes(scope), scope);
  assert.equal(used.size, SCOPE_ORDER.length, "every declared scope must be reachable from real data");
});

test("grouping partitions the asset type's fields with nothing lost and nothing duplicated", () => {
  for (const assetType of TYPES) {
    const fields = fieldsFor(assetType);
    const groups = scopeGroupsFor(assetType);
    const grouped = groups.flatMap((g) => g.fields);
    assert.equal(grouped.length, fields.length, assetType);
    assert.deepEqual(
      [...grouped.map((f) => f.key)].sort(),
      [...fields.map((f) => f.key)].sort(),
      assetType,
    );
    for (const group of groups) {
      for (const field of group.fields) {
        assert.equal(factScope(assetType, field.key), group.scope, `${assetType}:${field.key}`);
      }
    }
  }
});

test("groups follow the scope order and registry order inside a group, and empty groups are dropped", () => {
  const groups = scopeGroupsFor("office");
  const order = groups.map((g) => g.scope);
  assert.deepEqual(order, SCOPE_ORDER.filter((s) => order.includes(s)));
  for (const group of groups) assert.ok(group.fields.length > 0, group.scope);

  const registryOrder = fieldsFor("office").map((f) => f.key);
  for (const group of groups) {
    const positions = group.fields.map((f) => registryOrder.indexOf(f.key));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), group.scope);
  }
});

test("the platform fact map covers exactly the platform checks of the completeness model", () => {
  // An asset type with no registry produces the platform pass alone.
  const platformKeys = assessListing({ asset_type: "no_such_asset_type" }).checks.map((c) => c.key);
  assert.deepEqual([...platformKeys].sort(), Object.keys(PLATFORM_FACT_SCOPE).sort());
});

test("a price is a fact of the offer and a location is a fact of the property", () => {
  assert.equal(PLATFORM_FACT_SCOPE.price, "deal");
  assert.equal(PLATFORM_FACT_SCOPE.availability_confirmed, "deal");
  assert.equal(PLATFORM_FACT_SCOPE.coordinates, "property");
  assert.equal(PLATFORM_FACT_SCOPE.building, "property");
  assert.equal(PLATFORM_FACT_SCOPE.area_sqm, "space");
  assert.equal(PLATFORM_FACT_SCOPE.photos, "space");
  assert.equal(PLATFORM_FACT_SCOPE.ad_permit, "compliance");
});

test("the module states scopes and never produces a colour", () => {
  const source = Object.entries(mod)
    .map(([, v]) => (typeof v === "function" ? v.toString() : JSON.stringify(v)))
    .join("\n");
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(source), "no colour literal may appear in a scope module");
  assert.ok(!/\bvar\(--/.test(source));
});
