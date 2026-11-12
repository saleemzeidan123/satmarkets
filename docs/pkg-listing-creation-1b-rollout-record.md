# PKG-LISTING-CREATION-1B: production rollout record

Date: 2026-11-12. Operator: the owner's advisory session, acting through the owner's own signed-in dashboard sessions. This file records what was actually run, in order, with the evidence for each step. It does not restate the runbook (`docs/pkg-listing-creation-1b-migration-runbook.md`).

## Context that shaped the rollout

Read from production, read-only, immediately before the rollout:

- 94 listings, all 94 flagged `is_demo`.
- 9 accounts in `auth.users`, the newest created 2026-08-18.
- 7 rows in `public.listing_media`, none on a non-demo listing. 5 storage objects in total.
- Newest recorded migration: `20260728213636`.

There is no real lister, no real upload and no real photo in production. The runbook's deploy-window and legacy-media-conversion risks protect data that does not exist yet, so the rollout ran as one short window, and PR #23 (the compatibility patch for the old upload route) was not merged first. That is an explicit acceptance of the deploy-window residual risk named in the PR #22 description: the old route could only orphan an object if someone uploaded during the window, and uploads were paused for the whole of it.

## What was run, in order

| Step | Action | Evidence |
| --- | --- | --- |
| 0 | Gate on branch `pkg/listing-creation-1b` at `5644262`, run in a clean checkout: `npm ci`, typecheck, `npm test`, ar-lint, lint-gate | typecheck clean; 2114 of 2114 tests pass; ar-lint clean; lint-gate held. `npm run build` was not run in that environment (no route to Google Fonts); the Vercel build of the same commit succeeded. |
| 1 | Built two rollout files from the twelve pkg1b migrations in runbook section 11 order: `ops/pkg1b-rollout/pkg1b-preflight.sql` and `ops/pkg1b-rollout/pkg1b-apply.sql` | Each file is one `DO` statement that `EXECUTE`s the migration text, so it is atomic however the SQL runner sends it. SHA-256: preflight `7b460a34d3b696c11bcea4ffd7f391d5fa73c930df1d5444cbed3654e42d4284`, apply `c663a29d15a88f87b9c9916a99a43d24375c9018baedfbe6550d30be15bdb328`. The wrapper was rehearsed on a disposable local Postgres first: the dry run executes every statement, then rolls all of it back and leaves the session usable. |
| 2 | Real-schema preflight (runbook section 9), run in the dashboard SQL editor against production | The editor content was loaded from the pushed file and its SHA-256 checked in the page before running. Result: the expected single error, `PREFLIGHT_REACHED_END_AND_ROLLED_BACK {"listings": 94, "fence_col": 1, "media_rows": 7, "new_tables": 2, "is_cover_cols": 0, "expected_12_new_cols": 12, "listing_media_columns": 28, "listing_media_policies": 5, "listing_media_triggers": 8, "storage_object_policies": 4}`. A separate read-only query then confirmed nothing persisted (0 new tables, 13 columns, 1 trigger). |
| 3 | Upload pause (runbook section 11, step 1a): `revoke insert on public.listing_media from authenticated;` | Committed at `2026-11-12 10:10:43.675574+00`. Read back: `authenticated` has no INSERT; 0 in-flight inserts older than the pause. |
| 4 | Production apply: `pkg1b-apply.sql`, SHA-256 checked in the page before running | `Success. No rows returned`. Read back, read-only: 2 new tables, the 12 expected columns, no `is_cover`, the fence column present, 28 columns, 5 `listing_media` policies, 4 storage policies, 8 triggers, 7 media rows, 94 listings, RLS on for both new tables. These match the preflight figures exactly. |
| 5 | PR #22 marked ready and squash-merged | Merge commit `40316e5`. Vercel production deployment of that commit reached READY. |
| 6 | Anonymous smoke test on the production host, EN and AR | `/en`, `/ar`, `/en/listings`, `/ar/listings`, `/en/verification`, `/en/login`, `/en/post-requirement`, `/en/brokers`, `/en/rent-index` and a listing detail page all return 200 with `X-Robots-Tag: noindex, nofollow`. |
| 7 | Upload resume (runbook step 5), after the owner signed in to a SAT team test account: `grant insert on public.listing_media to authenticated;` | Committed at `2026-11-12 10:33:07.516091+00`. |
| 8 | Authenticated Studio smoke test on a draft test listing (runbook steps 4a and 4b, in part) | Upload of a generated, clearly labelled test image: the photo count went from 1 to 2, and the new row carries `upload_contract_version = 1`, a content hash, a preserved original, `derivation_verified = true`, `visibility = public`, `moderation_state = unreviewed`. The same bytes under a different file name were refused with "This file has already been uploaded to this listing." Per-shot categorisation: `PATCH` returned 200 and the choice persisted. Delete: `DELETE` returned 200, the row went and the photo count returned to 1. |
| 9 | **Defect found by step 8.** The deletion left both files in storage | `media_cleanup_queue` gained one unresolved row, reason `deletion_storage_remove_failed`, naming the derivative and the original. Cause: removals went through the caller's own client, and `storage.objects` has no DELETE policy for listers (four policies, read from production: two INSERT, two SELECT). Fixed in PR #25. |

## What is not done, stated plainly

- **Uploads are on again** (step 7). Not yet run from runbook step 4a: marking a guided-evidence item unavailable with a reason and confirming it survives a reload and shows in the draft preview, the asset-type change that invalidates a mark, and the anonymous check that a preserved original cannot be fetched.
- **One cleanup-queue row is unresolved** (step 9), and nothing schedules `scripts/reconcile-media-cleanup-queue.mjs`. Until PR #25 is deployed, every deletion adds another.
- **No manifest was applied** (runbook step 1b). The 7 pre-existing media rows are test photos on demo listings. They are untrusted under the new read boundary and therefore not publicly visible. Nothing real is hidden.
- **These migrations are not in `supabase_migrations.schema_migrations`.** They were applied through the SQL editor, as the runbook allows, not through a migration runner. The files in `supabase/migrations/` are the record.
- **The GitHub Actions `gate` check is still locked** ("account is locked due to a billing issue", run 43198360178, 2026-11-12). The gate was run by hand, as above.
- **The isolated local-Postgres harness cited in the PR #22 description (219 of 219) is not in this repository.** It could not be re-run for this rollout. If it exists on another machine it should be committed.

## Related change the same day

`public.map_anchors` (reported in the PR #22 description as having RLS disabled with effective `anon` write grants) was locked down directly in production before this rollout: RLS enabled, a public read policy, and INSERT, UPDATE, DELETE and TRUNCATE revoked from `anon` and `authenticated`. Row count (104) and a content hash were identical before and after. The matching migration is recorded as `supabase/migrations/20261112_map_anchors_rls_lockdown.sql`; it is written to be safe to run again.

## Rollback

Runbook section 7 holds the tested rollback SQL, and section 11a the recovery decision order. With no real data in production, the first choice on any defect is forward repair with the upload pause left engaged.
