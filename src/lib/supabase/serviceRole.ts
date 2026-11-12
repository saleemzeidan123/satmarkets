import { createClient } from "@supabase/supabase-js";

// A server-only, privileged client for the small set of writes an owner's
// own session must never be able to make directly: system-derived media
// integrity evidence (content_sha256, original_path, derived_*) and
// moderation decisions (moderation_state). Matches the existing convention
// in src/app/api/admin/accounts/provision/route.ts exactly (createClient
// from @supabase/supabase-js directly, persistSession: false; no cookie
// handling, since a service-role client carries no user session at all).
//
// Codex review: application-route validation alone does not stop a signed-in
// user from calling Supabase/PostgREST directly with their own session, if
// the underlying RLS/column grants would allow it. The real boundary has to
// be in the database: 20260902b/c/d_pkg1b_*.sql each add a BEFORE
// INSERT/UPDATE trigger rejecting a write to their trusted columns from
// anyone but service_role or a genuine superuser (a plain column-level
// REVOKE was tried first and found, empirically, not to work: it does not
// override a pre-existing table-level GRANT, which this project's own
// authenticated role already has). This client is the one, single place
// code in this package is allowed to write across that boundary from. It must:
//   - stay server-only: never imported by a "use client" file, never
//     returned from an API response, never logged;
//   - run only AFTER the caller's own session and listing-ownership have
//     already been checked with the ordinary session-scoped client (every
//     call site in this package does the ownership check first, using
//     getSupabaseServer(), before ever reaching this function);
//   - fail loudly, not silently degrade: a caller that gets `null` back
//     must refuse the request (503), never fall back to writing the
//     privileged columns through the ordinary client, which would defeat
//     the entire point of a separate trusted boundary.
//
// Returns null when unconfigured, the same convention getSupabaseServer()
// already uses, so "not configured" and "actually failed" stay
// distinguishable and no caller can mistake one for permission to skip the
// check.
export function getSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
