-- 2026-11-13d. PKG-DATA-1. PREPARED, NOT APPLIED. The owner applies it.
--
-- Registers one new source: the Real Estate General Authority's quarterly
-- "Rental indicators" datasets on the National Open Data Platform
-- (open.data.gov.sa). The leasing activity section on /market shows the
-- dataset's own contract counts by district, and it asks this row first. With
-- no row the section renders nothing, which is the failing default the source
-- rights ledger was built to guarantee, so merging the code before this runs
-- shows nobody anything.
--
-- WHY A NEW ROW AND NOT rega_ejar. rega_ejar is the Rental Index, held at
-- asserted_unverified because its terms were never read in full (open decision
-- O10). This dataset is published under the platform's Open Data License,
-- which was read on 2026-11-13 and is quoted below. Recording that on the
-- rega_ejar row would widen a right nobody has evidenced for the index.
--
-- WHAT WAS READ. Open Data License, version 2.0, March 2023, Saudi Data and AI
-- Authority, sixteen pages. Read: the summary (section 1) and sections 4 to 12
-- (pages 3 and 7 to 15). Not read: the introduction and the definitions
-- (sections 2 and 3, pages 4 to 6). The rights relied on are stated in the
-- sections that were read.
--
-- WHAT IS GRANTED HERE. Only what the section uses: showing the source's own
-- published figure in public, with the notice the licence requires. The licence
-- itself goes further (derivative works, redistribution), and those columns
-- are still held back:
--   derived_display_policy  internal. A derived market figure in public is
--                           analysis whatever the data licence says, and the
--                           regulatory register holds that until O13.
--   export_policy           none. Passing the dataset on carries the licence's
--                           section 6.1 and 6.3 duties, and no export surface
--                           has been built to carry them.
--   ai_retrieval_policy     none. Nothing retrieves it.
--   model_input_policy      none. As for every other source.
-- Widening any of these is a later migration with its own reasons.
--
-- Safe to run twice.

insert into public.source_registry (
  source_id, name_en, name_ar, layer, cadence, expected_lag_days,
  attribution_label_en, attribution_label_ar, license_note,
  storage_policy, redisplay_policy, licence_ref,
  derived_display_policy, export_policy, ai_retrieval_policy, model_input_policy,
  rights_status, stop_condition, refresh_terms, termination_terms,
  rights_reviewed_at, rights_reviewed_note
) values (
  'rega_open_rental_indicators',
  'REGA rental indicators (National Open Data Platform)',
  'المؤشرات الإيجارية للهيئة العامة للعقار (المنصة الوطنية للبيانات المفتوحة)',
  'context',
  'quarterly',
  null,
  'Real Estate General Authority, National Open Data Platform',
  'الهيئة العامة للعقار، المنصة الوطنية للبيانات المفتوحة',
  'Counts of registered lease contracts by district and property type. The commercial rows carry no rent. Shown as published, never modelled.',
  'full',      -- storage_policy
  'public',    -- redisplay_policy
  'Open Data License, version 2.0, March 2023, Saudi Data and AI Authority: https://open.data.gov.sa/odp-public/static/en/assets/Open_Data_License_En.pdf. Section 1: "To Share: To copy, distribute, use and reuse the dataset. To Create: To produce works from the dataset. To Adapt: To modify, transform and build upon the dataset." and "Attribute: You must attribute any public use of the dataset, or works produced from the dataset, in the manner specified in the license." and "Applies To: The open data datasets published via the (open.data.gov.sa) platform." Section 5: "the licensor grants to you a worldwide, royalty-free, non-exclusive, terminable (but only under section 11) license to use the dataset for the duration of any applicable copyright and dataset rights. These rights explicitly include commercial use, and do not exclude any field of endeavor." Section 6.2: "if you publicly use a produced work, you must include a notice associated with the produced work reasonably calculated to make any person that uses, views, accesses, interacts with, or is otherwise exposed to the produced work aware that content was obtained from the dataset, derivative dataset, or the dataset as part of a collective dataset, and that it is available under this license." Section 9: "The dataset is licensed by the licensor \"as is\" and without any warranty of any kind".',
  'internal',  -- derived_display_policy
  'none',      -- export_policy
  'none',      -- ai_retrieval_policy
  'none',      -- model_input_policy
  'evidenced', -- rights_status
  'The licence is amended or replaced, the dataset is withdrawn or re-released under other terms (section 5.2 and 11.5 reserve that), or the notice on the page stops naming the dataset and the licence. Re-read the licence page each quarter a new file is loaded.',
  'Published quarterly, one dataset per region. Each file loaded is recorded beside its extract with the official file hash and the retrieval date.',
  'Section 11.1: "Any breach by you of the terms and conditions of this license automatically terminates this license with immediate effect and without notice to you." Section 11.4 reinstates on cure.',
  now(),
  'PKG-DATA-1, 2026-11-13. Licence read: section 1 and sections 4 to 12. Sections 2 and 3 (introduction, definitions) not read. Redisplay of the source''s own figure is evidenced and granted. Derived display, export, retrieval and model input are held back for the reasons in the migration header, not because the licence refuses them.'
)
on conflict (source_id) do update set
  name_en                = excluded.name_en,
  name_ar                = excluded.name_ar,
  layer                  = excluded.layer,
  cadence                = excluded.cadence,
  expected_lag_days      = excluded.expected_lag_days,
  attribution_label_en   = excluded.attribution_label_en,
  attribution_label_ar   = excluded.attribution_label_ar,
  license_note           = excluded.license_note,
  storage_policy         = excluded.storage_policy,
  redisplay_policy       = excluded.redisplay_policy,
  licence_ref            = excluded.licence_ref,
  derived_display_policy = excluded.derived_display_policy,
  export_policy          = excluded.export_policy,
  ai_retrieval_policy    = excluded.ai_retrieval_policy,
  model_input_policy     = excluded.model_input_policy,
  rights_status          = excluded.rights_status,
  stop_condition         = excluded.stop_condition,
  refresh_terms          = excluded.refresh_terms,
  termination_terms      = excluded.termination_terms,
  rights_reviewed_at     = excluded.rights_reviewed_at,
  rights_reviewed_note   = excluded.rights_reviewed_note;
