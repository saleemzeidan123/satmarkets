# Owner actions, one checklist

ADV-1C.1 correction 6. Three items have been reopened across several packages without ever
being finished, because each time they came up they were re-explained rather than decided.
This is the single place they live from now on. Nothing here is engineering-blocked; all
three are owner decisions or owner-side administration, and none of them stops product work.

Each item states what the concern actually is, what the safe remedy is, and what to do. Where
the honest answer is that the advisory overstates the risk, that is said plainly rather than
carried forward as a task nobody closes.

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
