# Route and state map (WS03)

Canonical inventory of every route surface and its search state. Sitemap, robots,
middleware, navigation and metadata must agree with this table; a change to any of
them updates this file in the same commit.

## Environment rule

The entire site is noindexed until `ALLOW_INDEX=true` (middleware X-Robots-Tag).
Canonical host comes from `src/lib/site.ts`: explicit `NEXT_PUBLIC_SITE_URL`, else
the Vercel production host, else the deployment host. satmarkets.sa enters only
after acquisition (gate 21/22).

## States

- **public-indexable-later**: in sitemap; indexable once ALLOW_INDEX and launch gates pass.
- **noindex-private**: in middleware PRIVATE_PREFIXES; never in sitemap. Auth per page.
- **noindex-public**: publicly reachable but held out of sitemap/index deliberately.
- **alias**: redirect only; never in sitemap or navigation.

| Route | State | Auth | Notes |
| --- | --- | --- | --- |
| / | public-indexable-later | none | |
| /listings, /listings/[id] | public-indexable-later | none | Detail pages enter sitemap only when ALLOW_INDEX (sample-data guard). |
| /listings/[id]/flyer | noindex-public | none | Canonicalize to detail (WS12). |
| /map, /rent-index, /advisor, /requirements, /locations, /market, /brokers | public-indexable-later | none | In `SITEMAP_ROUTES` (lib/routePolicy.ts). |
| /area, /pricing, /neutrality, /about | noindex-public (HELD) | none | In `HELD_ROUTES` (lib/routePolicy.ts): excluded from the sitemap AND noindexed by the middleware even when ALLOW_INDEX is on, until each route's audit gate clears (/area entity route, /pricing offer decision O1, /neutrality legal review O2, /about claim C8). |
| /building/[id], /lister/[id], /requirements/[id] | public-indexable-later | none | Detail sitemap entries gated on ALLOW_INDEX. |
| /login, /signup | noindex-private | none | Both in `PRIVATE_PREFIXES`. /login was linked from the public header while appearing in none of the three lists (PKG-1C.1); an authentication surface has nothing to index. |
| /hbu | noindex-private | none | In `PRIVATE_PREFIXES` (PKG-1C.1). A highest-and-best-use demonstration whose every figure and every comparable is simulated. Private until the page is driven by real evidence; the global preview banner alone was not a sufficient qualification for named comparables. |
| /dashboard/** | noindex-private | account session | |
| /me, /saved, /messages, /notifications | noindex-private | user session | |
| /deal, /deal/termsheet, /docs, /find, /invest, /post-requirement, /list, /compare | noindex-private | varies | Prototype and workspace surfaces. |
| /admin/** | noindex-private | SAT session | |
| /verify, /verify/signups, /verify/viewings | noindex-private | SAT session (404 otherwise) | Added to PRIVATE_PREFIXES in PKG-0A; robots.txt also disallows. |
| /ops, /proto | noindex-private | internal | Added to PRIVATE_PREFIXES in PKG-0A. |
| /go | noindex-private (alias) | none | Post-login role router. |
| /agent, /bilingual, /search, /thinking-map | alias | none | Locale- and query-preserving redirects; excluded from sitemap. |

## Sitemap contract

No sitemap URL may be noindex, private, or a redirect alias. Route membership is
code: `src/lib/routePolicy.ts` exports `SITEMAP_ROUTES`, `HELD_ROUTES` and
`PRIVATE_PREFIXES`, imported by BOTH the sitemap and the middleware, and a law
test asserts they never contradict. Listing/building details enter the sitemap
only when ALLOW_INDEX. robots.txt disallows /api/, /verify, /admin in both
locales.
