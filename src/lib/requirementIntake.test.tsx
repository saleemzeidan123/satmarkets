import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import RequirementForm from "@/app/[locale]/post-requirement/RequirementForm";
import {
  TIMELINE_OPTIONS,
  MUST_HAVE_OPTIONS,
  REQUIREMENT_ASSET_TYPES,
  REQUIREMENT_DEAL_TYPES,
  isTimelineToken,
  timelineOptions,
  timelineLabel,
  isUrgentTimeline,
  groupLocations,
  locationLabel,
  type IntakeLocation,
} from "@/lib/requirementIntake";
import { matchListing, type MatchListing } from "@/lib/matching";
import { assetLabel } from "@/lib/labels";
import { getDictionary } from "@/i18n/getDictionary";

// PKG-DEM1, finding 100 and finding 101.
//
// WHAT THIS EXISTS TO STOP HAPPENING AGAIN.
//
// The public demand form could not submit. Its move-in options and the write
// path's accepted tokens were two unrelated literals in two files, so most of
// what the form offered was refused, every Arabic option was refused, and the
// option pre-selected for every visitor was one of the refused ones. Nothing
// failed when that shipped, because nothing had ever put the two lists side by
// side. That is what these tests are: the two lists, side by side, on every
// commit.
//
// The guards are written against the rendered markup rather than against the
// vocabulary module, because the vocabulary agreeing with itself is not the
// property that was broken. What was broken is that the control a visitor
// actually sees offered values the route actually refuses. So the assertions
// read the `value` attributes the form emits and test them against the
// validator's own predicate, in both languages.
//
// Every guard has a sensitivity case beside it, because a guard nobody has
// watched fail is a guard nobody knows works.

const LOCALES = ["en", "ar"] as const;

/**
 * Locations as the districts source holds them, including the row that decides
 * the interesting case: `name_ar` missing. The platform holds both names on all
 * seventy seven rows today, so this shape is the seventy eighth, and it is here
 * because that is the row on which a borrow would be invisible in production
 * and wrong forever.
 */
const LOCATIONS: IntakeLocation[] = [
  { id: "11111111-1111-4111-8111-111111111111", name_en: "Al Olaya", name_ar: "العليا", city: "Riyadh" },
  { id: "22222222-2222-4222-8222-222222222222", name_en: "King Abdullah Financial District", name_ar: "واجهة الرياض المالية", city: "Riyadh" },
  { id: "33333333-3333-4333-8333-333333333333", name_en: "Al Hamra", name_ar: "الحمراء", city: "Jeddah" },
  { id: "44444444-4444-4444-8444-444444444444", name_en: "Northgate Business Park", name_ar: "", city: "Jeddah" },
];

const render = (locale: "en" | "ar", locations: IntakeLocation[] = LOCATIONS): string =>
  renderToStaticMarkup(<RequirementForm locale={locale} locations={locations} />);

/** Visible text only. Attribute values are not what a reader reads. */
const text = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

/**
 * Every `<label>` in the markup that labels nothing. Two legitimate shapes: an
 * explicit `for` naming a control that exists, or a control nested inside.
 */
function orphanLabels(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/<(?:input|textarea|select)\b[^>]*\bid="([^"]+)"/g)) ids.add(m[1]);
  const out: string[] = [];
  for (const m of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
    const htmlFor = /\bfor="([^"]+)"/.exec(m[1]);
    if (htmlFor && ids.has(htmlFor[1])) continue;
    if (/<(?:input|textarea|select)\b/.test(m[2])) continue;
    out.push(text(m[0]).trim().slice(0, 80));
  }
  return out;
}

/** The `value` of every radio the form emits under one control name. */
function radioValues(html: string, name: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<input\b[^>]*>/g)) {
    const tag = m[0];
    if (!new RegExp(`\\bname="${name}"`).test(tag)) continue;
    if (!/\btype="radio"/.test(tag)) continue;
    const v = /\bvalue="([^"]*)"/.exec(tag);
    out.push(v ? v[1] : "");
  }
  return out;
}

/** Every radio under one control name that arrives already chosen. */
function checkedRadios(html: string, name: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<input\b[^>]*>/g)) {
    const tag = m[0];
    if (!new RegExp(`\\bname="${name}"`).test(tag)) continue;
    if (!/\bchecked\b/.test(tag)) continue;
    const v = /\bvalue="([^"]*)"/.exec(tag);
    out.push(v ? v[1] : "");
  }
  return out;
}

/** The `value` of every `<option>` inside the location select. */
function optionValues(html: string): string[] {
  const sel = /<select\b[^>]*\bid="pr-location"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  if (!sel) return [];
  return [...sel[1].matchAll(/<option\b[^>]*\bvalue="([^"]*)"/g)].map((m) => m[1]);
}

/** Every `<optgroup>` label inside the location select. */
function optgroupLabels(html: string): string[] {
  const sel = /<select\b[^>]*\bid="pr-location"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  if (!sel) return [];
  return [...sel[1].matchAll(/<optgroup\b[^>]*\blabel="([^"]*)"/g)].map((m) => m[1]);
}

const HAS_LATIN = /[A-Za-z]/;

const SRC = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

// ---------------------------------------------------------------------------
// The two lists, side by side
// ---------------------------------------------------------------------------

test("every move-in option the form offers is a value the write path accepts", () => {
  for (const locale of LOCALES) {
    const values = radioValues(render(locale), "timeline");
    assert.ok(values.length > 0, `/${locale}/post-requirement offers no move-in option at all`);
    for (const v of values) {
      assert.ok(isTimelineToken(v), `/${locale}/post-requirement offers "${v}", which the route refuses`);
    }
    assert.deepEqual(values, timelineOptions().map((o) => o.token));
  }
});

test("the move-in guard catches the mismatch that shipped", () => {
  // The literals the form actually held, against the validator that actually
  // ran. Two of the four English options and all four Arabic ones were refused.
  const wasOffered = ["Immediate", "1-3 months", "3-6 months", "Flexible", "فوري", "1-3 أشهر", "3-6 أشهر", "مرن"];
  const refused = wasOffered.filter((v) => !isTimelineToken(v));
  assert.deepEqual(
    refused,
    ["1-3 months", "3-6 months", "فوري", "1-3 أشهر", "3-6 أشهر", "مرن"],
    "the shipped mismatch must still be detectable by this predicate",
  );
});

test("the two languages offer the same values under different words", () => {
  // The defect underneath finding 100 was that the Arabic form wrote Arabic
  // into a column read as English tokens. Labels differ; values must not.
  const en = render("en");
  const ar = render("ar");
  assert.deepEqual(radioValues(en, "timeline"), radioValues(ar, "timeline"));
  assert.deepEqual(radioValues(en, "deal"), radioValues(ar, "deal"));
  const arText = text(ar);
  for (const o of timelineOptions()) {
    assert.ok(arText.includes(o.label_ar), `the Arabic form does not show "${o.label_ar}"`);
  }
  for (const m of MUST_HAVE_OPTIONS) {
    assert.ok(arText.includes(m.label_ar), `the Arabic form does not show the must-have "${m.label_ar}"`);
  }
});

test("the transaction options are the ones the write path accepts", () => {
  for (const locale of LOCALES) {
    assert.deepEqual(radioValues(render(locale), "deal"), [...REQUIREMENT_DEAL_TYPES]);
  }
});

test("the asset chips offer every type the write path accepts, named as the platform names them", () => {
  // The form offered five of the seven, so a serviced office or an education
  // requirement could not be posted through the public form at all, and it
  // title-cased the token itself, calling retail "Retail" where every other
  // surface says "Retail & F&B".
  for (const locale of LOCALES) {
    const body = text(render(locale));
    for (const a of REQUIREMENT_ASSET_TYPES) {
      const label = assetLabel(a, locale);
      assert.ok(label.length > 0, `${a} has no label in ${locale}`);
      assert.ok(body.includes(label), `/${locale}/post-requirement does not offer ${a} as "${label}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// What the chosen value then does
// ---------------------------------------------------------------------------

test("the Arabic urgent option produces a requirement the matcher treats as urgent", () => {
  // This is the whole chain in one assertion: the value the Arabic form emits,
  // through the column, into the matcher that decides whether availability is
  // part of the question. Before this package the Arabic form emitted فوري,
  // which the route refused, and which the matcher would not have recognised
  // had it arrived.
  const arValues = radioValues(render("ar"), "timeline");
  const urgent = arValues.filter((v) => isUrgentTimeline(v));
  assert.deepEqual(urgent, ["Immediate"], "the Arabic form must offer exactly one urgent move-in value");

  const token = urgent[0];
  assert.equal(timelineLabel(token, true), "فوري", "the urgent option must read as فوري to an Arabic visitor");

  const listing: MatchListing = {
    id: "l1", status: "published", asset_type: "office", deal_type: "lease",
    city: "Riyadh", district_id: LOCATIONS[0].id, area_sqm: 600,
    asking_rent_sqm: 1800, availability_confirmed_at: null,
  };
  const now = Date.UTC(2026, 6, 1);
  const withTimeline = matchListing(
    { asset_type: "office", deal_type: "lease", city: "Riyadh", district_id: LOCATIONS[0].id, timeline: token },
    listing,
    now,
  );
  const without = matchListing(
    { asset_type: "office", deal_type: "lease", city: "Riyadh", district_id: LOCATIONS[0].id, timeline: "" },
    listing,
    now,
  );
  assert.ok(
    withTimeline.reasons.some((r) => r.dimension === "timeline"),
    "an immediate Arabic requirement must make availability part of the match question",
  );
  assert.equal(
    without.reasons.some((r) => r.dimension === "timeline"),
    false,
    "a requirement with no move-in date must not be scored on availability",
  );
});

test("no move-in option arrives already chosen", () => {
  // The column is nullable and the route accepts an empty timeline. A radio
  // that arrives chosen states a constraint the visitor never gave, on the one
  // field that decides whether availability is scored at all. The form that
  // shipped pre-selected a value the route refused, so the first thing every
  // visitor did was submit an invalid brief.
  for (const locale of LOCALES) {
    assert.deepEqual(checkedRadios(render(locale), "timeline"), [], `/${locale}/post-requirement pre-selects a move-in date`);
  }
});

test("no location arrives already chosen, and the placeholder is not a location", () => {
  for (const locale of LOCALES) {
    const values = optionValues(render(locale));
    assert.equal(values[0], "", "the first option must be the placeholder");
    assert.equal(values.filter((v) => v === "").length, 1, "only the placeholder may carry an empty value");
  }
});

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

test("every location the form offers reaches a structured field as its own id", () => {
  // Finding 101. The form held five district ids as literals, all of them in
  // Riyadh, and sent `city: "Riyadh"` whatever was chosen, so a Jeddah tenant's
  // brief was filed against a Riyadh district. The options are now the source's
  // own rows, and nothing but an id reaches the field.
  const ids = new Set(LOCATIONS.map((l) => l.id));
  for (const locale of LOCALES) {
    const values = optionValues(render(locale)).filter(Boolean);
    assert.equal(values.length, LOCATIONS.length, `/${locale}/post-requirement does not offer every location it was given`);
    for (const v of values) assert.ok(ids.has(v), `/${locale}/post-requirement offers "${v}", which is not a location id`);
    assert.equal(new Set(values).size, values.length, "a location is offered twice");
  }
});

test("locations are grouped by city, and an Arabic reader sees no Latin script", () => {
  const arHtml = render("ar");
  const labels = optgroupLabels(arHtml);
  assert.equal(labels.length, new Set(LOCATIONS.map((l) => l.city)).size, "one group per city");
  for (const label of labels) {
    assert.equal(HAS_LATIN.test(label), false, `the Arabic form groups locations under the Latin label "${label}"`);
  }
  const sel = /<select\b[^>]*\bid="pr-location"[^>]*>([\s\S]*?)<\/select>/.exec(arHtml);
  assert.ok(sel);
  const optionText = text(sel[1]).trim();
  assert.equal(HAS_LATIN.test(optionText), false, `the Arabic location list contains Latin script: ${optionText}`);
});

test("a location held in one language widens to its city rather than borrowing the other spelling", () => {
  // The row with no `name_ar`. The tempting behaviour is to fall back to
  // `name_en`, which hands an Arabic reader "Northgate Business Park" and calls
  // it a translation. `displayName.ts` says a place name is a description, so
  // it widens to the city, which is true.
  const orphan = LOCATIONS[3];
  assert.equal(orphan.name_ar, "", "this test needs the row that holds only one name");
  const shown = locationLabel(orphan, true);
  assert.equal(shown.includes(orphan.name_en), false, "an Arabic reader must not be shown the English spelling");
  assert.ok(shown.length > 0, "widening must produce something a reader can read");
  assert.equal(locationLabel(orphan, false), orphan.name_en, "an English reader sees the name that exists");
});

test("two spellings of one city do not become two groups", () => {
  const rows: IntakeLocation[] = [
    { id: "a", name_en: "One", name_ar: "واحد", city: "Riyadh" },
    { id: "b", name_en: "Two", name_ar: "اثنان", city: "riyadh" },
    { id: "c", name_en: "Three", name_ar: "ثلاثة", city: "الرياض" },
  ];
  const groups = groupLocations(rows, false);
  assert.equal(groups.length, 1, "a city spelled three ways must be one group");
  assert.equal(groups[0].locations.length, 3);
});

test("an unreadable locations source says so instead of showing an empty market", () => {
  // A select with no options reads as "this market has no locations", which is
  // a claim about the market. The empty state is a claim about this request.
  for (const locale of LOCALES) {
    const html = render(locale, []);
    const pr = getDictionary(locale).postReq;
    assert.ok(text(html).includes(pr.locationsUnavailable), `/${locale}/post-requirement does not say why it cannot be used`);
    assert.equal(/<select\b/.test(html), false, "no select may be rendered with nothing in it");
    const submit = /<button\b[^>]*type="submit"[^>]*>/.exec(html);
    assert.ok(submit, "the form must still have a submit control");
    assert.ok(/\bdisabled\b/.test(submit[0]), "a form that cannot be completed must not offer to send");
  }
});

// ---------------------------------------------------------------------------
// Accessibility, and the counts on the success card
// ---------------------------------------------------------------------------

test("the demand form has no label that labels nothing", () => {
  for (const locale of LOCALES) {
    assert.deepEqual(orphanLabels(render(locale)), [], `/${locale}/post-requirement announces a field a user cannot reach`);
  }
});

test("the orphan-label guard catches the shape it was written for", () => {
  const wasHere = '<div class="field"><label>Location</label><div class="input"><span>Al Olaya</span></div></div>';
  assert.equal(orphanLabels(wasHere).length, 1, "a label over a div must be caught");
  assert.deepEqual(orphanLabels('<label for="t">Location</label><select id="t"></select>'), []);
  assert.deepEqual(orphanLabels('<label>Lease<input type="radio" name="deal" /></label>'), []);
});

test("no count on the success card is a literal", () => {
  // The card printed the literal 3 beside "audiences notified" while the real
  // list was rendered directly beneath it, so the number and the list under it
  // were two independent claims that happened to agree.
  const src = SRC("src/app/[locale]/post-requirement/RequirementForm.tsx");
  assert.ok(src.includes("{done.notified.length}"), "the notified count must be the length of the list shown");
  assert.ok(src.includes("{done.match}"), "the match count must be the figure the route returned");
  // A number rendered as an element's own text, which is the shape the defect
  // had: `<div className="tnum" ...>3</div>`. Numbers inside braces are props
  // and layout, not claims about the market.
  const rendered = [...src.matchAll(/>\s*(\d+)\s*</g)].map((m) => m[1]);
  assert.deepEqual(rendered, [], `a bare number is rendered as text on this page: ${rendered.join(", ")}`);
});

// ---------------------------------------------------------------------------
// Source guards: no second list, anywhere
// ---------------------------------------------------------------------------

test("the write path holds no vocabulary of its own", () => {
  // Both sides read `requirementIntake`. If either grows its own literal list
  // again, they can disagree again, and the disagreement is invisible until a
  // visitor is refused.
  const route = SRC("src/app/api/requirements/route.ts");
  assert.ok(route.includes('from "@/lib/requirementIntake"'), "the route must read the shared vocabulary");
  const form = SRC("src/app/[locale]/post-requirement/RequirementForm.tsx");
  assert.ok(form.includes('from "@/lib/requirementIntake"'), "the form must read the shared vocabulary");

  // The control may hold no timeline literal at all. It renders the vocabulary
  // or it renders nothing, because the control is the side that drifted.
  for (const o of TIMELINE_OPTIONS) {
    assert.equal(form.includes(`"${o.token}"`), false, `the form holds the literal token "${o.token}" rather than rendering the vocabulary`);
  }

  // Neither file may hold a list of them, which is the shape a second
  // vocabulary takes. One token in a sample row is a datum; two side by side is
  // a list that can disagree with this one.
  const LIST = /"(?:Q[1-4]|Immediate|ASAP|Flexible)"[^\n]{0,60}?"(?:Q[1-4]|Immediate|ASAP|Flexible)"/;
  for (const [rel, src] of [["src/app/api/requirements/route.ts", route], ["src/app/[locale]/post-requirement/RequirementForm.tsx", form]] as const) {
    assert.equal(LIST.test(src), false, `${rel} holds a second list of timeline tokens`);
  }
});

test("the preview sample rows carry values the form could actually have produced", () => {
  // The samples exist to exercise the board before there is demand on it, so a
  // sample that cannot be produced by the form misdescribes the product as
  // surely as a wrong figure does. These rows carried English must-have phrases,
  // one of which named a condition the form has never offered.
  const route = SRC("src/app/api/requirements/route.ts");
  const timelines = [...route.matchAll(/timeline:\s*"([^"]*)"/g)].map((m) => m[1]);
  assert.ok(timelines.length > 0, "this guard needs the sample rows it was written for");
  for (const t of timelines) assert.ok(isTimelineToken(t), `a sample requirement carries the timeline "${t}", which the write path refuses`);

  const musts = [...route.matchAll(/mustHaves:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]));
  assert.ok(musts.length > 0, "this guard needs the sample rows it was written for");
  const known = new Set(MUST_HAVE_OPTIONS.map((o) => o.token));
  for (const v of musts) assert.ok(known.has(v), `a sample requirement carries the must-have "${v}", which the form has never offered`);

  const assets = [...route.matchAll(/asset:\s*"([^"]*)"/g)].map((m) => m[1]);
  for (const a of assets) assert.ok(REQUIREMENT_ASSET_TYPES.includes(a), `a sample requirement carries the asset type "${a}", which the form does not offer`);
});

test("the vocabulary keeps a stored value readable after it stops being offered", () => {
  // `ASAP` is accepted and not offered: it is a synonym of `Immediate`, and a
  // form asking a visitor to choose between two words with one meaning is
  // asking them to guess. Dropping it from the vocabulary would blank the
  // timeline on every row that already carries it.
  assert.ok(isTimelineToken("ASAP"), "a stored value must stay acceptable");
  assert.equal(timelineOptions().some((o) => o.token === "ASAP"), false, "ASAP must not be offered");
  assert.equal(timelineLabel("ASAP", false), "As soon as possible");
  assert.equal(timelineLabel("ASAP", true), "بأسرع وقت");
  assert.ok(isUrgentTimeline("ASAP"), "ASAP is an urgent timeline wherever it is stored");
  // A row written before this vocabulary existed keeps its own words.
  assert.equal(timelineLabel("1-3 months", false), "1-3 months");
  assert.equal(timelineLabel(null, true), "");
  assert.equal(TIMELINE_OPTIONS.filter((o) => o.urgent).length, 2);
});
