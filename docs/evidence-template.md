# Package evidence template (WS06)

Copy this block into every package handback. A package without completed evidence
is not done (launch gate 20: no done status based on code review alone).

```
## PKG-XX evidence

Workstreams and routes in scope:
Acceptance gates stated before implementation:

Commit(s):
Diff summary:

Automated:
- typecheck (tsc --noEmit):
- unit tests (npm test), count and result:
- production build (npm run build):
- Arabic lint (npm run ar-lint):
- law tests (src/lib/laws.test.ts):

Live verification (production deploy READY):
- EN URLs checked:
- AR URLs checked:
- Widths: 390 px and 1440 px minimum (320/768/1024 when layout changed)
- Screenshots attached:
- Metadata/headers captured (canonical, X-Robots-Tag, sitemap) where relevant:

Accessibility (when UI changed): keyboard walk, focus visibility, contrast of new colors.

Register updates:
- docs/findings-register.md rows moved, with new status:
- docs/claims-ledger.md entries touched:

Known caveats and explicitly deferred work:
Codex review requested: yes/no
```
