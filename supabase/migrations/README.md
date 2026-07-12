# Database migrations

The **complete, authoritative** migration history for this project lives in the
Supabase project's tracked migration table (`supabase_migrations.schema_migrations`)
and is intact - 32 migrations, `20260615200502` … `20260712213623`. Nothing has
been applied outside that history.

This directory checks the migrations into the repo so the schema is reproducible
from git (Codex MKT-P0-08). The files below are the migrations authored in the
2026-07-12/13 security-hardening pass, reconstructed verbatim from the tracked
history:

- `20260712182943_add_requirement_interest_audit_columns.sql`
- `20260712190410_add_lead_consent_record.sql`
- `20260712194623_add_tenant_brief_title_ar.sql`
- `20260712202313_requirement_ref_sequence_and_create_rpc.sql`
- `20260712202342_fix_create_requirement_enum_casts.sql`
- `20260712213623_rls_tighten_pii_tables.sql`  ← the RLS lock-down (SM-P0-008)

## Completing the export (owner, local, one-time)

The 26 earlier migrations (the base schema, RBAC, rent index, requirements spine,
etc.) are in Supabase history but not yet in this folder. To pull them all into
the repo, run locally with the Supabase CLI (needs the DB password, which the
build agent deliberately does not handle):

    supabase link --project-ref ltqgwpivmumfwqdxwwgo
    supabase db pull            # writes every historical migration into this dir

After that, `supabase db reset` rebuilds a fresh database from the repo alone.

## CI note

A negative-policy test (per-table, per-role RLS assertions) is still to be added
so CI proves the lock-down holds on every push. The authorization behaviour was
verified live per role on 2026-07-13 (see SAT-Markets-Role-Test-Report.md).
