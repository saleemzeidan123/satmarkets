# Owner actions, one checklist

ADV-1C.1 correction 6. Items were reopened across several packages without ever being
finished, because each time they came up they were re-explained rather than decided. This is
the single place they live from now on. Nothing here is engineering-blocked; every item is an
owner decision or owner-side administration, and none of them stops product work.

Each item states what the concern actually is, what the safe remedy is, and what to do. Where
the honest answer is that the advisory overstates the risk, that is said plainly rather than
carried forward as a task nobody closes.

Four items, in the order they were added. Items 1 to 3 are the original three. Item 4 is
finding 117, added when PKG-A11Y-1 authored its migration and could not apply it. Item 3, the
Arabic font workflow, is recorded here once and is deliberately not restated in any later
package; a handback that mentions it should link to this file rather than re-explain it.

---

## 1. `public.map_anchors`, row level security

**What it is.** 104 rows of transport reference points: Riyadh metro stations from the RCRC
open dataset, plus airports and rail. `src/lib/locationFacts.ts` computes straight-line
distance from a listing to the nearest of them, and `src/app/[locale]/listings/[id]/page.tsx`
reads the table directly through the anon client with
`select("kind,name_en,name_ar,line,lat,lng")` filtered to one city and three kinds.

**What the exposure actually is.** Public reference geography. A metro station's name and
coordinates are published by the authority that operates it, and the same points are visible
on any map. There is no personal data, no commercial term and no licensed third-party
extract in this table. So the advisory is correct that the table is readable by anon, and it
is not correct to treat that as a leak: this table is *intended* to be world readable, and
the only reason it looks like a finding is that RLS-off and public-by-design are
indistinguishable to an automated advisory.

**What is nevertheless worth fixing.** RLS off means anon can also read any column added to
this table in future, including one added by an import that was not thought through. The
protection should come from a policy that grants exactly the read that exists, not from the
absence of any policy at all.

**The recommendation, in order of preference.**

1. Keep the table in `public`, enable RLS, and add one SELECT policy for the anonymous and
   authenticated roles. This preserves the current behaviour exactly and closes the advisory.
   It is the option to take unless there is a reason not to.
2. Do not move it to a private schema. A private schema would require a view or an RPC in
   front of it for a read that is meant to be public, which is three moving parts standing in
   for one policy, and it would make the listing page's straightforward query into an
   indirection nobody maintains.
3. Do not restrict writes by policy alone. Writes should continue to come from the service
   role during import, and no policy below grants INSERT, UPDATE or DELETE to anon.

**SQL for the owner to run, after reading it.** This is not applied by the repository, because
enabling RLS and then failing to add the policy in the same transaction takes the location
facts off every listing page.

```sql
begin;
alter table public.map_anchors enable row level security;
create policy map_anchors_public_read
  on public.map_anchors
  for select
  to anon, authenticated
  using (true);
commit;
```

**How to confirm it worked.** Load any listing detail page on the preview and check that the
nearest metro station and its distance still render, in both languages. If the location facts
block disappears, the policy did not apply and the transaction should be rolled back.

---

## 2. `public.spatial_ref_sys`

**Do not run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on this table.** It is not ours.

**What it is.** `spatial_ref_sys` is created by the PostGIS extension. Its 8500 rows are the
EPSG catalogue of coordinate reference systems: the definition of WGS 84 and several thousand
others. It is reference data shipped with the extension, identical in every PostGIS database
in the world, and it contains nothing about SAT Markets, its users or its inventory.

**Whether the concern is real.** No. This is an automated advisory matching a rule, "a table
in a public schema without RLS", against a table the rule was not written for. There is no
exposure, because there is nothing here that is not already public in the EPSG registry.

**Why blind remediation is the actual risk.** The table is owned by the extension, not by the
project. Enabling RLS on an extension-owned table is either rejected outright for want of
ownership, or succeeds and then silently breaks PostGIS functions that read it, which on this
project means coordinate handling behind the map and the location facts. Supabase's own
guidance is that extension-owned objects in `public` are expected and are not to be altered.

**What to do.** Nothing to the table. Mark the advisory as accepted with this note as the
reason. If the advisory is noisy enough to be worth silencing, the supported route is to move
the PostGIS extension into its own schema at install time, which is a database rebuild
decision and is not worth making for an advisory line. Do not attempt to move an installed
extension on a live project.

---

## 3. `.github/workflows/arabic-font.yml`

**Status.** Delivered to the owner and not installed. The repository has no `.github/workflows`
directory at all, which is the whole of the outstanding work.

**Why the builder cannot install it.** The deploy token has no `workflow` scope, so a push
containing any file under `.github/workflows/` is rejected by GitHub before it reaches the
repository. A workflow-scoped token has deliberately not been requested, and should not be:
it would let automated pushes rewrite CI, which is a larger permission than this one file is
worth.

**What it does.** It renders the Arabic pages at the tested widths and fails the build if the
Arabic font is not the one that shipped. It is a regression guard, not a dependency: nothing
in the product needs it to run, and Arabic rendering continues to be verified by hand and by
the live evidence in each handback until it is installed.

**The checklist, once and not again.**

1. Open the repository on github.com, `saleemzeidan123/satmarkets`.
2. Press `.` to open the web editor, or use any local clone that has a normal user token.
3. Create the path `.github/workflows/arabic-font.yml`.
4. Paste the file that was delivered with the PKG-1B handback. It is unchanged since.
5. Commit to `main` directly. The workflow runs on the next push.
6. Confirm one green run under the Actions tab, then this item is closed and does not
   reappear in another handback.

**Until then.** This is recorded as owner-side administration. It does not gate any package,
and no further package will reopen it as an engineering item.

---

## 4. Finding 117, `public.create_requirement` assumes Riyadh

**What it is.** A requirement whose payload names no city is filed in Riyadh. The line is
inside the database function, not the application:

    coalesce(nullif(payload->>'city',''), 'Riyadh')

A brief that stated no location is stored as a brief that stated Riyadh, and nothing
downstream can tell the two apart afterwards. The board renders `city` as fact, the matching
filters read it, and the poster is never shown the value that was chosen for them. The city
is not a preference with a sensible fallback. It is the single field that decides who the
requirement is shown to.

**Where the defect actually sits, so the fix is not misread as a duplicate.** The HTTP path
has not been able to reach that default since PKG-DEM1 closed finding 102.
`src/app/api/requirements/route.ts` derives the city from the district row, falls back to a
recognised city key, and returns 400 `location_required` when neither yields one. That fix is
upstream of the defect and does not remove it. `create_requirement` is SECURITY DEFINER and
callable by `anon` and `authenticated`, so the route is one caller of the function and not a
gate in front of it. A direct PostgREST call, a future server action, an admin script or a
restored older client all still reach the coalesce.

**What the migration changes.** One line of behaviour. The city is read into a declared
variable and a null refuses the write with sqlstate `check_violation` (23514), chosen so a
caller can tell "you left the city out" apart from an ordinary constraint failure. Everything
else is byte-identical to the standing definition, including the pinned `search_path`, the
hardcoded `'open'` status and the notification rows. The whole body is restated because
`create or replace function` has no partial form, which is also the risk this carries: a
restatement can quietly drop a line. `src/lib/requirementCity.test.ts` guards each of those
properties against exactly that, and it reads the migration files rather than the database, so
it proves what the repository says and not what the live database does.

**Why the builder cannot apply it.** Every Supabase write tool in this environment is
permission denied, and the sandbox egress proxy blocks the database directly. This is not a
credential that could be pasted into a conversation to unblock it, and it should not become
one. It is an owner action taken in the Supabase dashboard.

**File.** `supabase/migrations/20260801_requirement_city_is_never_assumed.sql`, checked in
and unchanged since PKG-A11Y-1. Project `ltqgwpivmumfwqdxwwgo`.

### 4.1 Preflight, before applying anything

Run these four reads in the Supabase SQL editor. All four are `select` only.

1. **Confirm the standing definition is the one this migration expects to replace.** If it is
   not, stop and say so, because something outside the repository has redefined the function.

        select pg_get_functiondef('public.create_requirement(jsonb)'::regprocedure);

   Expect the body to contain `coalesce(nullif(payload->>'city',''), 'Riyadh')` and to contain
   no `raise exception`. That is the `20260714_public_write_paths_restored.sql` definition.

2. **Record who owns it and who may execute it,** so the after state can be compared.
   `create or replace function` preserves both, and this read is what proves it did.

        select p.proowner::regrole as owner, p.prosecdef as security_definer,
               p.proconfig as settings, array(select unnest(p.proacl)::text) as grants
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'create_requirement';

3. **Take the before figure.**

        select coalesce(city, '(null)') as city, count(*)
        from public.tenant_briefs group by 1 order by 2 desc;

   **Read this figure carefully, because it is the one place this item could mislead.** There
   is no marker on an existing row saying its city was assumed, which is the defect itself
   stated backwards. So this count is a baseline for comparison after the change, and it is
   **not** a count of affected rows. Nobody can produce that count now, and no report should
   claim one. The migration changes future writes only; it corrects no existing row and is not
   intended to.

4. **Confirm the function has no caller the repository does not know about,** if the project's
   logs retain far enough back.

        select count(*) from public.tenant_briefs where created_at > now() - interval '30 days';

   Compare against what the requirements board shows. A discrepancy is worth understanding
   before changing the write path, not after.

### 4.2 Applying it

1. Open the Supabase dashboard for project `ltqgwpivmumfwqdxwwgo`, SQL Editor, a new query.
2. Paste the **entire** contents of
   `supabase/migrations/20260801_requirement_city_is_never_assumed.sql`, comments included.
   The comments are the explanation of a SECURITY DEFINER function and belong in the database
   with it.
3. Run it once. It is a single `create or replace function` statement and is idempotent;
   running it twice changes nothing and is harmless.
4. There is no data change, no lock beyond the function's own catalog row, and no downtime.
   In-flight calls finish against the old definition and the next call uses the new one.

### 4.3 Post-application verification

Four checks, in this order. The first three are database, the fourth is the live site.

1. **Read the live body back.** This is the check that matters, because it reads the database
   rather than the file that was pasted into it.

        select pg_get_functiondef('public.create_requirement(jsonb)'::regprocedure);

   Expect `raise exception` present, `errcode = 'check_violation'` present, `'Riyadh'` absent,
   and `set search_path = public, pg_temp` still present. Re-run the grants read from preflight
   step 2 and confirm owner, `prosecdef` and the ACL are unchanged.

2. **Prove the refusal.** Wrapped so nothing is written.

        begin;
        select * from public.create_requirement('{"title":"preflight","asset_type":"office","deal_type":"lease"}'::jsonb);
        rollback;

   Expect it to fail with SQLSTATE `23514` and the message naming the city. If it inserts a
   row instead, the migration did not take and step 1 will say why.

3. **Prove the ordinary write still works.** Also wrapped.

        begin;
        select * from public.create_requirement('{"title":"preflight","asset_type":"office","deal_type":"lease","city":"Jeddah"}'::jsonb);
        select city, status from public.tenant_briefs order by created_at desc limit 1;
        select count(*) from public.requirement_notifications
          where brief_id = (select id from public.tenant_briefs order by created_at desc limit 1);
        rollback;

   Expect one row with `city = 'Jeddah'` and `status = 'open'`, and three notification rows.
   Then the rollback removes all four. **One thing does not roll back:** `ref_code` is drawn
   from a sequence, and a sequence does not roll back by design. The requirement reference
   numbering will skip one value. That gap is permanent, harmless, and worth expecting rather
   than discovering.

4. **Prove the site is unchanged.** Open the deployed preview and post a requirement with no
   location, in both languages. Expect the same refusal as before the migration: "Choose where
   you need the space." in English and "اختر المكان الذي تحتاج فيه المساحة." in Arabic, at the
   route's own layer, with no database error reaching the reader. This is the check that the
   migration closed the hole underneath the route without moving the refusal up a layer or
   changing what a person sees.

### 4.4 Safe rollback

There is nothing to undo in the data, because the migration writes no rows and alters no
table. Rollback is one statement: re-apply the previous definition, which is the
`create or replace function public.create_requirement(payload jsonb)` block in
`supabase/migrations/20260714_public_write_paths_restored.sql`. Paste that block and run it.

Two things to know before doing that. It restores the defect exactly, so finding 117 reopens
and should be recorded as reopened rather than left implied. And nothing in the product
depends on the raise: the route refuses an empty city before it ever calls the function, so a
rollback changes no behaviour any visitor can reach. The rollback exists for the case where
the restated body turns out to differ from the standing one in some way this repository could
not see, which is the honest risk of a `create or replace` that restates a whole function.

### 4.5 What closes finding 117

Send back these four things. The finding stays open until all four exist, and no package will
report it closed before then.

1. The output of the `pg_get_functiondef` read from 4.3 step 1, showing the raise present and
   `'Riyadh'` absent in the **live** definition.
2. The grants comparison from 4.3 step 1, showing owner, security definer and ACL unchanged.
3. The error text and SQLSTATE from 4.3 step 2, showing `23514`.
4. A screenshot or the rendered sentence from 4.3 step 4, in Arabic, showing the route's own
   refusal unchanged.

Until those arrive, the register row for 117 reads "Migration authored, awaiting owner
application", and that is not a status anyone should shorten to "fixed".
