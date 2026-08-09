import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITEMAP_ROUTES } from "@/lib/routePolicy";

/**
 * PKG-DISCOVERY-1 item 7: SEO and AI discovery completeness.
 *
 * "Sitemap and llms.txt are insufficient on their own" is the brief's own
 * framing, so this file does not re-assert what `meta.test.ts` (the head
 * factory: canonical, hreflang, Open Grag, Twitter) and `MarketingHome
 * .homeRuling.test.ts` (internal linking, no held/private route presented as
 * a public feature) already cover with their own evidence. What it closes is
 * the gap an audit of every SITEMAP_ROUTES and detail template found this
 * turn: six live public templates carried zero Schema.org structured data of
 * any kind, not even a BreadcrumbList, and two entity detail pages
 * (`/lister/[id]`, `/requirements/[id]`) had none either despite sitting
 * beside siblings (`/building/[id]`, `/listings/[id]`) that already did.
 *
 * WHY SOURCE-LEVEL. Same constraint as every other law test in this
 * repository: no React renderer in `npm test`. This reads the page's own
 * source for the JSON-LD literal it renders, the same technique
 * `MarketingHome.homeRuling.test.ts` uses for a links array.
 */

const APP = path.join(__dirname, "../app/[locale]");
const src = (rel: string) => fs.readFileSync(path.join(APP, rel), "utf8");

// The home page is deliberately excluded: it is the root of the breadcrumb
// trail, has no parent to name, and every other public template's own
// breadcrumb already points back at it as position 1. A BreadcrumbList
// naming only itself is not a breadcrumb.
//
// The flyer is deliberately excluded for the same reason
// `reflow.test.ts`'s PAIR_EXEMPT excuses the term sheet preview: it is a
// print-shaped derivative of `/listings/[id]`, not a distinct entity. It
// carries no href of its own SAT would want indexed separately from the
// listing it prints (confirmed by reading the file: its only use of `SITE`
// is the printed URL string on the page, not a canonical or a schema
// target), and the listing it derives from already carries the real
// BreadcrumbList and RealEstateListing schema.
const BREADCRUMB_ROUTES = [
  ...SITEMAP_ROUTES.filter((r) => r !== ""),
  "/listings/[id]",
  "/building/[id]",
  "/lister/[id]",
  "/requirements/[id]",
];

test("every route this package added a breadcrumb to actually carries one, and the sweep names them all", () => {
  // A hardcoded floor, not a ceiling: if a future route policy addition
  // drops the count below what this package already achieved, that is a
  // regression this test is designed to catch. The list itself is asserted
  // against SITEMAP_ROUTES immediately below, so it cannot silently stop
  // covering a real public route either.
  assert.ok(BREADCRUMB_ROUTES.length >= 13, "the breadcrumb sweep looks smaller than PKG-DISCOVERY-1 item 7 left it; SITEMAP_ROUTES may have shrunk without this file noticing");
});

test("SITEMAP_ROUTES has not grown a new route this file forgot to cover", () => {
  const missing = SITEMAP_ROUTES.filter((r) => r !== "" && !BREADCRUMB_ROUTES.includes(r));
  assert.deepEqual(missing, [], `a sitemap route has no breadcrumb coverage decision recorded here: ${missing.join(", ")}`);
});

test("every non-home public and entity template renders a BreadcrumbList", () => {
  const missing: string[] = [];
  for (const route of BREADCRUMB_ROUTES) {
    const file = path.join(APP, route, "page.tsx");
    if (!fs.existsSync(file)) { missing.push(`${route} (no page.tsx)`); continue; }
    const body = fs.readFileSync(file, "utf8");
    if (!/"@type":\s*"BreadcrumbList"/.test(body)) missing.push(route);
  }
  assert.deepEqual(missing, [], `no BreadcrumbList structured data found for: ${missing.join(", ")}`);
});

test("every breadcrumb's first entry names the site root, not a second copy of the page itself", () => {
  // A cheap but real defect this catches: a breadcrumb block pasted from a
  // sibling page that still points position 1 at the sibling's own path
  // rather than the locale root.
  for (const route of BREADCRUMB_ROUTES) {
    const file = path.join(APP, route, "page.tsx");
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file, "utf8");
    const m = /"@type":\s*"BreadcrumbList",\s*itemListElement:\s*\[\s*\{[^}]*position:\s*1,[^}]*\}/.exec(body);
    if (!m) continue; // caught by the previous test if truly absent
    assert.doesNotMatch(m[0], new RegExp(`\\/${route.replace(/[[\]]/g, "\\$&")}[\`"']`), `${route}'s breadcrumb position 1 appears to link to its own page rather than the site root`);
  }
});

test("map, brokers, advisor and the requirements board each declare their own crumbHome and section label rather than borrowing another section's", () => {
  const pairs: [string, string, string][] = [
    ["map", "crumbHome", "crumbMap"],
    ["brokers", "crumbHome", "crumbBrokers"],
    ["advisor", "crumbHome", "crumbAdvisor"],
    ["req", "crumbHome", "crumbReq"],
    ["reqDetail", "crumbHome", "crumbReq"],
    ["rentIndex", "crumbHome", "eyebrow"],
  ];
  for (const loc of ["en", "ar"]) {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, `../i18n/dictionaries/${loc}.json`), "utf8"));
    for (const [section, homeKey, labelKey] of pairs) {
      assert.ok(typeof d[section]?.[homeKey] === "string" && d[section][homeKey].trim(), `${loc}.json: ${section}.${homeKey} is missing`);
      assert.ok(typeof d[section]?.[labelKey] === "string" && d[section][labelKey].trim(), `${loc}.json: ${section}.${labelKey} is missing`);
    }
  }
});

test("the /lister/[id] entity type follows lister_type exactly the way the visible role tag does, never a fixed value", () => {
  const body = src("lister/[id]/page.tsx");
  assert.match(body, /"@type":\s*p\.lister_type === "broker" \? "RealEstateAgent" : "Organization"/, "the lister entity's @type must be derived from p.lister_type, matching the visible role tag's own condition, not hardcoded to one value");
});

test("the /lister/[id] entity carries no field the query never selected", () => {
  const body = src("lister/[id]/page.tsx");
  const selectLine = /\.select\("id,name_en,name_ar,lister_type,is_operator,is_verified,is_demo,about_en,about_ar,website,public_email,public_phone,logo_url,member_since"\)/;
  assert.match(body, selectLine, "the lister query's own select list has changed; re-verify the entity block below still only reads columns actually fetched before relying on this test");
  // Fields Schema.org would accept for an Organization/RealEstateAgent but
  // this platform has no evidenced column for: a postal address, a rating,
  // and a licence identifier (accounts.verification_status is a workflow
  // state, not a document, per src/lib/listingVerification.ts). None may
  // appear on the entity literal.
  const entityBlock = /const listerEntity = \{[\s\S]*?\n  \};/.exec(body)?.[0] ?? "";
  assert.ok(entityBlock.length > 0, "could not locate the listerEntity object literal to check");
  for (const banned of ["address", "aggregateRating", "review", "priceRange", "identifier"]) {
    assert.doesNotMatch(entityBlock, new RegExp(`\\b${banned}\\s*:`), `listerEntity declares "${banned}", a field this platform's listers_public view carries no evidence for`);
  }
});

test("the /lister/[id] entity's description never carries the other-language About fallback", () => {
  // Finding 93 labels a visible fallback paragraph explicitly. A schema.org
  // description has no equivalent labelling mechanism, so the only honest
  // choice is to omit it rather than repeat the defect finding 93 fixed on
  // the visible page in a place nothing labels it.
  const body = src("lister/[id]/page.tsx");
  assert.match(body, /\.\.\.\(aboutOwnLang \? \{ description: aboutOwnLang \} : \{\}\)/, "the lister entity's description must be gated on aboutOwnLang (the reader's own language), never on `about` (which silently includes the other-language fallback)");
});

test("public page and component source makes no AI-search-strength claim citing llms.txt", () => {
  // The brief's own words: "Do not present llms.txt as proof of AI-search
  // strength." docs/ is allowed to discuss the file as an artifact (and
  // does, carefully, in docs/adv-4a-closure.md and
  // docs/baseline-enhancement-plan-2026-07-22.md, both of which explicitly
  // reject treating it as a shortcut); this test's scope is what the product
  // itself says to a visitor or a crawler.
  const roots = [path.join(__dirname, "../app"), path.join(__dirname, "../components")];
  const hype = /llms\.txt[^.\n]{0,80}(prove|proof|strength|ranking|boost|guarantee)/i;
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const body = fs.readFileSync(p, "utf8");
        if (hype.test(body)) offenders.push(p);
      }
    }
  };
  for (const r of roots) walk(r);
  assert.deepEqual(offenders, [], `llms.txt is cited as a strength/proof claim in: ${offenders.join(", ")}`);
});

test("llms.txt itself states its own status honestly rather than claiming AI-search strength", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../public/llms.txt"), "utf8");
  assert.doesNotMatch(body, /guarantee|proves?\b|ranks? (higher|better)|boost/i, "llms.txt makes a strength or ranking claim about itself");
  // It should instead be doing what docs/adv-4a-closure.md says it was
  // rewritten to do: state the preview status and cite REGA as the source of
  // the one figure set it republishes.
  assert.match(body, /preview environment/i);
  assert.match(body, /REGA Rental Index/);
});
