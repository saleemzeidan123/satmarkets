import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Why this file exists
//
// Findings 159, 157, 180 and 181, which are four reports of one property: a
// control was given a caption that the browser never attached to it, so the
// caption was a fact about the screen and not about the control.
//
//   159: four contact channel checkboxes under a bare `<label>`. A `<label>`
//   with no `htmlFor` and no control inside it names nothing at all, so the
//   question the four boxes answer reached nobody, and they arrived as four
//   unrelated choices.
//
//   157: every per-row `<select>` in the Studio's document and plan uploaders
//   carried the same `aria-label`. Four uploads produced four controls all
//   called "Document type". Which file each one classified was written beside
//   it on screen and nowhere else.
//
//   180: every radio in the match list was called "Attach this listing to your
//   response", identically, and the group had a bold `<div>` for a caption. The
//   options were told apart by which card they were drawn inside.
//
//   181: the size range's visible label read one thing and the control's
//   `aria-label` read another, so the accessible name did not contain the
//   visible one and a speech user could not address the control by the words
//   printed on it (SC 2.5.3).
//
// The shape of all four is that the repository could not see the defect,
// because each one is a relationship between two things rather than a property
// of either. So this guard checks the relationship. The negative rules forbid a
// caption that attaches to nothing and a name that two controls share; the
// positive rules assert the specific structures the fixes put in, because a
// rewrite that deleted the group would satisfy the negatives while losing the
// fix.
//
// What this file cannot do is prove how any of it is announced. It reads text.
// A `<fieldset>` with a `<legend>` is evidence that the markup is right.
// Screen-reader verification is recorded as outstanding in
// docs/findings-register.md and is not claimed here.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");

/** The four critical journeys of PKG-A11Y-1, by route and component prefix. */
const JOURNEYS = [
  "src/app/[locale]/login",
  "src/app/[locale]/signup",
  "src/app/[locale]/dashboard",
  "src/app/[locale]/list",
  "src/app/[locale]/listings",
  "src/app/[locale]/post-requirement",
  "src/app/[locale]/requirements",
  "src/components/EditListingForm.tsx",
  "src/components/ListingStudio.tsx",
  "src/components/ProfileForm.tsx",
  "src/components/ListingDocsManager.tsx",
  "src/components/ListingMediaManager.tsx",
  // Added in slice H. It is a shared component rather than a route, but it is the
  // control both listing journeys use to place a building, and finding 153 lived
  // in it.
  "src/components/LocationPicker.tsx",
];

function rel(p: string): string {
  return relative(ROOT, p).split(sep).join("/");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * Source with its comments removed.
 *
 * These files explain their own markup, and the explanations quote it: the
 * header of list/page.tsx says in prose that a `<label>` with no control is a
 * promise the page cannot keep, which is the exact string this file forbids. A
 * scan of the raw text fails on the sentence describing the fix rather than on
 * any defect.
 *
 * A block comment is replaced by its own newlines rather than by nothing, so
 * every line in the result is the line it was in the file. The exemption keys
 * below are line numbers, and a key that counted lines in a stripped copy would
 * move whenever a comment above it grew, which is a worse version of the
 * staleness the exemption audit exists to catch.
 */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => "\n".repeat((m.match(/\n/g) ?? []).length))
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const FILES: { path: string; src: string }[] = [];
for (const j of JOURNEYS) {
  const abs = join(ROOT, ...j.split("/"));
  const paths = statSync(abs).isDirectory() ? walk(abs) : [abs];
  for (const p of paths) FILES.push({ path: rel(p), src: code(readFileSync(p, "utf8")) });
}

function file(path: string): string {
  const f = FILES.find((x) => x.path === path);
  assert.ok(f, `${path} is missing from the journey scan; the scan has stopped working`);
  return f!.src;
}

// ---------------------------------------------------------------------------

/**
 * path:line -> why that caption is allowed to name no control.
 *
 * Empty since slice H, and that is the point of keeping it. Slice G left one
 * entry here, the map position caption over LocationPicker, because finding 153
 * needed the picker's search box to become a real combobox before a caption had
 * anything to be a caption of. Slice H did that work and the entry went. An
 * exemption is a debt with a name on it, not a permanent category.
 */
const BARE_LABEL_EXEMPT: Record<string, string> = {};

test("no caption in a critical journey names a control that does not exist", () => {
  const bad: string[] = [];
  for (const f of FILES) {
    for (const m of f.src.matchAll(/<label\b[^>]*>/g)) {
      if (m[0].includes("htmlFor")) continue;
      const end = f.src.indexOf("</label>", m.index! + m[0].length);
      const body = f.src.slice(m.index! + m[0].length, end < 0 ? undefined : end);
      if (/<(input|select|textarea)\b/.test(body)) continue;
      const line = f.src.slice(0, m.index).split("\n").length;
      const key = `${f.path}:${line}`;
      if (!BARE_LABEL_EXEMPT[key]) bad.push(`${key} ${m[0]} over ${body.trim().slice(0, 60)}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "finding 159. A `<label>` with no `htmlFor` and no control inside it is attached to " +
      "nothing: it is styled text that happens to be an element. Where it captions one " +
      "control, give the control an id and the label the matching `htmlFor`. Where it " +
      "captions a set of them, which is the case this package found, the element that " +
      "means that is `<fieldset>` with a `<legend>`, and the caption goes in the legend. " +
      "Do not reach for `aria-label` on each control instead: that replaces one shared " +
      `question with several unrelated ones. Offenders:\n${bad.join("\n")}`,
  );
});

test("no two controls in one file answer to the same name", () => {
  const bad: string[] = [];
  for (const f of FILES) {
    const seen = new Map<string, number>();
    for (const m of f.src.matchAll(/aria-label=(\{[^}]*\}|"[^"]*")/g)) {
      seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
    }
    for (const [v, n] of seen) if (n > 1) bad.push(`${f.path}: ${n} controls named ${v.slice(0, 70)}`);
  }
  assert.deepEqual(
    bad,
    [],
    "finding 157. Two controls with the same accessible name are one control as far as " +
      "anything but sight is concerned. This is what a `.map()` produces by default, " +
      "because the literal is written once and rendered per row, and it is worst exactly " +
      "where it matters most: a list of uploaded files, where the row is the whole point. " +
      "Put the row number and the row's own subject in the name. The number is what " +
      "guarantees uniqueness, because two uploads may legitimately share a file name and " +
      `a name may be empty. Offenders:\n${bad.join("\n")}`,
  );
});

test("every bare-label exemption still names a real site", () => {
  const live = new Set<string>();
  for (const f of FILES) {
    for (const m of f.src.matchAll(/<label\b[^>]*>/g)) {
      if (m[0].includes("htmlFor")) continue;
      const end = f.src.indexOf("</label>", m.index! + m[0].length);
      const body = f.src.slice(m.index! + m[0].length, end < 0 ? undefined : end);
      if (/<(input|select|textarea)\b/.test(body)) continue;
      live.add(`${f.path}:${f.src.slice(0, m.index).split("\n").length}`);
    }
  }
  const stale = Object.keys(BARE_LABEL_EXEMPT).filter((k) => !live.has(k));
  assert.deepEqual(
    stale,
    [],
    "an exemption points at a line that no longer holds a bare label. Line numbers move, " +
      "so a stale key is not harmless: it stops excusing the site it was written for and " +
      `starts excusing whatever moved into that line. Re-point it or delete it:\n${stale.join("\n")}`,
  );
});

// ---------------------------------------------------------------------------
// The positive halves. Each rule above proves only that the old shape is gone,
// and a rewrite that deleted the group would satisfy all of them.

test("the contact channel checkboxes are a named group", () => {
  const src = file("src/components/EditListingForm.tsx");
  assert.match(
    src,
    /<fieldset style=\{fset\}>\s*<legend style=\{lbl\}>\{t\.channels\}<\/legend>/,
    "finding 159. The four channel checkboxes must stay inside a `<fieldset>` whose " +
      "`<legend>` is the channels caption. `fset` and `lbl` are the same objects the div " +
      "and label carried, so the group is visually inert; the element names are the whole " +
      "of the change.",
  );
});

test("each upload row's type control is named for its own row", () => {
  const src = file("src/components/ListingStudio.tsx");
  for (const label of ['t("Document type", "نوع المستند")', 't("Plan type", "نوع المخطط")']) {
    const want = "`${" + label + "} ${i + 1}: ${file.name || " + 't("unnamed file", "ملف بلا اسم")}`';
    assert.ok(
      src.includes(want),
      `finding 157. The per-row select must be named \`${want}\`. The row number carries ` +
        "uniqueness and the empty-name case; the file name carries which row it is. " +
        "Dropping either half puts the defect back, and dropping the number puts it back " +
        "silently, because it only reappears when two uploads share a name.",
    );
  }
});

test("the match list is a named group with a way out of it", () => {
  const src = file("src/app/[locale]/requirements/[id]/page.tsx");
  assert.match(
    src,
    /<legend style=\{\{ fontSize: "0\.84375rem", fontWeight: 700, padding: 0 \}\}>\{t\.matchesH\}<\/legend>/,
    "finding 180. The match list caption must be the group's `<legend>`, carrying the " +
      "styling the caption div carried. It reuses an existing string, so this costs no " +
      "new dictionary key in either language.",
  );
  assert.match(
    src,
    /checked=\{attached === null\}[\s\S]{0,80}setAttached\(null\)/,
    "finding 180. The group must offer attaching nothing as an option, and that option is " +
      "the one that starts selected. Without it there is no way back out of the group once " +
      "a listing is chosen.",
  );
  assert.doesNotMatch(
    src,
    /setAttached\(on \? null :/,
    "finding 180. `setAttached(on ? null : id)` reads as a toggle and is not one: a radio's " +
      "change event does not fire on the option that is already selected, so the clearing " +
      "branch is unreachable. Deselecting is what the explicit none option is for.",
  );
  assert.match(
    src,
    /<span className="sronly">\{mt\}<\/span>/,
    "finding 180. Each radio's name must carry its own listing title. Without it every " +
      "option in the group is called the same thing and they are distinguished only by " +
      "which card they are drawn inside, which is a visual fact.",
  );
});

test("the size range is a group whose names contain its caption", () => {
  const src = file("src/app/[locale]/post-requirement/RequirementForm.tsx");
  assert.match(
    src,
    /<legend style=\{\{ padding: 0 \}\}>\{pr\.sizeRange\}<\/legend>/,
    "finding 181. Two inputs under one caption are a group, and this form already writes " +
      "three others exactly this way.",
  );

  const en = JSON.parse(readFileSync(join(ROOT, "src", "i18n", "dictionaries", "en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(ROOT, "src", "i18n", "dictionaries", "ar.json"), "utf8"));
  // The RequirementForm strings live under `postReq`, not under a section named
  // after the route. Resolving this by fallback chain would hide a rename behind
  // a thrown property access, so it is named once and asserted.
  for (const [lang, d] of [["en", en], ["ar", ar]] as const) {
    const pr = d.postReq;
    assert.ok(pr?.sizeRange, `the size range caption is missing from ${lang}.json postReq`);
    for (const k of ["sizeMinLabel", "sizeMaxLabel"]) {
      assert.ok(
        typeof pr[k] === "string" && pr[k].includes(pr.sizeRange),
        `finding 181, SC 2.5.3. ${lang}.json ${k} must contain the visible caption ` +
          `"${pr.sizeRange}" verbatim. The caption is what is printed on the screen, so it ` +
          "is what a speech user says; a name that does not contain it is a name the " +
          `control does not answer to. Current value: "${pr[k]}"`,
      );
    }
  }
  assert.doesNotMatch(
    ar.postReq.sizeMinLabel + ar.postReq.sizeMaxLabel,
    /,/,
    "the Arabic size names use an ASCII comma. Arabic takes the Arabic comma, and ar-lint " +
      "enforces this everywhere else.",
  );
});

test("the attach-nothing option exists in both languages and is written in each script", () => {
  const en = JSON.parse(readFileSync(join(ROOT, "src", "i18n", "dictionaries", "en.json"), "utf8"));
  const ar = JSON.parse(readFileSync(join(ROOT, "src", "i18n", "dictionaries", "ar.json"), "utf8"));
  const e = en.reqDetail?.matchesAttachNone;
  const a = ar.reqDetail?.matchesAttachNone;
  assert.ok(typeof e === "string" && e.trim().length > 0, "reqDetail.matchesAttachNone is missing from en.json");
  assert.ok(typeof a === "string" && a.trim().length > 0, "reqDetail.matchesAttachNone is missing from ar.json");
  assert.match(
    a,
    /[؀-ۿ]/,
    "the Arabic attach-nothing option contains no Arabic. It is the option that starts " +
      "selected, so an Arabic reader opening the panel would hear the English string first.",
  );
  assert.notEqual(a, e, "the Arabic attach-nothing option is the English string");
});

// ---------------------------------------------------------------------------
// Slice H. Finding 153, and finding 196 which came out of fixing it.

test("the location search box is a combobox that says what it controls", () => {
  const src = file("src/components/LocationPicker.tsx");
  for (const attr of [
    'role="combobox"',
    "aria-expanded={open}",
    "aria-controls={listId}",
    'aria-autocomplete="list"',
    "aria-activedescendant={open && active >= 0 ? optId(active) : undefined}",
  ]) {
    assert.ok(
      src.includes(attr),
      `finding 153. The search box must declare \`${attr}\`. Before slice H it was a plain ` +
        "input and the suggestions were a bare div of buttons, so the list opened and closed " +
        "in silence: nothing said a list existed, nothing said how many were in it, and " +
        "nothing tied the input to the thing it had produced. Each of these five is a " +
        "different half of that sentence and none of them substitutes for another.",
    );
  }
  assert.match(
    src,
    /role="listbox"[\s\S]{0,200}aria-label=/,
    "finding 153. The suggestion list must be a named listbox. `aria-controls` pointing at " +
      "a plain div names a region with no role, which is not what the combobox contract " +
      "promises the reader is there.",
  );
  assert.match(
    src,
    /role="option"\s*\n?\s*aria-selected=\{i === active\}/,
    "finding 153. Each suggestion must be an option that reports whether it is the active " +
      "one. Without `aria-selected` the arrow keys move a highlight that only sight can see.",
  );
});

test("the suggestion list is driven from the input and not from the tab order", () => {
  const src = file("src/components/LocationPicker.tsx");
  const list = src.slice(src.indexOf('role="listbox"'), src.indexOf("</ul>"));
  assert.ok(list.length > 0, "the suggestion list has gone; the scan has stopped working");
  assert.doesNotMatch(
    list,
    /<button/,
    "finding 153. The options were <button> elements, which put every suggestion in the tab " +
      "order as a separate stop. In this pattern focus stays in the text box and " +
      "`aria-activedescendant` names the active option, so a focusable option would offer " +
      "the same choice twice and take the caret out of the box the lister is typing in.",
  );
  assert.match(
    list,
    /onMouseDown=\{\(e\) => \{ e\.preventDefault\(\); choose\(i\); \}\}/,
    "finding 153. The pointer path must be `onMouseDown` with the default prevented, so it " +
      "fires before the input's blur and ends in the same `choose` call the keyboard uses. " +
      "`onClick` on a non-focusable option after a blur is where these two paths drift apart.",
  );
});

test("the arrow keys that move a vertical list are taken and the ones that move a caret are not", () => {
  const src = file("src/components/LocationPicker.tsx");
  for (const k of ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape", "Tab"]) {
    assert.ok(src.includes(`e.key === "${k}"`), `finding 153. The combobox must handle ${k}.`);
  }
  for (const k of ["ArrowLeft", "ArrowRight"]) {
    assert.ok(
      !src.includes(`e.key === "${k}"`),
      `finding 153. ${k} must NOT be intercepted. Inside a text box it moves the caret, it ` +
        "already reverses itself under `dir=\"rtl\"` without any help, and taking it would " +
        "break ordinary Arabic editing to serve a list the lister may not be looking at. " +
        "Vertical has no direction, which is why Down and Up are the correct keys in both " +
        "languages and why direction-awareness here means leaving the horizontal pair alone.",
    );
  }
});

test("choosing a suggestion does not reopen the list on the thing just chosen", () => {
  const src = file("src/components/LocationPicker.tsx");
  assert.match(
    src,
    /if \(chosen\.current !== null && s === chosen\.current\) return;/,
    "finding 196. Choosing a suggestion writes its label into the search box, and that is a " +
      "change to the query like any other, so the debounced search fires 350ms later and " +
      "reopens the list on the item the lister has just picked. With a combobox that is " +
      "worse than untidy: the reopen re-announces, and the reader is told a list appeared " +
      "that they did not ask for and did not do anything to cause.",
  );
  assert.match(
    src,
    /onChange=\{\(e\) => \{ chosen\.current = null;/,
    "finding 196. Typing must clear the suppressed query, or the lister who picks a " +
      "suggestion, edits it back to what it was and expects the list again never gets it.",
  );
});

test("the location caption is a group in both forms that place a building", () => {
  assert.match(
    file("src/components/EditListingForm.tsx"),
    /<fieldset style=\{fset\}>\s*<legend style=\{lbl\}>\{t\.loc\}<\/legend>/,
    "finding 153. The map position caption must be the group's legend. It cannot be a " +
      "`htmlFor`, because the picker is a search box, a map, a latitude and a longitude, " +
      "which is four controls and not one.",
  );
  assert.match(
    file("src/components/ListingStudio.tsx"),
    /<legend className=\{lbl\}>\{t\("Place the building on the map"/,
    "finding 153. The Studio's coordinates step had the same caption on a <div> carrying a " +
      "label class, which is styled text. Its own comment already said the picker owns " +
      "several controls and the group carries the state; that reading was right and the " +
      "element was wrong.",
  );
});

test("a fieldset can shrink, and a legend looks like the label it stands in for", () => {
  const globals = readFileSync(join(ROOT, "src", "styles", "globals.css"), "utf8");
  assert.match(
    globals,
    /fieldset\s*\{[^}]*min-inline-size:\s*0/,
    "PKG-A11Y-1 RC8. `fieldset { min-inline-size: 0 }` must stay. Tailwind preflight " +
      "resets fieldset margin, padding and border but not `min-inline-size: min-content`, " +
      "which is a UA default unique to this element and which stops it shrinking below the " +
      "intrinsic width of its contents. That is the RC7 property again: a box that cannot " +
      "become narrower than its content clips at 400 percent zoom, silently, because html " +
      "and body are `overflow-x:clip`. Converting groups to fieldsets without this rule " +
      "would have traded one accessibility defect for a reflow one.",
  );
  const platform = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
  assert.match(
    platform,
    /\.field legend\{/,
    "PKG-A11Y-1 RC8. `.field legend` must keep matching `.field label`. There was no rule " +
      "for legend at all, so groups written correctly rendered their caption at body size " +
      "beside sibling labels at 0.75rem. Codex: do not reduce visual quality to satisfy " +
      "accessibility.",
  );
});
