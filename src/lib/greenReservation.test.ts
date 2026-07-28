import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Green-exclusivity regression gate (PKG-1B.1 correction 1, widened in PKG-1B.2 for
// Codex item 7). Confirmed green (#1B7A50 / var(--green) / var(--verified) / the
// Tailwind `green` alias) is reserved for evidence-backed verification, with three
// enumerated exceptions: a timestamp-backed CONFIRMED AVAILABILITY state, the held
// FAL licence credential, and the WhatsApp third-party brand fill. The pale accents
// (--green-wash, --green-line, --verified-wash) and the semantic token layer
// (var(--status-verified)) are not the reserved saturated green and are not scanned.
//
// The first version of this gate scanned .ts and .tsx ONLY, so roughly a dozen green
// rules in the stylesheets were invisible to it, and every one of them turned out to
// mean something other than verification: a Rent Index sufficiency dot, the
// list-your-space step, the deal stepper, pricing ticks, a pricing matrix, an
// area-intelligence delta and a decorative map pin. Those are reclassified by meaning
// in the same package; the gate now reads stylesheets and the Tailwind colour aliases
// so the reservation cannot be re-broken there.
//
// It is also no longer enough to name a FILE. An allowlisted file could quietly reuse
// green for an unrelated meaning inside itself, which is exactly the failure the
// reservation exists to prevent. Every allowlisted file therefore also carries the
// CONTEXT its green must appear in, and each green line is checked against it.

type Allow = {
  /** Why this file may hold confirmed green at all. */
  reason: string;
  /** Every confirmed-green line in this file must match this within CONTEXT_LINES. */
  context: RegExp;
};

/** How far above/below a green line the meaning evidence may sit. */
const CONTEXT_LINES = 3;

const VERIFICATION = /verif|موثّق/i;
const AVAILABILITY = /verif|availab|av\.state|"fresh"|"aging"|"stale"/i;

const ALLOW: Record<string, Allow> = {
  "src/lib/releaseState.ts": { reason: "token definition: the verified release-state tone", context: VERIFICATION },
  // ADV-1 added the one component whose job is to decide what a record has earned,
  // and removed MarketingHome from this list: its remaining chips are drawn by
  // satkit's .verified class, and the suggestion chip that used to be green now says
  // "in the index", which is a record we hold and not a check anyone ran (D24).
  "src/components/VerificationState.tsx": { reason: "verification: the resolved dimension list", context: VERIFICATION },
  "src/components/SignupActions.tsx": { reason: "verification: approve-to-verified action", context: VERIFICATION },
  "src/components/FilterBar.tsx": { reason: "verification: verified-owners filter", context: VERIFICATION },
  "src/app/[locale]/proto/page.tsx": { reason: "verification: design-system verified swatches", context: VERIFICATION },
  "src/app/[locale]/lister/[id]/page.tsx": { reason: "verification: verified lister", context: VERIFICATION },
  "src/app/[locale]/compare/page.tsx": { reason: "verification: owner-verified row", context: VERIFICATION },
  "src/app/[locale]/verify/signups/page.tsx": { reason: "verification: verified signup status", context: VERIFICATION },
  "src/app/[locale]/verify/page.tsx": { reason: "verification: verified-dimension Yes", context: VERIFICATION },
  "src/app/[locale]/listings/[id]/page.tsx": { reason: "verification (verified owner) + availability-confirmed (availability_confirmed_at)", context: AVAILABILITY },
  "src/app/[locale]/listings/[id]/flyer/page.tsx": { reason: "verification: verified-owner tag", context: VERIFICATION },
  "src/app/[locale]/listings/page.tsx": { reason: "availability-confirmed (availability_confirmed_at)", context: AVAILABILITY },
  // ADV-1 (C). This read "passesGate() verified-listing tick" until the card stopped
  // asking the publish gate whether a record was verified. The gate answers a different
  // question, and two of its four legs answer PASS when nobody has looked.
  "src/components/ListingCard.tsx": { reason: "verification: the resolved badge tick (SVG stroke, literal because var() does not resolve in a presentation attribute)", context: VERIFICATION },
  "src/components/ContactBar.tsx": { reason: "third-party brand: WhatsApp fill", context: /whatsapp|wa_fill|wa_hover/i },
  "src/styles/sat-platform.css": { reason: "token definitions + the .verified badge (evidence-backed verification)", context: /verif|confirmed-status/i },
  "src/styles/footer.css": { reason: "verification: the FAL 1200025510 licence credential pill", context: /licence|license|tpill|fal 1200025510/i },
  "tailwind.config.ts": { reason: "token definition: the Tailwind alias for confirmed green", context: /green-wash|green-line/i },
};

// The allowlist above is ONE-DIRECTIONAL: it catches confirmed green used where it
// does not belong, but it could not catch the opposite failure, which is what actually
// happened on ListingCard: an evidence-backed verification tick rendered in an
// off-palette teal, so the strongest signal on the most-viewed component read as a
// decorative accent AND the reserved green was silently absent. D24 settled that teal
// is not the positive-outcome colour, so the durable gate is to ban the hue outright
// outside the ONE place it is a legitimate categorical hue: the retail asset-type
// swatch in the centralized palette (permitted by D18/D23 as a justified chart colour).
const TEAL = /#0e9488\b/i;
const TEAL_ALLOW = new Set(["src/theme/palette.ts"]);

// Reserved saturated green, but NOT the pale washes/lines and NOT var(--status-*).
// The last alternative covers the Tailwind utilities generated from the `green` alias
// (text-green, bg-green, border-green, stroke-green, ...) while leaving -green-wash
// and -green-line alone.
const GREEN = /#1b7a50\b|var\(--green\)|var\(--verified\)|\b(?:text|bg|border|stroke|fill|ring|from|via|to|decoration|outline|accent|caret|divide|shadow)-green(?![-\w])/i;

/** Every source that can carry a colour: logic, markup, stylesheets, palette config. */
function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|ts|css)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

function* scanned(): Generator<string> {
  yield* files("src");
  yield "tailwind.config.ts";
}

function greenLines(body: string): number[] {
  const out: number[] = [];
  body.split("\n").forEach((ln, i) => { if (GREEN.test(ln)) out.push(i); });
  return out;
}

test("confirmed green appears only in enumerated verification/availability/brand files", () => {
  const offenders: string[] = [];
  for (const f of scanned()) {
    const rel = f.replace(/\\/g, "/");
    if (rel in ALLOW) continue;
    const lines = readFileSync(f, "utf8").split("\n");
    for (const i of greenLines(lines.join("\n"))) {
      offenders.push(`${rel}:${i + 1}  ${lines[i].trim().slice(0, 90)}`);
    }
  }
  assert.deepEqual(offenders, [], `Confirmed green outside the reserved allowlist:\n${offenders.join("\n")}`);
});

test("an allowlisted file may use confirmed green only for its enumerated meaning", () => {
  const offenders: string[] = [];
  for (const [rel, allow] of Object.entries(ALLOW)) {
    let lines: string[];
    try { lines = readFileSync(rel, "utf8").split("\n"); } catch { continue; }
    for (const i of greenLines(lines.join("\n"))) {
      const window = lines.slice(Math.max(0, i - CONTEXT_LINES), i + CONTEXT_LINES + 1).join("\n");
      if (!allow.context.test(window)) {
        offenders.push(`${rel}:${i + 1} is confirmed green with no ${allow.reason} evidence nearby\n    ${lines[i].trim().slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `Confirmed green reused for an unrelated meaning inside an allowlisted file:\n${offenders.join("\n")}`);
});

test("the off-palette teal is not used as a status or verification colour", () => {
  const offenders: string[] = [];
  for (const f of scanned()) {
    const rel = f.replace(/\\/g, "/");
    if (TEAL_ALLOW.has(rel)) continue;
    readFileSync(f, "utf8").split("\n").forEach((ln, i) => {
      if (TEAL.test(ln)) offenders.push(`${rel}:${i + 1}  ${ln.trim().slice(0, 80)}`);
    });
  }
  assert.deepEqual(offenders, [], `Off-palette teal outside the categorical palette:\n${offenders.join("\n")}`);
});

test("the allowlist is not stale: every enumerated file still uses confirmed green", () => {
  const stale: string[] = [];
  for (const rel of Object.keys(ALLOW)) {
    let body = "";
    try { body = readFileSync(rel, "utf8"); } catch { stale.push(`${rel} (missing)`); continue; }
    if (!GREEN.test(body)) stale.push(`${rel} (no confirmed green left; remove from allowlist)`);
  }
  assert.deepEqual(stale, [], `Stale green allowlist entries:\n${stale.join("\n")}`);
});
