import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { EvidencePassport as Passport } from "@/lib/evidence";
import type { SourceRights } from "@/lib/sourceRights";
import { type PublicEvidenceView, publicEvidenceView } from "@/lib/evidenceView";
import { listingEvidenceByField } from "@/lib/listingEvidence";
import EvidencePassport from "@/components/EvidencePassport";
import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";

// ADV-1C, Codex boundary 7: "rendered-route tests and live EN/AR evidence, not
// only unit tests."
//
// WHY THIS FILE RENDERS RATHER THAN INSPECTS.
//
// `evidenceView.test.ts` proves the producer builds the right object.
// `listingEvidence.test.ts` proves a listing row becomes the right passports.
// Neither proves a reader sees anything, and that gap is precisely finding 76:
// two packages of correct, tested, invisible evidence code.
//
// So this file takes the same objects the listing detail page builds, hands them
// to the same component the page mounts, and asserts against the HTML string.
// What it checks is what a reader would check: that the eleven things boundary 4
// requires are on the screen, in both languages, and that nothing behind the
// public view is.
//
// The route itself cannot be rendered here. It is an async server component that
// opens a Supabase client, and standing up a database in a unit test would test
// the fixture rather than the page. What is testable without inventing a
// database is the whole chain below the route, which is what this file does; the
// route's own wiring is held by `reachability.test.ts`, and the rendered page in
// both languages is verified on the deployed preview and recorded in the
// handback.

const NOW = Date.parse("2026-07-31T00:00:00Z");
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

// A lease row of the shape the listing detail page loads.
const LEASE = {
  id: "l1",
  deal_type: "lease",
  asset_type: "office",
  area_sqm: 450,
  asking_rent_sqm: 1250,
  service_charge_sqm: 180,
  availability_confirmed_at: iso(12),
};

const EN = { locale: "en" as const, account: null, geography: "Al Olaya, Riyadh", now: NOW };
const AR = { locale: "ar" as const, account: null, geography: "العليا، الرياض", now: NOW };

function render(view: PublicEvidenceView, label: string, ar: boolean): string {
  return renderToStaticMarkup(
    <EvidencePassport view={view} label={label} ar={ar} locale={ar ? "ar" : "en"} />
  );
}

function viewsFor(ar: boolean) {
  return listingEvidenceByField(LEASE, ar ? AR : EN);
}

/** The rent figure, in the reader's language, exactly as the page would build it. */
function rent(ar: boolean): PublicEvidenceView {
  const v = viewsFor(ar).get("asking_rent_sqm");
  assert.ok(v, "the lease row stopped producing a rent passport");
  return v;
}

// ---------------------------------------------------------------------------
// It renders at all, and as a disclosure
// ---------------------------------------------------------------------------

test("render: the passport is a native disclosure with a named summary", () => {
  for (const ar of [false, true]) {
    const html = render(rent(ar), ar ? "الإيجار المطلوب" : "Asking rent", ar);
    assert.match(html, /<details/, `${ar ? "ar" : "en"}: not a disclosure`);
    assert.match(html, /<summary/, `${ar ? "ar" : "en"}: no summary to operate`);
    // Boundary 5 asks for a compact indicator first. The chip is inside the
    // summary and the detail panel is outside it, which is what makes the panel
    // closed until asked for.
    const sum = html.slice(html.indexOf("<summary"), html.indexOf("</summary>"));
    // ELITE-4 J3-21. This used to assert the summary carried an aria-label. That
    // was the defect, not the fix: an aria-label replaces every child in the name
    // computation, so the provenance tier on the chip, which is the whole point of
    // the passport, was not in the name a screen reader read or a voice-control
    // user could speak. The name is computed from the children now, so what is
    // asserted here is the absence of the override, plus (below, unchanged) that
    // the figure is still named inside the summary, which a visually hidden span
    // now carries.
    assert.ok(
      !/<summary[^>]*aria-label=/.test(sum),
      "the summary overrides its visible children with an aria-label again"
    );
    assert.ok(
      sum.includes(ar ? "الإيجار المطلوب" : "Asking rent"),
      "the summary does not name the figure it explains"
    );
    assert.ok(
      html.indexOf('class="evi-body"') > html.indexOf("</summary>"),
      "the detail panel is inside the summary, so it is not disclosed progressively"
    );
  }
});

test("render: the collapsed line stays compact and every pill on it can wrap", () => {
  for (const ar of [false, true]) {
    const html = render(rent(ar), ar ? "الإيجار المطلوب" : "Asking rent", ar);
    const sum = html.slice(html.indexOf("<summary"), html.indexOf("</summary>"));

    // The passport mounts in a tile inside an auto-fit grid on the listing page,
    // and that tile narrows to about 103px once the grid splits. Nothing on this
    // line may be unbreakable at that width. The responsive probe measures the
    // consequence; this asserts the cause, because the probe is not in `npm test`
    // and a nowrap put back by hand would otherwise ship unnoticed.
    assert.ok(
      !/white-space:\s*nowrap/.test(sum),
      `${ar ? "ar" : "en"}: a pill on the collapsed line cannot wrap out of a narrow tile`
    );

    // Compact per boundary 5: the chip says the tier, not the tier and a date.
    assert.ok(
      !/checked |روجع /.test(sum),
      `${ar ? "ar" : "en"}: the compact indicator repeats a date the panel already carries`
    );

    // And the date is not lost by that: it is below, on the freshness row, where
    // it sits beside the record it describes.
    const body = html.slice(html.indexOf("</summary>"));
    assert.ok(
      /last updated|آخر تحديث/.test(body),
      `${ar ? "ar" : "en"}: dropping the chip date dropped the date`
    );
  }
});

// ---------------------------------------------------------------------------
// Boundary 4: the eleven things, on the screen, in both languages
// ---------------------------------------------------------------------------

const REQUIRED_ROWS: readonly [string, string][] = [
  ["Statistic", "نوع الرقم"],
  ["Unit", "الوحدة"],
  ["Source", "المصدر"],
  ["What SAT did", "ما فعلته سات"],
  ["Reporting period", "فترة التقرير"],
  ["Geography", "النطاق الجغرافي"],
  ["Subject", "موضوع الرقم"],
  ["Asset type", "نوع الأصل"],
  ["Sample", "كفاية العينة"],
  ["Freshness", "الحداثة"],
];

const REQUIRED_SECTIONS: readonly [string, string][] = [
  ["What was checked", "ما الذي جرى التحقق منه"],
  ["Correction history", "سجل التصحيحات"],
  ["What is permitted", "ما المسموح بهذا الرقم"],
];

for (const [en, ar] of [...REQUIRED_ROWS, ...REQUIRED_SECTIONS]) {
  test(`render: the passport states "${en}" in both languages`, () => {
    assert.ok(render(rent(false), "Asking rent", false).includes(en), `en: ${en} is missing`);
    assert.ok(render(rent(true), "الإيجار المطلوب", true).includes(ar), `ar: ${ar} is missing`);
  });
}

test("render: the three permissions each carry an answer", () => {
  for (const ar of [false, true]) {
    const html = render(rent(ar), "x", ar);
    for (const k of ar
      ? ["العرض هنا", "التصدير", "الاستخدام في المساعد"]
      : ["Display here", "Export", "Use by the assistant"]) {
      assert.ok(html.includes(k), `${ar ? "ar" : "en"}: the ${k} permission is not stated`);
    }
  }
});

test("render: freshness carries the date the lister last affirmed the filing", () => {
  // Twelve days old against a sixty day tolerance, so the figure is current and
  // the date is the evidence for that rather than a decoration.
  assert.match(render(rent(false), "x", false), /last updated \d{2} \w+ 2026/);
  assert.ok(render(rent(true), "x", true).includes("آخر تحديث"));
});

test("render: both languages produce the same rows", () => {
  const count = (h: string) => h.split('class="evi-row"').length - 1;
  const en = render(rent(false), "x", false);
  const ar = render(rent(true), "x", true);
  assert.equal(count(en), REQUIRED_ROWS.length);
  assert.equal(count(ar), count(en), "the Arabic passport shows a different number of rows");
});

// ---------------------------------------------------------------------------
// Boundary 10: absence is stated, never filled
// ---------------------------------------------------------------------------

test("render: an absent value says it is not stated rather than disappearing", () => {
  const v = rent(false);
  // A listing figure has no reporting period, which is correct and is the case
  // the page actually hits: a rent quoted today describes now, not a quarter.
  assert.equal(v.period, null);
  const html = render(v, "x", false);
  const row = html.slice(html.indexOf("Reporting period"));
  assert.match(row.slice(0, 200), /Not stated/, "the empty period row was silently dropped");
});

test("render: an empty verification record and an empty history say so", () => {
  const html = render({ ...rent(false), verification: [], corrections: [] }, "x", false);
  assert.match(html, /No verification record is attached to this figure/);
  assert.match(html, /No correction has been recorded for this figure/);
});

test("render: a correction is shown with its date and its reason", () => {
  const html = render(
    {
      ...rent(false),
      corrections: [
        {
          at: iso(5),
          kind: "correction",
          reason: "Lister refiled the quoted rent",
          previousDisplay: "1,100",
        },
      ],
    },
    "x",
    false
  );
  assert.match(html, /Lister refiled the quoted rent/);
  assert.match(html, /Previously shown: 1,100/);
});

test("render: a correction filed in the other language is tagged, never translated", () => {
  const filed = "Lister refiled the quoted rent after remeasurement";
  const c = { at: iso(5), kind: "correction" as const, reason: filed, reasonLang: "en" as const };

  // The Arabic reader gets the words that were filed, marked as English, so a
  // screen reader pronounces them and bidi resolves them left to right.
  const ar = render({ ...rent(true), corrections: [c] }, "x", true);
  assert.ok(ar.includes(filed), "the filed words were altered on the Arabic page");
  assert.match(ar, /<span lang="en" dir="ltr">/, "foreign filed text was left unmarked");

  // The English reader is the filer's own audience, so nothing is marked.
  const en = render({ ...rent(false), corrections: [c] }, "x", false);
  assert.ok(en.includes(filed));
  assert.ok(!/<span lang="en"/.test(en), "text already in the reader's language was tagged as foreign");
});

test("render: a correction filed in both languages shows each reader their own", () => {
  const c = {
    at: iso(5),
    kind: "correction" as const,
    reason: { en: "Restated to the published basis", ar: "أُعيدت صياغتها على الأساس المنشور" },
  };
  const en = render({ ...rent(false), corrections: [c] }, "x", false);
  const ar = render({ ...rent(true), corrections: [c] }, "x", true);
  assert.ok(en.includes("Restated to the published basis"));
  assert.ok(!en.includes("أُعيدت"), "the English page carried the Arabic filing");
  assert.ok(ar.includes("أُعيدت صياغتها على الأساس المنشور"));
  assert.ok(!ar.includes("Restated to the published basis"), "the Arabic page carried the English filing");
  // Both are the reader's own language, so neither is tagged as foreign.
  assert.ok(!/ lang="(en|ar)"/.test(en + ar), "a native filing was marked foreign");
});

test("render: an unrecorded filing language is left unmarked rather than guessed", () => {
  // Asserting a language nobody recorded is a claim, and a wrong `lang` makes a
  // screen reader read the sentence as gibberish. Silence is the honest answer.
  const html = render(
    { ...rent(true), corrections: [{ at: iso(5), kind: "correction" as const, reason: "Refiled" }] },
    "x",
    true
  );
  assert.ok(html.includes("Refiled"));
  assert.ok(!/ lang="/.test(html), "an unrecorded filing language was guessed at");
});

test("render: every state that applies is stated, not only the headline one", () => {
  const v = rent(false);
  const html = render({ ...v, states: ["stale", "derived"], state: "stale" }, "x", false);
  // Two states, two notes. A reader told a figure is stale while the reason it
  // is also derived stays hidden has been told half the answer.
  assert.equal(html.split('class="evi-note"').length - 1 >= 2, true);
});

// ---------------------------------------------------------------------------
// Boundary 6: nothing behind the public view can reach the HTML
// ---------------------------------------------------------------------------

const SENTINEL = { stop: "QQX" + "STOPCOND", note: "QQX" + "REVIEWNOTE" };

function sourcedPassport(over: Partial<Passport> = {}): Passport {
  return {
    field: "rent_sar_sqm_year",
    subjectKind: "segment",
    value: "1,250",
    unit: "sar_sqm_year",
    assetType: "office",
    tier: "sourced",
    statistic: "median",
    transformation: "as_published",
    sufficiency: "sufficient",
    sourceId: "rega_ejar",
    period: "2026-Q2",
    geography: "Riyadh, Olaya",
    asOf: iso(20),
    maxAgeDays: 180,
    ...over,
  } as Passport;
}

const RIGHTS = {
  sourceId: "rega_ejar",
  storagePolicy: "full",
  redisplayPolicy: "public",
  derivedDisplayPolicy: "public",
  exportPolicy: "internal",
  aiRetrievalPolicy: "none",
  modelInputPolicy: "none",
  rightsStatus: "evidenced",
  stopCondition: SENTINEL.stop,
  reviewedAt: iso(30),
  reviewedNote: SENTINEL.note,
} as SourceRights;

test("render: no internal licence field reaches the HTML, whatever the rights row holds", () => {
  const v = publicEvidenceView(sourcedPassport(), {
    pageKind: "segment",
    rights: RIGHTS,
    now: NOW,
  });
  for (const ar of [false, true]) {
    const html = render(v, "x", ar);
    assert.ok(!html.includes(SENTINEL.stop), "the stop condition was rendered");
    assert.ok(!html.includes(SENTINEL.note), "the review note was rendered");
  }
});

test("render: a permitted source names its owner in the reader's language and its reference", () => {
  const v = publicEvidenceView(sourcedPassport(), {
    pageKind: "segment",
    rights: RIGHTS,
    now: NOW,
  });
  assert.ok(render(v, "x", false).includes(RENT_INDEX_SOURCE.en), "the source owner is missing");
  const ar = render(v, "x", true);
  assert.ok(ar.includes(RENT_INDEX_SOURCE.ar), "the Arabic page named the owner in English");
  for (const ar2 of [false, true]) {
    assert.ok(render(v, "x", ar2).includes("rega_ejar"), "the permitted source reference is missing");
  }
});

test("render: a denied figure shows neither its value nor the licensor it names", () => {
  // No rights row at all: an unread permission is not a permission.
  const v = publicEvidenceView(sourcedPassport(), { pageKind: "segment", rights: null, now: NOW });
  const html = render(v, "x", false);
  assert.equal(v.value, null);
  assert.ok(!html.includes("1,250"), "a figure we may not publish was published");
  assert.ok(!html.includes("Real Estate General Authority"), "a prohibited row named its licensor");
});

// ---------------------------------------------------------------------------
// The laws, on the rendered output rather than on the source
// ---------------------------------------------------------------------------

test("render: no em dash reaches either language", () => {
  for (const ar of [false, true]) {
    assert.ok(!render(rent(ar), "x", ar).includes("\u2014"), `${ar ? "ar" : "en"}: em dash rendered`);
  }
});

test("render: Law 7, the Arabic passport uses Western numerals", () => {
  const html = render(rent(true), "الإيجار المطلوب", true);
  assert.doesNotMatch(html, /[٠-٩]/, "Eastern Arabic numerals reached the Arabic passport");
  assert.match(html, /\d/, "the Arabic passport rendered no digits at all, so the check is vacuous");
});

test("render: Law 5, no satestate gold token reaches the passport", () => {
  for (const ar of [false, true]) {
    const html = render(rent(ar), "x", ar).toLowerCase();
    assert.ok(!html.includes("8a7342"), "the retired gold token reached a rendered passport");
    assert.ok(!html.includes("badge-gold"), "the retired gold badge class reached a rendered passport");
  }
});

// ---------------------------------------------------------------------------
// The producer, through to the render, for the figures the page actually shows
// ---------------------------------------------------------------------------

test("render: every figure the lease row holds renders its own passport", () => {
  const views = viewsFor(false);
  assert.deepEqual(
    [...views.keys()].sort(),
    ["area_sqm", "asking_rent_sqm", "service_charge_sqm"],
    "the lease row produces a different set of passports than the page renders"
  );
  for (const [field, v] of views) {
    const html = render(v, field, false);
    assert.match(html, /<details/, `${field} produced no disclosure`);
    assert.ok(html.includes("What is permitted"), `${field} rendered without its permissions`);
  }
});

test("render: the derived price per square metre says SAT derived it", () => {
  const sale = listingEvidenceByField(
    {
      id: "s1",
      deal_type: "sale",
      asset_type: "retail",
      area_sqm: 400,
      sale_price: 8_000_000,
      availability_confirmed_at: iso(3),
    },
    EN
  );
  const pps = sale.get("sale_price_sqm");
  assert.ok(pps, "the sale row stopped producing a derived price per square metre");
  assert.equal(pps.tier, "computed");
  const html = render(pps, "Price per m2", false);
  // The tier and the transformation are two different sentences and both are on
  // the screen: SAT computed it, and the way it computed it was derivation.
  assert.ok(html.includes("Derived by SAT") || html.includes("Derived"), "the derivation is not stated");
  assert.ok(!html.includes("Stated by the lister"), "a derived figure was credited to the lister");
});

/**
 * Every `min-height` this stylesheet declares for a selector, in source order,
 * each tagged with the media conditions it sits inside.
 *
 * Written as a scanner rather than a regex because the question this test asks
 * is not "does the number appear in the file" but "which declaration wins", and
 * that needs to know what block each one is in. Comments are stripped first:
 * one of them quotes a rule, braces and all, and a brace counter cannot tell a
 * quoted rule from a real one.
 */
function minHeightsFor(css: string, selector: string): { px: number; media: string[] }[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { px: number; media: string[] }[] = [];
  const open: { cond: string; depth: number }[] = [];
  let depth = 0;
  let preludeStart = 0;
  let i = 0;

  while (i < src.length) {
    const c = src[i];
    if (c === "{") {
      const prelude = src.slice(preludeStart, i).trim();
      if (prelude.startsWith("@")) {
        depth += 1;
        open.push({ cond: prelude, depth });
        i += 1;
        preludeStart = i;
        continue;
      }
      const end = src.indexOf("}", i);
      const body = src.slice(i + 1, end === -1 ? src.length : end);
      const hit = prelude
        .split(",")
        .map((s) => s.trim().replace(/\s*>\s*/g, ">"))
        .includes(selector);
      const mh = /(?:^|;)\s*min-height:\s*(\d+)px/.exec(body);
      if (hit && mh) out.push({ px: Number(mh[1]), media: open.map((m) => m.cond) });
      i = (end === -1 ? src.length : end) + 1;
      preludeStart = i;
      continue;
    }
    if (c === "}") {
      if (open.length > 0 && open[open.length - 1].depth === depth) open.pop();
      depth -= 1;
      i += 1;
      preludeStart = i;
      continue;
    }
    i += 1;
  }
  return out;
}

/** Does every condition in this stack hold at viewport width `w`? */
function appliesAt(media: string[], w: number): boolean {
  return media.every((cond) => {
    const max = /max-width:\s*(\d+)px/.exec(cond);
    const min = /min-width:\s*(\d+)px/.exec(cond);
    if (max && w > Number(max[1])) return false;
    if (min && w < Number(min[1])) return false;
    return true;
  });
}

test("stylesheet: the disclosure resolves to 44px on touch layouts", () => {
  // Not a render assertion, because the height is not in the markup: the summary
  // is a bare <summary className="evi-sum"> and its size comes entirely from
  // globals.css. A test that only read the HTML would pass while the control was
  // 40px tall on every phone the platform is tested at.
  //
  // And not a presence assertion either, which is the correction this test
  // carries. The first version asserted that a 44px rule existed in the
  // touch-target block and that a 40px base rule existed below it. Both were
  // true and the control was still 40px on every touch width: the two selectors
  // are both `.evi>summary`, specificity (0,1,1), a media query adds nothing to
  // specificity, and at equal specificity the later declaration wins. The
  // assertion had moved one level up from the markup and still was not
  // measuring the outcome. So this resolves the cascade: last applying
  // declaration at the width, which is what the browser does.
  //
  // 44px is the platform's own standard, set against WCAG 2.5.5 and applied to
  // chips, tabs, buttons and icon-only controls. The passport summary is a
  // control by the same test: it is focusable, keyboard-operable, carries
  // cursor:pointer, and tapping it is the only way to reach the evidence.
  const css = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");
  const decls = minHeightsFor(css, ".evi>summary");
  assert.ok(decls.length > 0, "no min-height is declared for the passport disclosure at all");

  // The widths the responsive probe measures, plus the media boundary itself.
  for (const w of [320, 360, 390, 430, 768, 1024]) {
    const winner = decls.filter((d) => appliesAt(d.media, w)).pop();
    assert.ok(winner, `no min-height applies to the disclosure at ${w}px`);
    assert.ok(
      winner.px >= 44,
      `the disclosure resolves to ${winner.px}px at ${w}px wide, under the platform's 44px`
    );
  }

  // And a floor still holds on a pointer device, so the control is never
  // text-height there either.
  const desktop = decls.filter((d) => appliesAt(d.media, 1280)).pop();
  assert.ok(desktop && desktop.px >= 40, "the base disclosure height floor was dropped");
});
