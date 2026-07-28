-- 2026-07-28. ADV-0. Applied to production via the Supabase MCP; recorded here because the
-- repo is the source of truth for schema (PR-T).
--
-- source_registry already answered two questions per source: may we STORE it
-- (storage_policy) and may we SHOW it (redisplay_policy). The Competitive Advantage
-- Strategy is that those two are not the whole permission surface, and it is right.
-- A source can be lawful to display and unlawful to derive from. A source can be lawful
-- to derive from and unlawful to hand to somebody else's language model. A source can be
-- lawful for all three today and become unlawful the moment a contract lapses, with
-- nothing in the schema able to say so.
--
-- Every column added here therefore FAILS CLOSED. The default asserts no right at all,
-- because the only safe reading of an unanswered permission question is that we do not
-- have it. A row that says nothing must never read as a row that says yes. That is the
-- same discipline as Law 3: an absent figure is stated as unavailable, never guessed.
--
--   derived_display_policy  may we publish a value we COMPUTED from this source, as
--                           opposed to the source's own published figure. This is the
--                           distinction that decides whether the Riyadh bulletin can
--                           exist, and it is not the same question as redisplay_policy.
--   export_policy           may a user carry the value out of the product, in a decision
--                           pack, a CSV, a PDF.
--   ai_retrieval_policy     may the assistant retrieve this value and state it in an
--                           answer. Retrieval is a redisplay in a channel the licensor
--                           may not have contemplated, so it gets its own column.
--   model_input_policy      may the value be SENT to an external model provider at all.
--                           'none' is not a synonym for the others being none: a figure
--                           we may publish to the world can still be barred from a
--                           third-party model whose retention terms we have not read.
--   rights_status           the honesty field. 'evidenced' means somebody read the terms
--                           and the licence_ref quotes them. 'asserted_unverified' means
--                           we believe it and cannot prove it. 'unknown' is the default
--                           and behaves exactly like 'prohibited' at the boundary.
--   stop_condition          what makes the permissions above stop being true. A permission
--                           with no expiry story is a permission nobody is watching.
--
-- No row is granted a right by this migration. The backfill below records ONLY what the
-- existing licence_ref text already evidences, and leaves everything else at the failing
-- default for the ADV-0 register to chase.

alter table public.source_registry
  add column if not exists derived_display_policy text not null default 'none',
  add column if not exists export_policy          text not null default 'none',
  add column if not exists ai_retrieval_policy    text not null default 'none',
  add column if not exists model_input_policy     text not null default 'none',
  add column if not exists rights_status          text not null default 'unknown',
  add column if not exists stop_condition         text,
  add column if not exists refresh_terms          text,
  add column if not exists corrections_process    text,
  add column if not exists audit_rights           text,
  add column if not exists termination_terms      text,
  add column if not exists rights_reviewed_at     timestamptz,
  add column if not exists rights_reviewed_note   text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'source_registry_derived_display_policy_check') then
    alter table public.source_registry
      add constraint source_registry_derived_display_policy_check
      check (derived_display_policy in ('none', 'internal', 'public'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'source_registry_export_policy_check') then
    alter table public.source_registry
      add constraint source_registry_export_policy_check
      check (export_policy in ('none', 'internal', 'public'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'source_registry_ai_retrieval_policy_check') then
    alter table public.source_registry
      add constraint source_registry_ai_retrieval_policy_check
      check (ai_retrieval_policy in ('none', 'internal', 'public'));
  end if;
  -- Model input is graded differently from the display policies because the question is
  -- different. It is not "who may see this", it is "how much of it may leave our process".
  if not exists (select 1 from pg_constraint where conname = 'source_registry_model_input_policy_check') then
    alter table public.source_registry
      add constraint source_registry_model_input_policy_check
      check (model_input_policy in ('none', 'redacted', 'sample_only', 'full'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'source_registry_rights_status_check') then
    alter table public.source_registry
      add constraint source_registry_rights_status_check
      check (rights_status in ('unknown', 'asserted_unverified', 'evidenced', 'prohibited'));
  end if;
end $$;

comment on column public.source_registry.derived_display_policy is
  'May we publish a value COMPUTED from this source, as distinct from the sources own published figure. Fails closed at none.';
comment on column public.source_registry.export_policy is
  'May a user carry the value out of the product. Fails closed at none.';
comment on column public.source_registry.ai_retrieval_policy is
  'May the assistant retrieve this value and state it in an answer. Fails closed at none.';
comment on column public.source_registry.model_input_policy is
  'How much may be sent to an external model provider. none, redacted, sample_only, full. Fails closed at none.';
comment on column public.source_registry.rights_status is
  'unknown and prohibited both deny at the boundary. asserted_unverified denies any public right. evidenced requires licence_ref to quote the terms.';
comment on column public.source_registry.stop_condition is
  'What makes these permissions stop being true. A permission with no expiry story is a permission nobody is watching.';

-- Backfill: only what the existing licence_ref already evidences.

-- GASTAT is the one source whose licence was read in full and expressly permits
-- republication including commercial use with attribution (use policy 1.2.2). Derived
-- display and export follow from that. AI retrieval follows too, because a retrieval that
-- quotes an attributed public figure is a republication we are already permitted to make.
-- Model input stays 'none': the licence permits us to republish, it says nothing about
-- handing the material to a third party's model, and that is a different party's terms.
update public.source_registry set
  derived_display_policy = 'public',
  export_policy          = 'public',
  ai_retrieval_policy    = 'public',
  model_input_policy     = 'none',
  rights_status          = 'evidenced',
  stop_condition         = 'GASTAT amends or withdraws use policy 1.2.2, or an indicator carries its own narrower condition. Re-read the policy each release that adds a GASTAT figure.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. Recorded from the licence text already in licence_ref. Model input deliberately withheld: republication rights are not model-input rights.'
where source_id = 'gastat_sama';

-- REGA / Ejar is an attribution licence via open.data.gov.sa, so its OWN published figure
-- may be shown with attribution. Everything past that is unanswered and therefore denied:
-- whether we may publish a value derived from it, whether a user may export it, whether the
-- assistant may retrieve it. Open decision O10 is exactly this gap, and the rent index is
-- the highest-value surface in the product, so the gap is recorded rather than assumed away.
update public.source_registry set
  derived_display_policy = 'internal',
  export_policy          = 'none',
  ai_retrieval_policy    = 'internal',
  model_input_policy     = 'none',
  rights_status          = 'asserted_unverified',
  stop_condition         = 'O10 unresolved. Attribution licence terms were not read in full. If a derived value, an export or an assistant retrieval is required in public, obtain and record the permitted-use language first.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. redisplay_policy public covers the sources own published average with attribution, which is what the Rent Index shows today. It does not cover derivation, export or retrieval.'
where source_id = 'rega_ejar';

-- Broker research is already redisplay internal because JLL, CBRE and Knight Frank each
-- forbid reproduction without written permission. A derived value is still a reproduction
-- of their work, so it is denied too, and nothing here may reach a model.
update public.source_registry set
  derived_display_policy = 'none',
  export_policy          = 'none',
  ai_retrieval_policy    = 'none',
  model_input_policy     = 'none',
  rights_status          = 'prohibited',
  stop_condition         = 'Written permission from the publisher, recorded here, is the only thing that changes any of these. Until then this source calibrates internally and never reaches a page, an export, an answer or a model.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. Strategy item 7 (public commercial research) is blocked at the source for anything drawing on this row, not merely at counsel.'
where source_id = 'broker_overlay';

-- The Apache 2.0 open snapshot is the only POI layer we may lawfully hold. Attribution
-- "Powered by Foursquare" is required wherever it is shown.
update public.source_registry set
  derived_display_policy = 'public',
  export_policy          = 'internal',
  ai_retrieval_policy    = 'public',
  model_input_policy     = 'none',
  rights_status          = 'evidenced',
  stop_condition         = 'The snapshot licence changes, or the attribution is dropped from a surface that shows it.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. Distinct from foursquare_mapbox, which is the live API and permits caching nothing but fsq_place_id.'
where source_id = 'fsq_os_places';

-- The live Foursquare API and Mapbox. Nothing may be stored but an id, nothing may be
-- shown, and there is no isochrone table in this schema by design.
update public.source_registry set
  derived_display_policy = 'none',
  export_policy          = 'none',
  ai_retrieval_policy    = 'none',
  model_input_policy     = 'none',
  rights_status          = 'evidenced',
  stop_condition         = 'Provider terms are the constraint and they are already read. ADV-5 may not reintroduce an isochrone cache or hold a Navigation-scoped token on the server.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. Recorded as evidenced because the restriction, not the permission, is what was verified.'
where source_id = 'foursquare_mapbox';

-- Verification sources. The advertising permit is not merely showable, it is required
-- display under the REGA marketing rules, so its display columns say so while everything
-- about derivation, export and models stays shut.
update public.source_registry set
  derived_display_policy = 'none',
  export_policy          = 'internal',
  ai_retrieval_policy    = 'public',
  model_input_policy     = 'none',
  rights_status          = 'evidenced',
  stop_condition         = 'The REGA marketing rules change the mandatory display items.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. Permit number and expiry are mandatory display, so an assistant stating them is stating a required public fact.'
where source_id = 'rega_permit';

-- Nafath returns government-verified PII under PDPL. The verification EVENT is ours to
-- keep; the payload never was. Nothing here reaches a model, an export or a page.
update public.source_registry set
  derived_display_policy = 'none',
  export_policy          = 'none',
  ai_retrieval_policy    = 'none',
  model_input_policy     = 'none',
  rights_status          = 'evidenced',
  stop_condition         = 'PDPL obligations are continuous. Any change to what we store beyond the event and a masked identifier requires a fresh privacy review.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. The assistant may say that identity was verified. It may never retrieve the identity.'
where source_id = 'nafath';

-- Wathq restricts use to our own business and forbids extracting commercial benefit for
-- third parties without approval. We store the OUTCOME of a deed check, never the deed.
-- PD4 (deed verification under FAL) builds on the outcome and must not widen this.
update public.source_registry set
  derived_display_policy = 'none',
  export_policy          = 'none',
  ai_retrieval_policy    = 'none',
  model_input_policy     = 'none',
  rights_status          = 'evidenced',
  stop_condition         = 'Any use that benefits a third party commercially requires Wathq approval. PD4 extends gate.ts dimensions from the outcome only.',
  rights_reviewed_at     = now(),
  rights_reviewed_note   = 'ADV-0. The verification outcome is a SAT fact about a listing. The deed payload is Wathq material and is not stored.'
where source_id = 'wathq_deeds';

-- SPL National Address is the candidate authoritative geography layer and its written
-- redisplay terms are unverified pre-signup, which the row already says. Every new column
-- therefore stays at its failing default except the status, which records why.
update public.source_registry set
  rights_status        = 'asserted_unverified',
  stop_condition       = 'Terms unverified pre-signup. ADV-5 writes the interface; no SPL field may render publicly until the signed terms are read and recorded here.',
  rights_reviewed_at   = now(),
  rights_reviewed_note = 'ADV-0. redisplay_policy public predates this review and is an assumption, not evidence. The failing defaults on the new columns are the honest state.'
where source_id = 'spl_address';
