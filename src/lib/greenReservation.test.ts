import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Green-exclusivity regression gate (PKG-1B.1, Codex correction 1). Confirmed green
// (#1B7A50 / var(--green) / var(--verified)) is reserved for evidence-backed
// verification, with two enumerated exceptions: a timestamp-backed CONFIRMED
// AVAILABILITY state, and the WhatsApp third-party brand fill. The pale accents
// (--green-wash, --green-line, --verified-wash) and the semantic token layer
// (var(--status-verified)) are not the reserved saturated green and are not scanned.
// Any confirmed-green use in a file NOT enumerated below is a regression: reclassify
// it (new/informational -> Harbor, generic completion -> Harbor Deep, comparative ->
// dv-quote-below, warning/stale -> amber, destructive -> red).

// Path -> reason. Every listed file may hold confirmed green ONLY for the stated
// evidence-backed reason. Files not listed must contain none.
const ALLOW: Record<string, string> = {
  "src/lib/releaseState.ts": "token definition: the verified release-state tone",
  "src/components/MarketingHome.tsx": "verification: verified-owner badge",
  "src/components/SignupActions.tsx": "verification: approve-to-verified action",
  "src/components/FilterBar.tsx": "verification: verified-owners filter",
  "src/app/[locale]/proto/page.tsx": "verification: design-system verified swatches",
  "src/app/[locale]/lister/[id]/page.tsx": "verification: verified lister",
  "src/app/[locale]/compare/page.tsx": "verification: owner-verified row",
  "src/app/[locale]/verify/signups/page.tsx": "verification: verified signup status",
  "src/app/[locale]/verify/page.tsx": "verification: verified-dimension Yes",
  "src/app/[locale]/listings/[id]/page.tsx": "verification (verified owner) + availability-confirmed (availability_confirmed_at)",
  "src/app/[locale]/listings/[id]/flyer/page.tsx": "verification: verified-owner tag",
  "src/app/[locale]/listings/page.tsx": "availability-confirmed (availability_confirmed_at)",
  "src/components/ListingCard.tsx": "verification: passesGate() verified-listing tick (SVG stroke, literal because var() does not resolve in a presentation attribute)",
  "src/components/ContactBar.tsx": "third-party brand: WhatsApp fill",
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
const GREEN = /#1b7a50\b|var\(--green\)|var\(--verified\)/i;

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\.ts$/.test(name)) yield p;
  }
}

test("confirmed green appears only in enumerated verification/availability/brand files", () => {
  const offenders: string[] = [];
  for (const f of files("src")) {
    const rel = f.replace(/\\/g, "/");
    if (rel === "src/styles" ) continue;
    const body = readFileSync(f, "utf8");
    const lines = body.split("\n");
    lines.forEach((ln, i) => {
      if (GREEN.test(ln)) {
        if (!(rel in ALLOW)) offenders.push(`${rel}:${i + 1}  ${ln.trim().slice(0, 80)}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `Confirmed green outside the reserved allowlist:\n${offenders.join("\n")}`);
});

test("the off-palette teal is not used as a status or verification colour", () => {
  const offenders: string[] = [];
  for (const f of files("src")) {
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
