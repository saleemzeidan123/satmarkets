// SAT Markets. What may be counted as public inventory, expressed once.
//
// Finding 78. Every public surface that publishes an inventory count queried
// `listings` on `status = 'published'` and nothing else. `is_demo` appeared at
// exactly two sites in `src`, and at both it was one clause of the four-part
// VERIFIED chain rather than a demo exclusion, so no count anywhere excluded a
// simulated row. The counts were correct only because no simulated row happened
// to be published on the day they were read. That is finding 72's defect class:
// a published figure whose integrity rests on the data being clean rather than
// on a rule that keeps it clean.
//
// Two seeders write simulated rows and they marked them differently.
// `scripts/seed-demo.mjs` publishes through the product's own front doors and
// sets `is_demo = true`. `scripts/seed-world.mjs` inserted at
// `status: "published"` and set no flag at all, calling its `SIMW1-` reference
// prefix the sim tag while no query in `src` read that prefix. The seeder is
// corrected to set the flag, so one predicate now covers both and there is a
// single answer to what a simulated row is.
//
// The predicate is `is_demo IS NOT TRUE`, not `is_demo = false`, and the
// difference is not stylistic. The column is nullable and predates the committed
// migrations, so an unflagged row may hold null. Under `= false` every null row
// would drop out and the published count would silently shrink, which is a worse
// failure than the one being fixed: it would understate real inventory instead of
// overstating it. `IS NOT TRUE` reads null and false alike as real inventory, so
// only an explicit flag excludes, which is what the flag means.
//
// D31 rules that the current preview count may be shown because the layout banner
// labels it as sample data on every route and the release policy holds the routes
// at `noindex`. This module is the construction behind that label. It is not a
// substitute for the label and does not license dropping it.

/** A row is simulated only when something explicitly flagged it. */
export const SIMULATED_FLAG = "is_demo";

/**
 * Narrow a PostgREST `listings` query to inventory that may be shown or counted
 * publicly. Applies the demo exclusion only; the caller still states its own
 * `status` predicate, because not every public surface wants `published` alone.
 *
 * Typed as an identity so it composes with a builder mid-chain in the same shape
 * `verifiedOnly` uses on the listings page.
 */
export function realInventoryOnly<T>(q: T): T {
  return (q as any).not(SIMULATED_FLAG, "is", true) as T;
}

/**
 * The comment token that marks a published-listings query as one of the sites
 * permitted to see simulated rows. Assembled rather than written whole so that a
 * scan for it cannot match the constant that defines it.
 */
export const SIMULATED_VISIBLE_MARKER = "simulated" + "-visible";

/**
 * Query sites under `src/app` that read `listings` at `status = 'published'` and
 * are permitted to see simulated rows, each with the reason it is permitted.
 *
 * The gate in `inventory.test.ts` fails on any published-listings site that neither
 * applies `realInventoryOnly` nor carries the marker comment, and it fails on any
 * path listed here that no longer carries one, so the list cannot quietly go stale
 * and cannot quietly grow. Both halves are required: the marker says which query,
 * the entry says why, and neither alone is a decision anyone can review.
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
      "A signed-in account sees the listings it saved itself. Its own simulated saves are still its own, and removing them would read as data loss rather than a correction. The saved-search match counts further down the same page are public inventory counts and do apply the filter.",
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
