# PKG-1B area 5: neutral PWA entry and private-cache protection

## Neutral entry

- One manifest only: public/manifest.webmanifest (linked from the root layout).
- start_url is now "/" (was "/en"), so the installed app opens language-neutral.
  The existing middleware redirects "/" to /ar or /en from Accept-Language, so the
  neutral entry resolves to the user's locale without baking a language into the
  install. scope stays "/".
- theme_color is Harbor #3A6EA5 and background_color is white #FFFFFF, replacing the
  retired warm near-black #1C1A15 (a gold-family tone off the Harbor palette). The
  browser meta themeColor in the root layout was aligned to the same #3A6EA5, so the
  installed app and the browser tab share one Harbor identity colour.

## Private-cache protection

- There is NO service worker in this app (no next-pwa, no workbox, no registration,
  no public service-worker script). Nothing is precached, so no message,
  verification, enquiry, deal or document route can ever be stored in a service
  worker cache. The requirement holds by construction.
- Defence in depth: the middleware now sends
  `Cache-Control: private, no-store, max-age=0, must-revalidate` on every
  PRIVATE_PREFIXES route (/messages, /deal, /docs, /verify, /dashboard, /saved,
  /notifications, /post-requirement, /find, /list, /invest, /compare, /me, /go,
  /admin, /ops, /proto). This stops the browser HTTP cache and any intermediary
  from retaining an authenticated private page, independent of any future SW.
- If a service worker is ever added, its runtime caching must exclude
  PRIVATE_PREFIXES; recorded here so the constraint is not lost.
