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
| /map, /rent-index, /area, /advisor, /pricing, /about, /neutrality, /requirements, /locations, /market, /brokers | public-indexable-later | none | /area and /pricing stay noindex at launch until their register rows clear. |
| /building/[id], /lister/[id], /requirements/[id] | public-indexable-later | none | Detail sitemap entries gated on ALLOW_INDEX. |
| /login, /signup | noindex-private (/signup) / noindex-public (/login) | none | /signup is in PRIVATE_PREFIXES. |
| /dashboard/** | noindex-private | account session | |
| /me, /saved, /messages, /notifications | noindex-private | user session | |
| /deal, /deal/termsheet, /docs, /find, /invest, /post-requirement, /list, /compare | noindex-private | varies | Prototype and workspace surfaces. |
| /admin/** | noindex-private | SAT session | |
| /verify, /verify/signups, /verify/viewings | noindex-private | SAT session (404 otherwise) | Added to PRIVATE_PREFIXES in PKG-0A; robots.txt also disallows. |
| /ops, /proto | noindex-private | internal | Added to PRIVATE_PREFIXES in PKG-0A. |
| /go | noindex-private (alias) | none | Post-login role router. |
| /agent, /bilingual, /search, /thinking-map | alias | none | Locale- and query-preserving redirects; excluded from sitemap. |

## Sitemap contract

No sitemap URL may be noindex, private, or a redirect alias. Current sitemap =
static ROUTES (minus /compare, removed PKG-0A) plus listing/building details only
when ALLOW_INDEX. robots.txt disallows /api/, /verify, /admin in both locales.
