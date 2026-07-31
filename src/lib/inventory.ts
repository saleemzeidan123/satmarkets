// SAT Markets. What may be counted as public inventory, expressed once.
//
// Finding 78. Every public surface that publishes an inventory count queried
// `listings` on `status = 'published'` and nothing else. `is_demo` appeared at
// exactly two sites in `src`, and at both it was one clause of the four-part
// VERIFIED chain rather than a demo exclusion, so no count anywhere excluded a
// simulated row. That is finding 72's defect class: a published figure whose
// integrity rests on the data being clean rather than on a rule that keeps it
// clean.
//
// Finding 79 is what the first fix got wrong, and it is the more important half.
// The first version applied the exclusion unconditionally, on the reading in D31
// that no published row carried the flag. That reading was false. The
// record-level audit in `docs/ruling-3-4-closure.md` and finding 3 both say the
// same thing: the `listings` table holds 93 rows, EVERY ONE of them `is_demo`,
// and all 88 published rows are among them. So an unconditional exclusion did
// not remove simulated rows from a real corpus, it removed the entire corpus.
// The live preview went to zero spaces on every surface at once. The record is
// in finding 79 and D31 is corrected.
//
// THE RULE THIS FILE NOW STATES.
//
// Codex boundary 2 gives two branches, not one: a simulated row must be "clearly
// presented as sample data in the private preview OR suppressed". The preview
// banner in `[locale]/layout.tsx` is the first branch and it is already shipped,
// mounted on every route in both languages. So the correct construction is not
// to hide the rows the banner exists to label. It is to make the two the same
// rule, so that simulated inventory is visible exactly when something is telling
// the reader it is simulated, and never when nothing is.
//
// `simulatedRowsAreLabelled()` is that single predicate. The layout imports it to
// decide whether to mount the banner and `releaseVisibleInventory` reads it to
// decide whether to exclude. The banner and the filter can no longer disagree,
// which is what "true by construction" was supposed to mean the first time.
//
// It is read at call time rather than captured at module load so that a test can
// exercise both release states, and so that a running deployment reflects the
// environment it is actually in rather than the one it was built in.
//
// `withoutFlaggedSimulatedRows` remains the unconditional form, for the surfaces
// where no label travels with the figure. The sitemap is the one that exists
// today: a sitemap entry carries no banner into a crawler's index, so it excludes
// simulated rows in every release state. Any future export, feed or
// machine-readable fact file belongs on this one too.
//
// ADV-1C.1 correction 1. That function was called `realInventoryOnly` until this
// package, and the name was a claim its predicate cannot support. Codex: "is_demo
// = false does not establish that a listing is real, authorized, current or
// suitable for a production inventory claim", and "do not infer authenticity from
// the absence of a demo marker". The rename says what the function does, which is
// exclude the rows something explicitly flagged, and nothing more. Codex suggested
// `nonDemoPublishedInventoryOnly`; the name here drops the "published", because
// this helper states no `status` predicate at all, every caller states its own,
// and a name asserting a filter the function does not apply would be the same
// class of defect one word over.
//
// What the old name was reaching for now lives in `src/lib/launchGate.ts`, where
// the five facts Codex asked to be separated are five values rather than one
// reading of a nullable boolean, and production count eligibility is a conclusion
// drawn from all of them.
//
// The predicate is `is_demo IS NOT TRUE`, not `is_demo = false`, and the
// difference is not stylistic. The column is nullable and predates the committed
// migrations, so an unflagged row may hold null. Under `= false` every null row
// would drop out and the published count would silently shrink, which is a worse
// failure than the one being fixed: it would understate real inventory instead of
// overstating it. `IS NOT TRUE` reads null and false alike as real inventory, so
// only an explicit flag excludes, which is what the flag means.

/** A row is simulated only when something explicitly flagged it. */
export const SIMULATED_FLAG = "is_demo";

/**
 * True when this deployment tells every reader, on every route, that what they
 * are looking at is sample data. `[locale]/layout.tsx` imports this to mount the
 * preview notice, so the question "is the banner up" and the question "may a
 * simulated row be shown" have one answer rather than two.
 *
 * The unset default is the preview state, which is the safe direction: an
 * operator who forgets the variable gets the banner AND the sample rows, which is
 * labelled and honest, rather than the sample rows with nothing saying so.
 */
export function simulatedRowsAreLabelled(): boolean {
  return (process.env.SITE_ENV ?? process.env.NEXT_PUBLIC_SITE_ENV) !== "production";
}

/**
 * Narrow a PostgREST `listings` query to inventory this deployment may show a
 * reader. Excludes simulated rows unless the sample-data banner is labelling
 * them. Applies the demo exclusion only; the caller still states its own `status`
 * predicate, because not every public surface wants `published` alone.
 *
 * Typed as an identity so it composes with a builder mid-chain in the same shape
 * `verifiedOnly` uses on the listings page.
 */
export function releaseVisibleInventory<T>(q: T): T {
  return simulatedRowsAreLabelled() ? q : withoutFlaggedSimulatedRows(q);
}

/**
 * The unconditional form, for a surface that publishes a figure with no label
 * attached to it in any release state. The sitemap is the case that exists.
 *
 * This excludes rows something flagged. It does not establish that what remains
 * is real, authorized, current or countable as production inventory: that is
 * `mayCountAsProductionInventory` in `src/lib/launchGate.ts`, and it needs four
 * facts this predicate does not read.
 */
export function withoutFlaggedSimulatedRows<T>(q: T): T {
  return (q as any).not(SIMULATED_FLAG, "is", true) as T;
}

/**
 * The comment token that marks a published-listings query as one of the sites
 * permitted to see simulated rows in every release state. Assembled rather than
 * written whole so that a scan for it cannot match the constant that defines it.
 */
export const SIMULATED_VISIBLE_MARKER = "simulated" + "-visible";

/**
 * Query sites under `src/app` that read `listings` at `status = 'published'` and
 * are permitted to see simulated rows even in production, each with the reason it
 * is permitted. These are not covered by `releaseVisibleInventory`, because their
 * answer does not change when the release state does.
 *
 * The gate in `inventory.test.ts` fails on any published-listings site that
 * applies neither predicate and carries no marker comment, and it fails on any
 * path listed here that no longer carries one, so the list cannot quietly go
 * stale and cannot quietly grow. Both halves are required: the marker says which
 * query, the entry says why, and neither alone is a decision anyone can review.
 */
export const SIMULATED_VISIBLE: readonly { readonly path: string; readonly reason: string }[] = [
  {
    path: "src/app/[locale]/admin/page.tsx",
    reason:
      "The operator console exists to show SAT what is actually in the database, including the simulated rows the preview runs on. Hiding them here would hide the very thing the operator is checking, and this route is behind the admin gate and carries no public count.",
  },
  {
    path: "src/app/[locale]/admin/accounts/page.tsx",
    reason:
      "Reviewing an account means seeing every listing behind it, simulated included, because the per-account figure on this screen is an operator's working total rather than a market claim. Admin gated, no indexed surface.",
  },
  {
    path: "src/app/[locale]/me/page.tsx",
    reason:
      "A signed-in account sees the listings it saved itself. Its own simulated saves are still its own, and removing them would read as data loss rather than a correction. The saved-search match counts further down the same page are public inventory counts and do apply the release filter.",
  },
  {
    path: "src/app/api/saved/route.ts",
    reason:
      "The route behind that shortlist, hydrating ids the user already holds. Same contract and same reason: it returns what was saved, and it aggregates nothing.",
  },
  {
    path: "src/app/api/report/route.ts",
    reason:
      "Anything a reader can see in the preview they must be able to report, and a simulated listing shown to them is exactly the kind of row a reader would report. An existence check on a single id, never a count.",
  },
  {
    path: "src/app/api/requirements/[id]/interest/route.ts",
    reason:
      "An ownership check that a lister may attach only their own published listing to a response. Their own simulated listing is still theirs, and the query reads one id rather than counting inventory.",
  },
];
