-- PKG-DISCOVERY-1 UX closure, item 6. `listers_public` exposed exactly six
-- columns (id, name_en, name_ar, lister_type, is_operator, is_verified,
-- is_demo, per 20260714d, the only migration that has ever defined this
-- view), but two call sites already written against it ask for more:
--
--   src/lib/queries/listers.ts (the directory list)
--     .select("id,name_en,name_ar,lister_type,is_operator,is_verified,
--              is_demo,logo_url,member_since")
--
--   src/app/[locale]/lister/[id]/page.tsx (the public profile)
--     .select("id,name_en,name_ar,lister_type,is_operator,is_verified,
--              is_demo,about_en,about_ar,website,public_email,
--              public_phone,logo_url,member_since")
--
-- Neither `logo_url`, `member_since`, `about_en`, `about_ar`, `website`,
-- `public_email` nor `public_phone` was ever part of this view. PostgREST
-- errors on a select naming a column a view does not expose, so both of
-- those queries fail on every request against a real database: the public
-- lister directory and every public lister profile currently error rather
-- than merely omit a feature. Found while verifying, for PKG-DISCOVERY-1
-- item 6 ("strengthen the directory cards using existing truthful data"),
-- whether a live published-space count was "already available" the way the
-- instruction asked; it is not, and neither is the rest of what these two
-- routes already assumed.
--
-- This redefinition adds exactly what the application layer already reads,
-- and nothing else. Every added column is a real, existing `accounts`
-- column: `logo_url`, `about_en`, `about_ar`, `website`, `public_email` and
-- `public_phone` are all selected from `accounts` directly by
-- src/app/[locale]/dashboard/profile/page.tsx and written back through
-- src/app/api/account/route.ts, so they are not new claims about the
-- schema. `member_since` is the one name with no matching physical column:
-- `accounts` has `created_at` (read directly by
-- src/app/[locale]/admin/accounts/page.tsx), and no migration in this
-- repository adds a `member_since` column. `created_at` is aliased to
-- `member_since` here, the same way this view already renames `type` to
-- `lister_type` three lines below: a public name for a real internal
-- column, not a new one.
--
-- A live published-space count is deliberately NOT added as a column here.
-- src/app/[locale]/lister/[id]/page.tsx already computes that count for one
-- lister the honest way, a direct `count` against `public.listings` filtered
-- to `status = 'published'`, not a column carried on this view. The
-- directory query extends that same proven pattern batched across a page of
-- listers, in the same commit that adds this migration, rather than this
-- view growing a redundant aggregate column that could drift from it.
--
-- NOT VERIFIED AGAINST A LIVE DATABASE. This session has no access to the
-- production Supabase project (confirmed earlier in this package: the one
-- Supabase project reachable from here carries an unrelated schema), so
-- this migration is written from the schema evidence the repository itself
-- carries (other queries already reading these exact `accounts` columns)
-- and has not been applied and re-queried against a live instance. The
-- handback for this package states this plainly.
create or replace view public.listers_public as
select
  a.id,
  a.name_en,
  a.name_ar,
  case when a.type::text = 'sat' then 'broker' else a.type::text end as lister_type,
  (a.type::text = 'sat')                                             as is_operator,
  (a.verification_status::text = 'verified')                         as is_verified,
  a.is_demo,
  a.logo_url,
  a.about_en,
  a.about_ar,
  a.website,
  a.public_email,
  a.public_phone,
  a.created_at                                                       as member_since
from public.accounts a
where exists (
  select 1 from public.listings l
  where l.account_id = a.id and l.status = 'published'::listing_status
);

grant select on public.listers_public to anon, authenticated;
