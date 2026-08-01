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
  // Added in slice I. SignupFlow is the whole of journey 1 after the route shell,
  // and ListingEnquiry is where journey 3 ends, so a scan that stopped at the route
  // file was scanning the wrapper and not the work. Both held findings this slice.
  "src/components/SignupFlow.tsx",
  "src/components/ListingEnquiry.tsx",
  // Added in slice K. The listings route file draws the split view's header and
  // its view pair, but the map half of that split, and every dialog semantic
  // attached to it, lives here. Findings 167 and 200 are both about which of the
  // two controls is a navigation and which opens a dialog, so a scan that saw
  // only one side of the split could not check either one.
  "src/components/ListingsMap.tsx",
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


// ---------------------------------------------------------------------------
// RC9a. One-of-many choices, findings 182, 197 and 198.
//
// Four groups in this product were hand-built out of buttons and ARIA when the
// platform already ships the control. Each rebuild lost a different piece of the
// contract, and no two lost the same piece:
//
//   182: `aria-pressed` on a single-valued choice, so eight independent toggles
//   were announced where there is exactly one answer.
//   197: the right role with no keyboard, so `role="radiogroup"` promised one tab
//   stop and arrow keys, and delivered eight tab stops and arrows that did nothing.
//   198: the right role with a handler that unchecks a radio by pressing it again,
//   which a radio cannot do, plus a duplicated accessible name.
//
// That spread is the argument for the rule below rather than for three fixes. A
// native `<input type="radio">` inside a `.chip` label brings roving tabindex,
// arrow keys, Home and End, RTL-correct arrow direction, and form participation,
// and it cannot drift out of contract because none of it is written here.

/** Every file under src that ships, so this rule is not bounded by the journeys. */
const ALL: { path: string; src: string }[] = (() => {
  const out: { path: string; src: string }[] = [];
  for (const p of walk(join(ROOT, "src"))) {
    if (/\.test\.tsx?$/.test(p)) continue;
    out.push({ path: rel(p), src: code(readFileSync(p, "utf8")) });
  }
  return out;
})();

/** path -> why a hand-built radio group is allowed to stay in that file. */
const HAND_BUILT_RADIO_EXEMPT: Record<string, string> = {};

test("a one-of-many choice uses the platform radio, not a rebuilt one", () => {
  const bad: string[] = [];
  for (const f of ALL) {
    if (HAND_BUILT_RADIO_EXEMPT[f.path]) continue;
    for (const m of f.src.matchAll(/role="(radio|radiogroup)"/g)) {
      bad.push(`${f.path}:${f.src.slice(0, m.index).split("\n").length} ${m[0]}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "findings 197 and 198. `role=\"radiogroup\"` and `role=\"radio\"` are a promise about " +
      "the keyboard: one tab stop for the whole group, arrow keys that move the choice, " +
      "Home and End, and no way to reach the unchecked state again. Every hand-built group " +
      "in this repository broke at least one half of that promise, and the two in " +
      "ListingEnquiry broke it in a way no user could have reported, because the control " +
      "behaved correctly to a mouse and lied to everything else. Write " +
      "`<label className=\"chip\"><input type=\"radio\" name={...} className=\"sronly\" ... />` " +
      "instead: the browser owns the contract, and it reverses the horizontal arrows under " +
      "dir=\"rtl\" without being asked, which is the part a bilingual product is most likely " +
      "to get wrong by hand. If a genuine case needs the ARIA pattern, add the file to " +
      "HAND_BUILT_RADIO_EXEMPT with the keyboard handling it implements.",
  );
});

test("aria-pressed describes a toggle, never a choice among several", () => {
  const bad: string[] = [];
  for (const f of ALL) {
    for (const m of f.src.matchAll(/aria-pressed=\{([^}]*)\}/g)) {
      if (/===|!==/.test(m[1])) bad.push(`${f.path}:${f.src.slice(0, m.index).split("\n").length} ${m[0]}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "finding 182. `aria-pressed={a === b}` is an equality against one value, which means " +
      "the state being described is single-valued, which means the control is not a toggle. " +
      "A toggle asks whether this one thing is on, and the honest expressions for that are a " +
      "boolean of its own or a membership test: `aria-pressed={saved}`, " +
      "`aria-pressed={chips.includes(v)}`. Both shapes are in this repository and both are " +
      "correct. If the answer is one of several, it is a radio group; see the rule above.",
  );
});

test("the four converted groups are native radios bound by a name", () => {
  const want: [string, RegExp, string][] = [
    [
      "src/app/[locale]/post-requirement/RequirementForm.tsx",
      /<input type="radio" name="asset" value=\{a\} checked=\{asset === a\}/,
      "finding 182, the asset type row. The form is a real <form>, so a literal name is " +
        "enough to bind the group and it matches the `name=\"deal\"` radios already in the " +
        "same file.",
    ],
    [
      "src/components/SignupFlow.tsx",
      /<input type="radio" name=\{`\$\{uid\}-\$\{k\}`\}/,
      "finding 197, the single-choice chip rows in signup. Not inside a <form>, so the " +
        "group is the document and a literal name would merge size, timeline, portfolio, " +
        "docs and ticket into one group.",
    ],
    [
      "src/components/ListingEnquiry.tsx",
      /<input type="radio" name=\{`\$\{uid\}-slot`\}/,
      "finding 198, the viewing slot rail.",
    ],
    [
      "src/components/ListingEnquiry.tsx",
      /<input type="radio" name=\{`\$\{uid\}-\$\{q\.k\}`\}/,
      "finding 198, the qualification questions.",
    ],
  ];
  for (const [path, re, why] of want) {
    assert.match(
      file(path),
      re,
      `${path} no longer carries the converted control. ${why} The rule above only proves ` +
        "the ARIA rebuild is gone; a rewrite that dropped the group entirely, or that " +
        "reverted to plain buttons carrying state in a class name, would satisfy it while " +
        "losing the fix.",
    );
  }
});

test("choosing a slot or an answer cannot uncheck it", () => {
  const src = file("src/components/ListingEnquiry.tsx");
  assert.doesNotMatch(
    src,
    /slot === sl\.iso \? null : sl\.iso/,
    "finding 198. This handler unchecked a radio by pressing it again. A radio group has " +
      "no path back to nothing chosen once something is, and the deselect was the half of " +
      "the behaviour the declared role forbade. If an explicit no-preference state is ever " +
      "wanted, it is an option in the group with a written label, not an invisible second " +
      "meaning attached to the option already chosen.",
  );
  assert.doesNotMatch(
    src,
    /p\[q\.k\] === o\.v \? "" : o\.v/,
    "finding 198, the same handler shape on the qualification answers.",
  );
});

test("a chip that holds a radio draws the focus the radio cannot", () => {
  const platform = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
  assert.match(
    platform,
    /\.chip:has\(input:focus-visible\)/,
    "RC9a. The radio inside a .chip is .sronly, which is a one pixel clipped box, so the " +
      "browser draws the focus ring somewhere no one can see it. The label has to draw it " +
      "instead, exactly as `.seg label:has(input:focus-visible)` already does for the " +
      "transaction type control. Without this rule the conversion trades finding 182 for an " +
      "SC 2.4.7 failure, which is not a trade this package is willing to make.",
  );
});

test("the radio probe stays in the repository", () => {
  const p = join(ROOT, "scripts", "radio-probe.mjs");
  const src = readFileSync(p, "utf8");
  assert.match(
    src,
    /hasTouch/,
    "scripts/radio-probe.mjs must keep rendering under a coarse pointer. The 44px SAT floor " +
      "is declared inside `@media (pointer: coarse)`, so a desktop run measures the chips at " +
      "their compact height and reports a pass it did not earn.",
  );
  assert.match(
    src,
    /ArrowRight/,
    "scripts/radio-probe.mjs must keep pressing the horizontal arrows in both directions. " +
      "Direction-correct arrows are the part of the radio contract that cannot be read out " +
      "of the markup, and it is the part every hand-built group in this repository lost. " +
      "Measured: in ltr ArrowRight advances, in rtl it retreats.",
  );
  assert.match(
    src,
    /closest\("label"\)/,
    "scripts/radio-probe.mjs must keep reading the focus ring and the touch target off the " +
      "LABEL. The input is `.sronly`, a one pixel clipped box: measured on the input, both " +
      "checks pass while the user sees no ring and can hit nothing.",
  );
});

// ---------------------------------------------------------------------------
// RC9b, findings 145, 156 and 199: progress and step state.
//
// Two multi-step surfaces reported where a person had reached, and both reported
// it in colour and nothing else. Signup drew three bars, harbor behind, silver
// ahead, with no text at all. The Studio's rail drew twelve chips whose only
// difference was a border and a text colour. In both cases the accessibility
// tree held less than the screen did, and the screen itself held nothing for
// anyone who cannot separate the two colours (SC 1.4.1, SC 1.3.1).
//
// The Studio already solved the same problem correctly one panel above the rail,
// with a "Step 2 of 7" line and an "3 of 9 facts supplied" line. The register
// asked for these to be reconciled rather than separately patched, so the fixes
// adopt that existing phrasing on both surfaces instead of inventing a second
// vocabulary for the same idea.
//
// Finding 199 is the third one, found while fixing 145: advancing a step
// unmounts the button that holds focus, so focus falls to document.body and the
// next Tab restarts at the top of the document (SC 2.4.3). Signup already had
// this repair on its success panel; it did not have it on the two step changes
// that come first.

test("signup states the step in text, not only in the colour of a bar", () => {
  const src = file("src/components/SignupFlow.tsx");
  assert.match(
    src,
    /Step \$\{step \+ 1\} of 3/,
    "finding 145. The count has to be readable text. It is deliberately the same shape as " +
      "the Studio's `Step ${step.index} of ${steps.length}` line, which is the reconciliation " +
      "the register asked for.",
  );
  assert.match(
    src,
    /الخطوة \$\{step \+ 1\} من 3/,
    "finding 145 in Arabic, with Western numerals, which this platform requires in both " +
      "languages.",
  );
  assert.match(
    src,
    /const STEP_NAMES = \[/,
    "finding 145. A count alone says how far, not what of. Each step is named from what it " +
      "actually asks.",
  );
  assert.doesNotMatch(
    src,
    /<h2[^>]*>\{STEP_NAMES/,
    "finding 145. The step name must not be a heading. sat-platform.css:638 sets " +
      "`h2 { font-size: clamp(1.3125rem, 6.6vw, 1.875rem) !important }` under " +
      "`@media (max-width: 600px)`, and an inline style cannot outrank !important, so a " +
      "heading here renders at 21 to 30 pixels on a phone above a 4 pixel bar. The " +
      "instruction is to resolve the interaction properly, not to spend the design on the " +
      "semantics.",
  );
});

test("the three signup bars are decoration once the step is written down", () => {
  const src = file("src/components/SignupFlow.tsx");
  assert.match(
    src,
    /<div className="row gap6" aria-hidden="true"/,
    "finding 145. Three empty spans in the accessibility tree are noise, and once the count " +
      "is text beside them they would be a second announcement of the same fact. They are " +
      "decoration now. This assertion is the pair to the one above: hiding the bars is only " +
      "safe while the text exists, so neither change may be reverted alone.",
  );
});

test("changing a signup step moves focus to the step that opened", () => {
  const src = file("src/components/SignupFlow.tsx");
  assert.match(
    src,
    /stepRef\.current\?\.focus\(\)/,
    "finding 199. setStep unmounts the Continue or Back button that currently holds focus, " +
      "so focus falls to document.body with nothing announced and the next Tab restarts from " +
      "the top of the document. This is the same defect class as the already-fixed success " +
      "panel, one screen earlier.",
  );
  assert.match(
    src,
    /if \(!mounted\.current\) \{ mounted\.current = true; return; \}/,
    "finding 199. The first render must not take focus. Moving focus on mount would drag " +
      "the viewport past the page heading for someone who arrived by ordinary navigation, " +
      "which is a different SC 2.4.3 failure, not a fix for this one.",
  );
  assert.match(
    src,
    /ref=\{stepRef\} tabIndex=\{-1\} role="group" aria-label=/,
    "finding 199. Focus has to land somewhere that says something. A bare focusable div " +
      "announces nothing; the named group announces which step opened and where it sits.",
  );
  assert.doesNotMatch(
    src,
    /outline:\s*(none|0)/,
    "finding 199. A container that takes programmatic focus must not have its focus " +
      "indicator removed (SC 2.4.7).",
  );
});

test("each studio rail step carries its state without colour", () => {
  const src = file("src/components/ListingStudio.tsx");
  assert.match(
    src,
    /\{p && p\.askable > 0 && <span className="ms-1\.5 fig" aria-hidden="true">\{p\.answered\}\/\{p\.askable\}<\/span>\}/,
    "finding 156. Four states were carried by border and text colour alone, and the one " +
      "non-colour marker that existed compiled to nothing (see the text-red note in the " +
      "component). The count separates not started from part done from done with no colour " +
      "at all, and it reuses the phrasing already on screen twice in the same component.",
  );
  assert.match(
    src,
    /p\.state === "blocked" && <span className="ms-1\.5 text-red"/,
    "finding 156. The blocked marker stays. A blocked step can be 4 of 5, so the count " +
      "alone does not separate it from a step that is merely unfinished.",
  );
  assert.match(
    src,
    /\$\{p\.answered\} of \$\{p\.askable\} facts supplied`, `، \$\{p\.answered\} من \$\{p\.askable\} حقيقة مُدخلة/,
    "finding 156. The visible count is aria-hidden because `4/5` read aloud as a fraction " +
      "is not what it means. The screen reader gets the state word and the count in words, " +
      "in the language of the page, with the Arabic comma.",
  );
});

// ---------------------------------------------------------------------------
// RC9c, findings 167 and 200: which control is a navigation and which is a
// dialog trigger.
//
// Finding 167 named two controls that expose no state and proposed a different
// attribute for each, then deferred on the ground that deciding which is which
// is a structural question about the split view. It is, and the structure is
// legible in the stylesheet: above 1080px the map panel is a persistent region
// in the split grid and the toggle is display:none; below it the panel is
// position:fixed over the viewport with a focus trap and Escape, which is a
// modal dialog. So the chip pair is navigation and the toggle is a dialog
// trigger, which means aria-current on the first and aria-haspopup, not
// aria-expanded, on the second.
//
// Finding 200 is what that reading exposed: the dialog semantics were keyed on
// `open` alone, which knows nothing about the viewport, so a map opened narrow
// and then widened kept role="dialog" and aria-modal="true" while being drawn
// inline in the grid.

test("the listings view pair is navigation and says which page you are on", () => {
  const src = file("src/app/[locale]/listings/page.tsx");
  const currents = src.match(/aria-current=\{(!?)insightsView \? "page" : undefined\}/g) || [];
  assert.equal(
    currents.length,
    2,
    "finding 167. Both chips are `Link`s whose href changes the view the server renders, so " +
      "each one is a page and the active one carries `aria-current=\"page\"`. `aria-pressed` " +
      "would describe a toggle button, which these are not.",
  );
  assert.doesNotMatch(
    src,
    /aria-pressed=\{!?insightsView/,
    "finding 167. A link is not a toggle button. If this pair ever becomes buttons the " +
      "navigation goes with them, and that is a decision to record, not a swap to make " +
      "quietly.",
  );
  assert.match(
    src,
    /fontWeight: insightsView \? 700 : undefined/,
    "finding 167, SC 1.4.1. `.chip.on` differs from `.chip` in text colour, background and " +
      "border colour and in nothing else, so the open view was carried by colour alone. The " +
      "weight is the non-colour carrier. It is inline on this pair on purpose: `.chip.on` is " +
      "also the selected face of every native radio drawn after RC9a, and reweighting all of " +
      "them is a cosmetic sweep with no evidence behind it.",
  );
});

test("the map toggle opens a dialog and says so", () => {
  const src = file("src/components/ListingsMap.tsx");
  assert.match(
    src,
    /className="btn primary lst-map-toggle" aria-haspopup="dialog"/,
    "finding 167. The panel this button opens is role=\"dialog\" with aria-modal, a focus " +
      "trap and Escape. `aria-expanded` describes content that expands in place and ARIA " +
      "authoring practice says not to put it on a control that opens a modal, so the " +
      "attribute that matches the behaviour is aria-haspopup=\"dialog\".",
  );
  assert.doesNotMatch(
    src,
    /aria-expanded/,
    "finding 167. Adding aria-expanded here would announce a disclosure contract the control " +
      "does not honour, which is the same mistake findings 182, 197 and 198 were about, in " +
      "the other direction.",
  );
});

test("the map claims to be modal only while the layout actually makes it modal", () => {
  const src = file("src/components/ListingsMap.tsx");
  assert.match(
    src,
    /window\.matchMedia\("\(max-width:1080px\)"\)/,
    "finding 200. The stylesheet turns the panel into a full-screen overlay at max-width " +
      "1080px and leaves it a sticky region above that. The semantics have to read the same " +
      "breakpoint, or they describe a layout that is not on screen.",
  );
  assert.match(
    src,
    /role=\{modal \? "dialog" : "region"\} aria-modal=\{modal \? true : undefined\}/,
    "finding 200. Keyed on `open` alone, a map opened on a phone and then widened past " +
      "1080px was drawn inline in the split grid while still telling a screen reader that " +
      "the rest of the page was inert.",
  );
  assert.match(
    src,
    /if \(!mq\.matches\) setOpen\(false\)/,
    "finding 200. Leaving the overlay layout must close the panel. Otherwise the focus-return " +
      "in the trap effect aims at a toggle the wide layout has set to display:none, and focus " +
      "goes nowhere.",
  );
  assert.match(
    src,
    /if \(!modal\) return;/,
    "finding 200. The focus trap belongs to the overlay, not to the region. Trapping Tab " +
      "inside a panel that sits in the page flow beside the list would make the list " +
      "unreachable.",
  );
});
