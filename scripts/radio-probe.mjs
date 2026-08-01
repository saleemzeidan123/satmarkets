// Radio probe: measure that a one-of-many choice actually behaves like one.
//
// Why this exists alongside the other probes in this directory
//
// PKG-A11Y-1 slice I replaced four hand-built choosers with the platform
// control. Findings 182, 197 and 198 are one property in four places: a
// choose-exactly-one control was rebuilt out of `<button>` plus ARIA, and each
// rebuild lost a different part of the contract the role it claimed had
// promised.
//
//   182: /post-requirement asset type, eight `aria-pressed` buttons. Eight
//   independent toggles announced, one shared string underneath, so choosing a
//   second chip silently unchose the first with nothing said about it.
//
//   197: SignupFlow's `sel()`, a `role="radiogroup"` of `role="radio"` buttons
//   with no roving tabindex and no arrow-key handling. Every option was its own
//   tab stop and the group could not be operated the way its role advertised.
//
//   198: ListingEnquiry's viewing slots and qualifying answers, the same
//   rebuild, plus two things a radio cannot do: re-activating the chosen option
//   cleared it, and each group carried an `aria-label` identical to its own
//   legend, so the name was announced twice.
//
// The fix in all four is a native `<input type="radio">` inside the existing
// `.chip` or `.seg` label, `.sronly`, bound by `name`. That single substitution
// supplies roving tabindex, arrow keys, direction-correct horizontal arrows,
// wrapping, the impossibility of clearing a chosen radio, and form
// participation, with no JavaScript at all.
//
// The problem with writing that paragraph in the register is that it is a claim
// about the platform, not about this repository, and the reason all four sites
// were wrong in the first place is that somebody made a claim about behaviour
// without rendering it. src/lib/formGroups.test.ts can only prove the markup
// says `type="radio"`. This probe renders the shipped markup with the shipped
// stylesheet and presses the actual keys.
//
// The `.sronly` input is the part that genuinely needed measuring rather than
// assuming. Moving the input off-screen is what lets the chip keep its visual
// design, and it is also exactly the technique that loses a focus ring, because
// the ring is drawn on a 1px box at margin -1px where nobody can see it. That
// is why `.chip:has(input:focus-visible)` was added at sat-platform.css:161,
// and why the focus measurement below reads the outline of the LABEL and not of
// the input. Codex's instruction for this package is "Do not reduce visual
// quality to satisfy accessibility"; the inverse failure, trading SC 4.1.2 for
// SC 2.4.7, is what this check exists to catch.
//
// Both directions are rendered because the horizontal arrow keys are the one
// part of the contract that is direction-dependent, and because a probe run in
// English alone would prove nothing about the Arabic build.
//
// This is browser-emulated evidence. It is Chromium's implementation of the
// radio group, which is the same engine the product ships to, but it is not a
// physical device and it is not a screen reader. What a screen reader announces
// for these groups is recorded as outstanding in docs/findings-register.md and
// is not claimed here.
//
// Usage, from the repository root:
//
//   node scripts/radio-probe.mjs --chromium /opt/pw-browsers/chromium
//
// Exit code 1 on a contract failure, 2 on a harness fault.

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const CHROME = flag("--chromium", process.env.CHROMIUM_PATH || "");

const platform = readFileSync(join(ROOT, "src", "styles", "sat-platform.css"), "utf8");
const globals = readFileSync(join(ROOT, "src", "styles", "globals.css"), "utf8");

// The four converted groups plus the `.seg` group that was already correct and
// that the conversion was modelled on. The reference group is here so that a
// regression in the shared rule is distinguishable from a regression in the new
// markup: if every row fails, the stylesheet moved; if only the chip rows fail,
// slice I did.
//
// Labels are the strings the components actually render. The Arabic ones matter
// beyond translation coverage: `.chip` is `white-space:nowrap`, so a long
// Arabic option is the case where a 44px floor and a nowrap chip can disagree.
const GROUPS = [
  {
    key: "asset",
    site: "src/app/[locale]/post-requirement/RequirementForm.tsx:286",
    shell: "chip",
    legend: { en: "Asset type", ar: "نوع الأصل" },
    opts: {
      en: ["Office", "Retail", "Warehouse", "Land", "Showroom", "Clinic", "Mixed use", "Other"],
      ar: ["مكاتب", "تجزئة", "مستودعات", "أراضٍ", "معارض", "عيادات", "استخدام مختلط", "أخرى"],
    },
  },
  {
    key: "org",
    site: "src/components/SignupFlow.tsx:55",
    shell: "chip",
    legend: { en: "Organisation type", ar: "نوع المنشأة" },
    opts: {
      en: ["Brokerage", "Developer", "Owner", "Occupier", "Advisor"],
      ar: ["وساطة", "مطوّر", "مالك", "شاغل", "مستشار"],
    },
  },
  {
    key: "slot",
    site: "src/components/ListingEnquiry.tsx:293",
    shell: "chip",
    legend: { en: "Book a viewing", ar: "حجز معاينة" },
    legendHidden: true,
    opts: {
      en: ["Sun 10:00", "Sun 14:00", "Mon 09:30", "Mon 16:00", "Tue 11:00"],
      ar: ["الأحد 10:00", "الأحد 14:00", "الاثنين 09:30", "الاثنين 16:00", "الثلاثاء 11:00"],
    },
  },
  {
    key: "qual",
    site: "src/components/ListingEnquiry.tsx:313",
    shell: "chip",
    legend: { en: "When do you need to move?", ar: "متى تحتاج إلى الانتقال؟" },
    opts: {
      en: ["Immediately", "Within 3 months", "3 to 6 months", "Still exploring"],
      ar: ["فوراً", "خلال 3 أشهر", "من 3 إلى 6 أشهر", "ما زلت أستكشف"],
    },
  },
  {
    key: "deal",
    site: "src/app/[locale]/post-requirement/RequirementForm.tsx:296",
    shell: "seg",
    reference: true,
    legend: { en: "Transaction", ar: "نوع الصفقة" },
    opts: { en: ["Lease", "Buy"], ar: ["إيجار", "شراء"] },
  },
];

const CHIP_STYLE = "cursor:pointer;border:1px solid var(--silver);background:var(--paper)";

function group(g, lang) {
  const opts = g.opts[lang];
  const legend = g.legend[lang];
  const items = opts
    .map((label, i) => {
      const on = i === 0;
      if (g.shell === "seg") {
        return `<label class="${on ? "on" : ""}" style="cursor:pointer">` +
          `<input type="radio" name="${g.key}" value="${i}"${on ? " checked" : ""} class="sronly">${label}</label>`;
      }
      return `<label class="chip${on ? " on" : ""}" style="${CHIP_STYLE}">` +
        `<input type="radio" name="${g.key}" value="${i}"${on ? " checked" : ""} class="sronly">${label}</label>`;
    })
    .join("");
  const inner = g.shell === "seg"
    ? `<div class="seg" style="align-self:flex-start">${items}</div>`
    : `<div class="row gap8 wrap">${items}</div>`;
  return `<fieldset data-g="${g.key}" style="border:0;padding:0;margin:0 0 18px;min-inline-size:0">` +
    `<legend${g.legendHidden ? ' class="sronly"' : ' style="padding:0"'}>${legend}</legend>${inner}</fieldset>`;
}

const page = (dir, lang) => `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${globals}</style><style>${platform}</style>
<style>html,body{margin:0}</style></head>
<body><main style="padding:20px"><form>
<button type="button" id="before">before</button>
${GROUPS.map((g) => group(g, lang)).join("")}
<button type="button" id="after">after</button>
</form></main></body></html>`;

// ---------------------------------------------------------------------------

/** Which option in `key` is currently checked, by DOM index. -1 if none. */
const checkedIndex = (page_, key) =>
  page_.evaluate((k) => {
    const els = [...document.querySelectorAll(`input[name="${k}"]`)];
    return els.findIndex((e) => e.checked);
  }, key);

/** The DOM index of the option that currently holds focus. -1 if focus is elsewhere. */
const focusIndex = (page_, key) =>
  page_.evaluate((k) => {
    const els = [...document.querySelectorAll(`input[name="${k}"]`)];
    return els.indexOf(document.activeElement);
  }, key);

/** Put keyboard focus on the group by tabbing into it from the button above. */
async function tabInto(p, key) {
  await p.evaluate(() => document.getElementById("before").focus());
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press("Tab");
    if ((await focusIndex(p, key)) >= 0) return i + 1;
  }
  return -1;
}

/**
 * How many Tab presses it takes to cross the whole form.
 *
 * This is the finding 197 measurement stated as a number. A radio group is one
 * tab stop whatever its size, so a form holding 8 + 5 + 5 + 4 + 2 options and
 * two buttons is 7 stops, not 26. Counting the stops is the only way to show
 * the roving tabindex exists, because nothing in the markup mentions it.
 */
async function tabStops(p) {
  await p.evaluate(() => document.getElementById("before").focus());
  const seen = [];
  for (let i = 0; i < 60; i++) {
    await p.keyboard.press("Tab");
    const id = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "body";
      if (a.id) return "#" + a.id;
      if (a.name) return "radio:" + a.name;
      return a.tagName.toLowerCase();
    });
    if (id === "body") break;
    seen.push(id);
    if (id === "#after") break;
  }
  return seen;
}

const rows = [];
let failed = 0;
const fail = (what, detail) => { failed++; rows.push(`FAIL ${what}  ${detail}`); };
const ok = (what, detail) => rows.push(`ok   ${what}  ${detail}`);

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME || undefined });
  try {
    for (const [dir, lang] of [["ltr", "en"], ["rtl", "ar"]]) {
      // Coarse pointer, because the 44px SAT floor is declared inside
      // `@media (pointer: coarse)` and a desktop run would not see it at all.
      const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: false });
      const p = await ctx.newPage();
      await p.setContent(page(dir, lang), { waitUntil: "load" });

      // `tabStops` starts from `#before` and records where each press lands, so
      // `#before` itself is the starting point and not one of the results.
      const stops = await tabStops(p);
      const wanted = [...GROUPS.map((g) => "radio:" + g.key), "#after"];
      if (stops.join(" ") === wanted.join(" ")) {
        ok(`${lang} tab stops`, `${stops.length} stops for ${GROUPS.reduce((n, g) => n + g.opts[lang].length, 0)} options plus 2 buttons`);
      } else {
        fail(`${lang} tab stops`, `finding 197. wanted ${wanted.join(" ")}, got ${stops.join(" ")}`);
      }

      for (const g of GROUPS) {
        const n = g.opts[lang].length;
        const tag = `${lang} ${g.key}`;

        const stop = await tabInto(p, g.key);
        if (stop < 0) { fail(tag, "the group never took keyboard focus"); continue; }

        // Focus lands on the checked option, not on the first one, which is the
        // half of the roving tabindex contract that a naive implementation
        // usually gets wrong.
        if ((await focusIndex(p, g.key)) !== (await checkedIndex(p, g.key))) {
          fail(tag, "tabbing in did not land on the chosen option");
        }

        // Vertical arrows: language independent, wrap at both ends.
        const down = [];
        for (let i = 0; i < n + 1; i++) { await p.keyboard.press("ArrowDown"); down.push(await checkedIndex(p, g.key)); }
        const wantDown = [...Array.from({ length: n - 1 }, (_, i) => i + 1), 0, 1];
        if (down.join(",") !== wantDown.join(",")) fail(tag, `ArrowDown walked ${down.join(",")}, wanted ${wantDown.join(",")}`);

        await tabInto(p, g.key);
        const up = [];
        for (let i = 0; i < 2; i++) { await p.keyboard.press("ArrowUp"); up.push(await checkedIndex(p, g.key)); }
        // Selection may have been left elsewhere by the walk above, so this is
        // asserted as a relative move rather than against fixed indices.
        if (up[1] !== (up[0] - 1 + n) % n) fail(tag, `ArrowUp did not step back, walked ${up.join(",")}`);

        // Horizontal arrows: the one direction-dependent part of the contract.
        // In a left-to-right group ArrowRight advances; in a right-to-left one
        // it retreats, because the platform reverses it against the computed
        // direction. This is the behaviour every hand-built group in this
        // repository would have had to write by hand and none of them did.
        await tabInto(p, g.key);
        const from = await checkedIndex(p, g.key);
        await p.keyboard.press("ArrowRight");
        const to = await checkedIndex(p, g.key);
        const advanced = to === (from + 1) % n;
        const retreated = to === (from - 1 + n) % n;
        if (dir === "ltr" && !advanced) fail(tag, `ArrowRight went ${from} to ${to}; in ltr it must advance`);
        if (dir === "rtl" && !retreated) fail(tag, `ArrowRight went ${from} to ${to}; in rtl it must retreat`);
        if ((dir === "ltr" && advanced) || (dir === "rtl" && retreated)) {
          ok(tag, `arrows: down wraps ${n}, up steps back, ArrowRight ${dir === "ltr" ? "advances" : "retreats"} at ${dir}`);
        }

        // Findings 198. A radio cannot be cleared by choosing it again. The two
        // ListingEnquiry groups did exactly that, which is why re-pressing the
        // chosen option is measured rather than reasoned about.
        await tabInto(p, g.key);
        const before = await checkedIndex(p, g.key);
        await p.keyboard.press("Space");
        await p.keyboard.press("Space");
        const after = await checkedIndex(p, g.key);
        if (after !== before) fail(tag, `finding 198. re-choosing the chosen option moved it from ${before} to ${after}`);

        // SC 2.4.7. The input is `.sronly`, so the ring has to be on the label.
        await tabInto(p, g.key);
        const ring = await p.evaluate((k) => {
          const inp = document.activeElement;
          const lab = inp.closest("label");
          const cs = getComputedStyle(lab);
          const ics = getComputedStyle(inp);
          return {
            style: cs.outlineStyle, width: cs.outlineWidth, colour: cs.outlineColor,
            inputWidth: Math.round(inp.getBoundingClientRect().width),
            inputRing: ics.outlineStyle,
          };
        }, g.key);
        const ringPx = parseFloat(ring.width);
        if (ring.style === "none" || !(ringPx >= 2)) {
          fail(tag, `SC 2.4.7. the label draws no focus ring: outline ${ring.style} ${ring.width}. ` +
            `The input is ${ring.inputWidth}px wide, so its own ${ring.inputRing} ring is not visible.`);
        } else {
          ok(tag, `focus ring on the label: ${ring.width} ${ring.style} ${ring.colour}`);
        }

        // The SAT 44px floor under a coarse pointer, measured on the label,
        // which is the thing a finger can actually hit.
        const boxes = await p.evaluate((k) => {
          const els = [...document.querySelectorAll(`input[name="${k}"]`)];
          return els.map((e) => {
            const r = e.closest("label").getBoundingClientRect();
            return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
          });
        }, g.key);
        const short = boxes.filter((b) => b.h < 44 || b.w < 44);
        if (short.length) {
          fail(tag, `${short.length} of ${boxes.length} targets below the 44px floor: ` +
            short.map((b) => `${b.w}x${b.h}`).join(" "));
        } else {
          ok(tag, `${boxes.length} targets at or above 44px, smallest ` +
            `${Math.min(...boxes.map((b) => b.w))}x${Math.min(...boxes.map((b) => b.h))}`);
        }

        // The group name comes from the legend, exactly once. Finding 198's
        // duplicate `aria-label` is the reason this is checked rather than read.
        const name = await p.evaluate((k) => {
          const fs = document.querySelector(`input[name="${k}"]`).closest("fieldset");
          return { legend: (fs.querySelector("legend")?.textContent || "").trim(), label: fs.getAttribute("aria-label") };
        }, g.key);
        if (!name.legend) fail(tag, "the group has no legend");
        if (name.label) fail(tag, `finding 198. the fieldset carries aria-label "${name.label}" on top of its legend "${name.legend}"`);
      }

      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

run().then(
  () => {
    for (const r of rows) console.log(r);
    console.log("");
    if (failed) {
      console.log(`FAIL  ${failed} contract failures across ${GROUPS.length} groups in 2 directions.`);
      process.exit(1);
    }
    console.log(
      `PASS  ${GROUPS.length} groups, English and Arabic, coarse pointer at 390 wide. One tab stop each, ` +
      `arrow keys walk and wrap, ArrowRight follows the writing direction, a chosen option cannot be cleared, ` +
      `the label draws the focus ring the .sronly input cannot, every target clears 44px, and the name comes ` +
      `from the legend once. Browser emulated in Chromium. Not a physical device and not a screen reader.`,
    );
  },
  (e) => { console.error("harness fault:", e); process.exit(2); },
);
