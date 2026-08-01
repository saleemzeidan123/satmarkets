import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// ---------------------------------------------------------------------------
// Why this file exists
//
// `tailwind.config.ts` assigns a scalar hex string to eighteen palette names
// under `theme.extend.colors`. In Tailwind a scalar REPLACES the default palette
// object of the same name rather than adding a default to it, so every numeric
// shade of those names stops existing and any class naming one is dropped
// silently at build time. Finding 50 recorded 152 such classes across five
// files: the sample-data banner had no border, no wash and no text colour at
// all, and nobody noticed, because a class that compiles to nothing produces no
// error, no warning and no visible stack trace. The element simply inherits.
//
// PKG-A11Y-1 rewrote all of them to real SAT tokens. This test is the part that
// stops the next one being written. It is deliberately a scan rather than a lint
// rule, because there is no ESLint configuration in this repository and adding
// one to catch a single class of defect is more machinery than the defect is
// worth.
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, "..", "..");

function scalarOverriddenNames(): string[] {
  const config = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");
  const start = config.indexOf("colors: {");
  assert.ok(start > 0, "tailwind.config.ts no longer declares theme.extend.colors");
  const end = config.indexOf("},", start);
  assert.ok(end > start, "could not find the end of the colors block");
  const block = config.slice(start, end);

  const names = new Set<string>();
  // Matches `name: "#hex"` and `"quoted-name": "#hex"`. A name containing a
  // hyphen is a distinct token, not a shade, so `amber-d` is collected as its
  // own name and never treated as a shade of `amber`.
  for (const m of block.matchAll(/(?:"([a-z0-9-]+)"|([a-z][a-z0-9]*))\s*:\s*"(?:#|rgba)/g)) {
    const name = m[1] ?? m[2];
    if (name) names.add(name);
  }
  // Only the base names can shadow a Tailwind default palette. A compound token
  // like `amber-wash` has no Tailwind default to shadow.
  return [...names].filter((n) => !n.includes("-"));
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const UTILITIES = [
  "text",
  "bg",
  "border",
  "ring",
  "from",
  "to",
  "via",
  "fill",
  "stroke",
  "divide",
  "placeholder",
  "shadow",
  "outline",
  "decoration",
  "accent",
].join("|");

test("no source file names a numeric shade of a colour the config overrides with a scalar", () => {
  const names = scalarOverriddenNames();
  assert.ok(names.length > 10, `expected the scalar overrides to still be there, found ${names.length}`);

  const pattern = new RegExp(
    String.raw`(?<![\w-])(?:[a-z-]+:)*(?:${UTILITIES})-(?:${names.join("|")})-\d{2,3}(?![\w-])`,
    "g"
  );

  const offenders: string[] = [];
  for (const file of sourceFiles(join(ROOT, "src"))) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(pattern)) {
      offenders.push(`${file.slice(ROOT.length + 1)}: ${m[0]}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `these classes compile to nothing because the config replaced the palette object with a scalar:\n${offenders.join("\n")}`
  );
});

// ---------------------------------------------------------------------------
// Contrast floors on the tokens PKG-A11Y-1 introduced or moved
// ---------------------------------------------------------------------------

function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const PAPER = "#FFFFFF";
const COOL = "#F6F8FB";
const INK = "#14181B";
const AMBER_WASH = "#FBF3E3";

test("every token that carries text passes 4.5 to 1 on every surface it is used on", () => {
  const cases: Array<{ token: string; hex: string; on: string; surface: string }> = [
    { token: "slate", hex: "#5B6470", on: PAPER, surface: "paper" },
    { token: "slate", hex: "#5B6470", on: COOL, surface: "cool" },
    { token: "ink-2", hex: "#2B3138", on: PAPER, surface: "paper" },
    { token: "amber-d", hex: "#8A5A12", on: PAPER, surface: "paper" },
    { token: "amber-d", hex: "#8A5A12", on: AMBER_WASH, surface: "amber-wash" },
    { token: "red", hex: "#C8412E", on: PAPER, surface: "paper" },
    { token: "green", hex: "#1B7A50", on: PAPER, surface: "paper" },
    { token: "harbor", hex: "#3A6EA5", on: PAPER, surface: "paper" },
    // The dashboard rail. Finding 154 recorded #6B7480 on the ink rail at 3.77
    // to 1; #8A93A0 is the existing `slate-2` token and reaches 5.75 to 1, so
    // the repair reuses a token rather than inventing a colour.
    { token: "slate-2", hex: "#8A93A0", on: INK, surface: "the dashboard rail" },
  ];

  for (const c of cases) {
    const ratio = contrastRatio(c.hex, c.on);
    assert.ok(
      ratio >= 4.5,
      `${c.token} (${c.hex}) on ${c.surface} is ${ratio.toFixed(2)} to 1, below the 4.5 SC 1.4.3 asks of text this size`
    );
  }
});

test("the mark-only amber is still separated from the text-safe amber", () => {
  // `amber` is allowed to stay at 3.64 to 1 because it is a mark and SC 1.4.11
  // asks 3 to 1 of a non-text component. The test exists so that a later change
  // cannot quietly collapse the two into one value in either direction: making
  // `amber` text-safe would darken every bar and icon, and making `amber-d`
  // lighter would reopen findings 166 and 179.
  const mark = contrastRatio("#B7791F", PAPER);
  const textSafe = contrastRatio("#8A5A12", PAPER);
  assert.ok(mark >= 3, `the mark amber is ${mark.toFixed(2)} to 1, below the 3 to 1 SC 1.4.11 asks`);
  assert.ok(mark < 4.5, "the mark amber now passes text contrast, so the two tokens are redundant");
  assert.ok(textSafe >= 4.5, `the text amber is ${textSafe.toFixed(2)} to 1`);
});

test("each status colour keeps a mark value and a readable value, and the readable one passes", () => {
  // Findings 154, 166 and 179. A status colour is asked to do two jobs: it marks
  // (a 7px dot, a 3px rule, a 22px glyph, a swatch) where SC 1.4.11 asks 3 to 1,
  // and it labels, where SC 1.4.3 asks 4.5. One value cannot be both amber enough
  // to read as caution and dark enough to pass under 10.5px text, so PKG-A11Y-1
  // split the pair rather than darkening the mark and repainting the product.
  //
  // The values are read out of the stylesheet, not restated here, so the test
  // fails if somebody edits the token and not the test.
  const css = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
  const token = (name: string): string => {
    const m = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9A-Fa-f]{6})`));
    assert.ok(m, `--${name} is no longer declared as a literal hex in sat-platform.css`);
    return m![1];
  };

  const amber = token("amber");
  const amberD = token("amber-d");
  const stale = token("status-stale");
  const staleText = token("status-stale-text");
  const attentionWash = token("status-attention-wash");
  const staleWash = token("status-stale-wash");

  // The marks. 3 to 1 is the requirement and the whole point of keeping them.
  assert.ok(contrastRatio(amber, PAPER) >= 3, `the amber mark is ${contrastRatio(amber, PAPER).toFixed(2)} to 1 on paper`);
  assert.ok(contrastRatio(stale, PAPER) >= 3, `the stale mark is ${contrastRatio(stale, PAPER).toFixed(2)} to 1 on paper`);

  // The labels. Every surface each one is actually used on.
  const readable: Array<[string, string, string, string]> = [
    ["amber-d", amberD, PAPER, "paper"],
    ["amber-d", amberD, attentionWash, "the attention wash"],
    ["amber-d", amberD, staleWash, "the capped-freeze wash"],
    ["white on the amber-d badge", PAPER, amberD, "the warn badge fill"],
    ["status-stale-text", staleText, PAPER, "paper"],
    ["status-stale-text", staleText, staleWash, "the stale wash"],
  ];
  for (const [name, fg, bg, where] of readable) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= 4.5, `${name} on ${where} is ${ratio.toFixed(2)} to 1`);
  }

  // The split must stay a split. If a later edit makes the mark text-safe the two
  // tokens are redundant and the product should collapse them deliberately, not
  // drift into it.
  assert.ok(contrastRatio(amber, PAPER) < 4.5, "the amber mark now passes text contrast, so --amber-d is redundant");
  assert.ok(contrastRatio(stale, PAPER) < 4.5, "the stale mark now passes text contrast, so --status-stale-text is redundant");

  // Finding 154. The rail section heading is 9.5px uppercase mono on --ink.
  const sec = css.match(/\.dnav \.sec\{[^}]*color:(#[0-9A-Fa-f]{6})/);
  assert.ok(sec, ".dnav .sec no longer declares a literal colour");
  const secRatio = contrastRatio(sec![1], INK);
  assert.ok(secRatio >= 4.5, `the dashboard rail section heading is ${secRatio.toFixed(2)} to 1 on the ink rail`);
});

// The light surfaces `text-charcoal/NN` is placed on anywhere in the product.
// `stone` is the darkest of them and therefore the one the floor is measured on:
// a step that passes on stone passes on all of them.
const LIGHT_SURFACES: Array<[string, string]> = [
  ["paper", PAPER],
  ["cool", COOL],
  ["silver", "#E9EDF1"],
  ["green-wash", "#E7F4ED"],
  ["amber-wash", AMBER_WASH],
  ["stone", "#EDE7DC"],
];

function composite(hex: string, alphaPercent: number, over: string): string {
  const fg = hex.replace("#", "");
  const bg = over.replace("#", "");
  const a = alphaPercent / 100;
  const channel = (i: number) => {
    const f = parseInt(fg.slice(i, i + 2), 16);
    const b = parseInt(bg.slice(i, i + 2), 16);
    return Math.round(f * a + b * (1 - a));
  };
  return `#${[0, 2, 4].map((i) => channel(i).toString(16).padStart(2, "0")).join("")}`;
}

test("every charcoal opacity step used for text passes 4.5 to 1 on every surface it can sit on", () => {
  // Findings 140 and 150. The product had an eleven step `text-charcoal/NN` ramp
  // and the bottom six steps did not pass: /35, /40, /45, /50, /55 and /60
  // composite over paper to 2.22, 2.53, 2.93, 3.38, 3.96 and 4.69 to 1, and /60
  // drops to 4.34 on `stone`. None of the text carrying them is 18.66px or
  // larger, so none of it is large text and the 3 to 1 allowance never applied.
  //
  // PKG-A11Y-1 did not delete the ramp, because the steps above the floor are a
  // real and working hierarchy and removing them would have flattened muted text,
  // secondary text and emphasis into one tone. It raised the failing steps into
  // the passing band while keeping their order: the faint band /35 to /55 became
  // /65, the secondary step /60 became /70. Where two former steps now share a
  // value the distinction is carried by size, weight or case, which it already
  // was in every case checked.
  //
  // This test does not name the surviving steps. It recomputes the composite for
  // whatever steps the source actually contains, so a later change that adds a
  // step is measured rather than compared against a list somebody forgot to
  // update.
  const pattern = /(?<![\w-])text-charcoal\/(\d{1,3})(?![\w-])/g;
  const found = new Set<number>();
  for (const file of sourceFiles(join(ROOT, "src"))) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    for (const m of readFileSync(file, "utf8").matchAll(pattern)) {
      found.add(Number(m[1]));
    }
  }
  assert.ok(found.size > 0, "the charcoal ramp vanished entirely, which this test cannot then guard");

  const failures: string[] = [];
  for (const step of [...found].sort((a, b) => a - b)) {
    for (const [name, surface] of LIGHT_SURFACES) {
      const ratio = contrastRatio(composite(INK, step, surface), surface);
      if (ratio < 4.5) failures.push(`text-charcoal/${step} on ${name} is ${ratio.toFixed(2)} to 1`);
    }
  }
  assert.deepEqual(failures, [], `charcoal text below the contrast floor:\n${failures.join("\n")}`);
});
