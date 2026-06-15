# SAT Markets

Riyadh commercial leasing and sales exchange. Powered by SAT Real Estate. Open to the market.

Separate from satestate.com. Its own repo, Supabase project, Vercel project, and domain.

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind
- Supabase (Postgres + PostGIS + auth + storage) — the SAT Markets project, not SAT CRM
- English-primary with full Arabic RTL mirror, hreflang (Arabic auto-served to Arabic-locale visitors)

## Getting started
1. `cp .env.example .env.local` and fill in the SAT Markets Supabase URL + anon key.
2. Apply the database migration `satmarkets_0001_init.sql` to that Supabase project.
3. `npm install`
4. `npm run dev`

## Guardrails baked in
- Only verified owners and SAT can list (enforced in the DB).
- Two explicit lead paths: direct contact vs representation.
- AI parses search intent only; rent figures always come from the verified index, never a model.

## Next steps
- Supabase RLS policies per account
- pgvector / Typesense AI search wiring
- Subscriptions + ZATCA invoicing
- Seed SAT's 64+ properties and Riyadh districts
