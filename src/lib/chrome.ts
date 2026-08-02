/**
 * RC13, finding 147. Which chrome a route gets, and why it gets it.
 *
 * This table used to be two bare regular-expression alternations inside
 * `src/components/ChromeGate.tsx`: a list of route names with a paragraph of
 * prose above it stating the criterion each list was supposed to satisfy, and
 * nothing anywhere connecting the two. That is how `signup` came to sit in the
 * APP list. The prose said APP means "routes that carry their own navigation
 * rail", `/signup` carries no navigation of any kind, and both statements were
 * true at the same time for months because no test could read the prose.
 *
 * The lists are moved here, out of the client component, for one reason: a
 * component that calls `usePathname()` cannot be evaluated by the test runner,
 * so every guard would have had to be written against the file's TEXT. A guard
 * that greps for a route name proves the name is spelled somewhere. A guard that
 * calls `chromeTier("/en/signup")` proves the classification. The second is the
 * one worth having, and it needs the decision to live in a plain module.
 *
 * Each entry now records the reason it is in the tier it is in, and
 * `src/lib/chromeGate.test.ts` holds four things against those reasons: that
 * every listed route is a real folder, that no route is listed twice, that every
 * APP route offers at least one link that leaves it, and that `/signup` and
 * `/login`, which are the two halves of one journey, are classified the same
 * way. A future route can still be put in the wrong tier, but not silently.
 */

export type ChromeTier = "app" | "product" | "marketing";

/**
 * APP: routes that carry their own navigation rail, so both the marketing header
 * and the marketing footer would duplicate navigation the page already has.
 *
 * The bar for entry is higher than "it looks like an application". A route in
 * this tier has no header, no footer and no mobile tab bar, which means whatever
 * it renders itself is the ONLY way off the page for every visitor at every
 * width. A rail that a media query hides on a phone does not clear that bar on
 * its own; the route needs a persistent way out as well, which is why the entries
 * below name where that link is rather than just asserting a rail exists.
 */
export const APP_ROUTES: Record<string, string> = {
  dashboard:
    "The owner shell. `dashboard/layout.tsx` renders the `.dside` nav landmark with eight destinations plus a home link on the brand mark, and the rail becomes a horizontal sticky bar rather than disappearing at phone widths (sat-platform.css:436). Session gated: signed-out visitors are redirected to /login before anything renders.",
  admin:
    "The SAT operations shell, session and role gated. Its pages link out to the listings and account records they are about, so the route is never a dead end.",
  advisor:
    "The assistant carries `.advisor-rail-l` and `.advisor-rail-r`, and the rails are hidden below 820 and 1100 pixels respectively (sat-platform.css:536-537), so the persistent way out is the back-to-home link in `.dtopbar` (advisor/page.tsx:170), which is present at every width.",
  messages:
    "The inbox is a conversation rail beside a thread. Session gated, and every conversation row links to the listing it is about.",
  docs:
    "The document viewer is a full-height sheet rail, a sheet and an info rail, and both rails are hidden on a phone (sat-platform.css:623-624). The persistent way out is the back link in its top bar. It renders its own SampleBanner because everything in it is sample data.",
  agent:
    "Redirects to /advisor and renders nothing. Its tier never reaches a browser; it is listed so that a future page at this path inherits a decision rather than a default.",
  "thinking-map":
    "Redirects to /map and renders nothing. Listed for the same reason as /agent.",
};

/**
 * PRODUCT: routes a signed-in person uses to do work. They carry no navigation
 * of their own, so they keep the header. What they must not have is the
 * marketing footer, which carries the mega sitemap and a "List, lease or invest,
 * on verified ground" sales banner. Selling the product to someone who is
 * already mid-transaction inside it is a hierarchy failure at the page level.
 */
export const PRODUCT_ROUTES: Record<string, string> = {
  deal:
    "The deal room, where a transaction already agreed is being prepared. The header carries the way back to the listing and the account; the footer would put a mega sitemap and a sales banner under a document the reader is in the middle of signing.",
  notifications:
    "An account surface, reached from the bell in the header and from nowhere in marketing. The reader arrived from inside the product and is going back into it, so the header is the whole navigation this page needs.",
  saved:
    "The reader's own shortlist. Every row already links to the listing it stands for, and the reader is comparing things they chose, not being sold the catalogue they chose them from.",
  compare:
    "A side-by-side of spaces the reader has already selected. The comparison is the task; a sitemap beneath it competes with the decision the page exists to support.",
  list:
    "Listing intake. The reader has decided to list and is filling a form, so the footer's invitation to list is an invitation to do the thing they are already doing.",
  invest:
    "Underwriting one asset. The reader is reading figures and their provenance, and the header keeps the route back to the listing without putting a marketing banner under the numbers.",
  find:
    "Requirement-led search, mid-task. Results are the page; the header keeps navigation available and the footer would push the results up under a second, unrelated set of links.",
  "post-requirement":
    "Filing a requirement. Like /list, the reader has already accepted the offer the footer would make them, so repeating it below the form is noise at the moment of highest intent.",
};

/*
 * MARKETING is everything else, and it is deliberately the default rather than a
 * third list. A route nobody has thought about should get the full chrome: a
 * header, a footer and a language switch is the failure mode that costs a
 * visitor nothing, whereas defaulting to APP would strand them on a page with no
 * way off it. `/signup` and `/login` both land here.
 */

/** Route keys are joined into an alternation, so they must be literal. */
const SEGMENT = /^[a-z][a-z-]*$/;

function alternation(routes: Record<string, string>): RegExp {
  const keys = Object.keys(routes);
  for (const k of keys) {
    if (!SEGMENT.test(k)) throw new Error(`chrome tier route "${k}" is not a plain path segment`);
  }
  return new RegExp("\\/(" + keys.join("|") + ")(\\/|$)");
}

export const APP_RE = alternation(APP_ROUTES);
export const PRODUCT_RE = alternation(PRODUCT_ROUTES);

/**
 * The tier for a pathname.
 *
 * Matching is on a whole path segment anywhere in the path, not anchored, which
 * is what makes it locale agnostic: `/en/dashboard` and `/ar/dashboard` are the
 * same route and must get the same chrome. The `(\/|$)` tail is load bearing;
 * without it a future `/listings` would be matched by a `/list` entry.
 */
export function chromeTier(path: string): ChromeTier {
  if (APP_RE.test(path)) return "app";
  if (PRODUCT_RE.test(path)) return "product";
  return "marketing";
}

/**
 * Whether a route renders the footer slot, and therefore the mobile tab bar.
 *
 * PKG-E1-READINESS slice B, WS09. This predicate is exported rather than written
 * inline in `ChromeGate` because two other places in the product reserve SPACE
 * for the tab bar, and until this slice neither of them asked whether the bar
 * was there:
 *
 *   `main.has-tabbar` marks a document that renders the bar, and the rule keyed
 *   on it reserves 62px (globals.css). The class was set unconditionally in
 *   `src/app/[locale]/layout.tsx`, while the bar itself travels inside the
 *   `footer` node that ChromeGate hands only to the marketing tier. So every APP
 *   and PRODUCT route below 1024px ended its document with a reservation beneath
 *   which nothing was ever drawn.
 *
 *   The reservation was also in the wrong place on the routes that do get a bar.
 *   It was `padding-bottom` on `main`, and `main` is not the last element in the
 *   document: `<footer class="foot">` renders after it, so the space protected
 *   the seam between the two and the footer's copyright strip ran on under the
 *   fixed bar. scripts/shell-probe.mjs measured 10px of it beneath the bar at
 *   320, 360, 390 and 430 and 24.5px at 768, in both locales. The reservation is
 *   now handed to the footer through the `--tabbar-reserve` custom property, so
 *   it lands on the element the bar actually covers.
 *
 *   `.advfab` sits at `bottom: calc(82px + safe-area)`, which is the bar's 62px
 *   plus a 20px gap. On the same routes the floating Advisor button therefore
 *   hovered 82px above the bottom edge with empty page behind it.
 *
 * Both numbers were correct arithmetic about a bar that was not on the page.
 * The fix is not to change either number: it is to make all three sites take
 * the decision from one test, so a future route added to `PRODUCT_ROUTES`
 * cannot acquire a reservation for navigation it does not get.
 *
 * The width half of the question stays in CSS, where it belongs. The bar is
 * hidden by `@media(min-width:1024px)` and the padding is zeroed by the same
 * query, so this predicate answers "does this ROUTE get a bar" and the cascade
 * answers "at this WIDTH". `src/lib/chromeGate.test.ts` holds the two breakpoints
 * equal, because a bar hidden at one width and a reservation released at another
 * is either content under a bar or a gap under nothing.
 */
export function rendersFooterSlot(path: string): boolean {
  return chromeTier(path) === "marketing";
}
