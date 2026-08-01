// PKG-ELITE-E1 slice F. Codex item 6: the ELITE-8 event dictionary.
//
// WHAT THIS FILE IS.
//
// The complete first-party product event dictionary, held as typed data rather
// than as a document, so that the rules it states are checked by a test instead
// of being read by whoever remembers to read it. `events.test.ts` is the half of
// this slice that has teeth.
//
// WHAT THIS FILE IS NOT.
//
// It is not an emitter, it is not a client, and it does not send anything
// anywhere. No event in this dictionary is collected at this commit and
// `mayCollect` returns false for every one of them. Two separate things hold it
// shut and both are recorded:
//
//   1. O17, new in this slice. Nobody has ruled on the lawful basis, the
//      retention position or the user disclosure for first-party behavioural
//      measurement. `docs/regulatory-register.md` Part C2 has a row for every
//      other category of personal data SAT holds and no row for this one,
//      because until this slice there was nothing to write a row about.
//   2. O12 for the notification family specifically, which is already recorded
//      and already fails closed everywhere else in the platform.
//
// Codex item 6 says design the dictionary and do not install a third-party
// analytics SDK. This is the design. The instrumentation is a later decision
// that needs O17 answered first, and pretending otherwise by wiring a collector
// now would be exactly the "statistical sufficiency bypassing permission"
// mistake that Codex item 2 named in a different context.
//
// THE ONE RULE THAT SHAPED EVERY ENTRY.
//
// "Do not log raw searches, private requirements, messages, documents, contact
// details, prompts or property-sensitive content by default." That sentence is
// not a comment here. It is `FORBIDDEN_PROPERTIES`, and the test asserts that no
// allowed property list on any event intersects it. The consequence is visible
// throughout: search events carry which facets were used and never which values,
// requirement events carry which field groups were completed and never their
// contents, and Advisor events carry a refusal code and never a prompt.
//
// A measurement design that needs the content to work is a measurement design
// that was aimed at the wrong question. Whether a lister finished a listing
// without help does not require knowing the rent they typed.

// ---------------------------------------------------------------------------
// Scorecard measure ids
// ---------------------------------------------------------------------------

/**
 * The twelve measures Codex named. They live here rather than in `scorecard.ts`
 * so that every event can declare which measure it exists to serve without the
 * two modules importing each other. An event that serves no measure is an event
 * nobody asked for, and the test rejects it.
 */
export type MeasureId =
  | "independent_listing_completion"
  | "time_to_tenant_ready"
  | "search_task_success"
  | "requirement_completion"
  | "match_relevance_progression"
  | "evidence_comprehension"
  | "notification_opt_out_and_complaint"
  | "unsupported_figure_incidents"
  | "data_freshness"
  | "accessibility_health"
  | "core_web_vitals"
  | "ai_grounded_success_latency_cost";

export const MEASURE_IDS: readonly MeasureId[] = [
  "independent_listing_completion",
  "time_to_tenant_ready",
  "search_task_success",
  "requirement_completion",
  "match_relevance_progression",
  "evidence_comprehension",
  "notification_opt_out_and_complaint",
  "unsupported_figure_incidents",
  "data_freshness",
  "accessibility_health",
  "core_web_vitals",
  "ai_grounded_success_latency_cost",
];

// ---------------------------------------------------------------------------
// The property catalogue
// ---------------------------------------------------------------------------

/**
 * Every property any event is allowed to carry, with the reason it is not
 * personal or commercial content. A property that cannot be given that reason
 * does not belong in this catalogue, and a property outside this catalogue
 * cannot appear on an event, which is what stops a plausible-sounding field
 * being added later without anybody deciding it was safe.
 */
export type PropertyId =
  // Present on every event.
  | "schema_version"
  | "occurred_at_minute"
  | "locale"
  | "surface"
  | "session_key"
  // Actor and organization.
  | "actor_key"
  | "org_key"
  | "actor_role"
  | "is_research_participant"
  // Record references.
  | "listing_id"
  | "requirement_id"
  | "match_id"
  | "figure_id"
  | "source_id"
  // Structure, never values.
  | "step_id"
  | "field_group"
  | "missing_fact_code"
  | "validation_code"
  | "media_kind"
  | "media_count_band"
  | "facet_ids"
  | "facet_count"
  | "sort_id"
  | "result_count_band"
  | "rank_band"
  | "compare_slot_count"
  // Behaviour.
  | "outcome"
  | "attempt_index"
  | "duration_ms_band"
  | "help_opened"
  | "assist_used"
  | "abandoned"
  | "entry_point"
  // Notification.
  | "channel"
  | "consent_state"
  | "suppression_code"
  | "complaint_code"
  // Evidence.
  | "passport_tier"
  | "evidence_state"
  | "comprehension_answer_code"
  // Advisor.
  | "tool_name"
  | "grounded"
  | "refusal_code"
  | "failure_code"
  | "latency_ms_band"
  | "cost_band"
  // Progression.
  | "progression_stage"
  | "observation_authorised";

export type PropertySpec = {
  readonly id: PropertyId;
  /** What the value is, precisely enough that an implementer cannot widen it. */
  readonly shape: string;
  /** Why this is not personal, commercial or property-sensitive content. */
  readonly why: string;
};

export const PROPERTY_CATALOGUE: readonly PropertySpec[] = [
  {
    id: "schema_version",
    shape: "Integer. The version of this dictionary the emitter was built against.",
    why: "A number about our own code. It carries nothing about the person, and without it a dictionary change silently reinterprets old rows.",
  },
  {
    id: "occurred_at_minute",
    shape: "Timestamp truncated to the minute, in UTC.",
    why: "Minute resolution answers every measure in the scorecard. Second resolution starts to join rows into a session reconstruction that nobody needs, so the precision is spent rather than kept.",
  },
  {
    id: "locale",
    shape: 'Either "en" or "ar".',
    why: "Which of the two published languages was rendered. Bilingual parity is a product law here, so a measure that cannot be split by language cannot show a parity failure.",
  },
  {
    id: "surface",
    shape: "A route family identifier such as listings_index or listing_detail. Never a full URL and never a query string.",
    why: "The full URL is the thing that carries the search. The route family is the thing that answers where the person was.",
  },
  {
    id: "session_key",
    shape: "A rotating pseudonymous key, scoped to one visit, not linkable across visits by the emitter.",
    why: "Deduplication and within-task sequencing need one stable handle for the length of a task. Nothing in the scorecard needs that handle to survive the visit.",
  },
  {
    id: "actor_key",
    shape: "A pseudonymous, per-installation key derived from the account id. Not the account id and not reversible by a reader of the event store.",
    why: "Independent completion is a per-person measure and cannot be computed without a person-shaped key. It is pseudonymous because the measure needs distinctness, not identity.",
  },
  {
    id: "org_key",
    shape: "The pseudonymous organization key.",
    why: "Almost every commercial task here is done on behalf of an organization, and a completion rate that cannot separate one large lister from thirty small ones is a misleading number.",
  },
  {
    id: "actor_role",
    shape: "A coarse role enum: lister_admin, lister_member, occupier, sat_reviewer.",
    why: "The role is a property of the account inside its organization. It is not a name and there are few enough values that it cannot single anyone out.",
  },
  {
    id: "is_research_participant",
    shape: "Boolean, set only for an account enrolled in a design-partner round with recorded consent.",
    why: "A design-partner session must be separable from ordinary use or the first baselines are computed from a room with a facilitator in it.",
  },
  {
    id: "listing_id",
    shape: "The listing record id.",
    why: "A listing is a record SAT already holds under contract performance. Referring to it does not add anything the platform did not already have, and without it a funnel cannot be assembled at all.",
  },
  {
    id: "requirement_id",
    shape: "The requirement record id, never its contents.",
    why: "The id is a handle. The contents are the private commercial requirement, are in the forbidden list, and stay there.",
  },
  { id: "match_id", shape: "The match record id.", why: "Same reasoning as the requirement id. The explanation and the dimensions are derivable from the record by an authorised reader, so the event does not need to restate them." },
  {
    id: "figure_id",
    shape: "The identifier of a displayed figure, as used by the evidence layer.",
    why: "It names which figure was shown, not what it said. An unsupported-figure incident has to be attributable to a figure or it cannot be fixed.",
  },
  { id: "source_id", shape: "A registered source id from `source_registry`.", why: "The publishing body, which is public information and already printed on the page under its attribution rule." },
  { id: "step_id", shape: "A Listing Studio step identifier.", why: "The identifier of a step in our own flow, never what was typed into it. Where people stall is answerable from step order alone." },
  {
    id: "field_group",
    shape: "A named group of fields such as commercial_terms or fit_out. Never a field value.",
    why: "Remediation measurement needs to know which part of the form costs people time. It does not need the answer they eventually gave.",
  },
  { id: "missing_fact_code", shape: "The code of the missing fact, from the listing completeness model.", why: "A code from our own fixed vocabulary. There is no free text in it." },
  { id: "validation_code", shape: "The validation rule code that fired.", why: "Identifies the rule, not the rejected input. The rejected input is often the exact commercial figure and is forbidden." },
  { id: "media_kind", shape: "photo, floorplan, video or document_cover.", why: "A four-value enum about type, not content." },
  { id: "media_count_band", shape: 'Banded count: "0", "1-3", "4-9", "10+".', why: "The media standard is expressed in thresholds, so the bands answer it exactly and an exact count adds only re-identification surface." },
  {
    id: "facet_ids",
    shape: "The set of filter facet identifiers that were active, such as city or asset_type. Never the selected values.",
    why: "This is the line that keeps search measurable without logging searches. Which controls a person reached for is a usability fact. What they put in them is the search itself.",
  },
  { id: "facet_count", shape: "Integer count of active facets.", why: "Derivable from facet_ids and kept separately only so a measure can be computed without expanding the set." },
  { id: "sort_id", shape: "The sort option identifier.", why: "One of a small fixed list of our own options." },
  { id: "result_count_band", shape: 'Banded: "0", "1-9", "10-49", "50+".', why: "Zero-result rate is a real search-quality signal. The exact count is not needed and narrows the possible queries." },
  { id: "rank_band", shape: 'Banded position: "1-3", "4-10", "11+".', why: "Whether people act on what is near the top is answerable in bands." },
  { id: "compare_slot_count", shape: "Integer, how many items were in the comparison.", why: "A count of slots rather than their identities. Whether people compare two things or five is a design question, and which listings they compared is not needed to answer it." },
  { id: "outcome", shape: "A per-event enum, always closed, always declared with the event.", why: "A closed enum cannot carry free text, which is the only way an outcome field turns into a content field." },
  { id: "attempt_index", shape: "Integer, which attempt at the same task this was.", why: "Error recovery is measured in retries. The integer says nothing about what was retried." },
  { id: "duration_ms_band", shape: 'Banded elapsed time: "<5s", "5-30s", "30-120s", "2-10m", ">10m".', why: "Time to a tenant-ready listing is one of the twelve measures. Bands answer it, and a millisecond figure is a fingerprint." },
  { id: "help_opened", shape: "Boolean, true when help, guidance or an explanation panel was opened during the task.", why: "Whether the person opened help during the task. Independent completion is defined against this." },
  { id: "assist_used", shape: "Boolean, true when a suggestion or assist offered by the product was accepted.", why: "Whether a suggestion or assist was accepted. Same reason, and it separates the product working from the product being explained." },
  { id: "abandoned", shape: "Boolean, set when a task is left without completion or explicit cancel.", why: "Abandonment is one of the things the ELITE-1 round is designed to observe, and the instrument should not be the only place it is visible." },
  { id: "entry_point", shape: "A coarse enum for how the task was started, such as nav, empty_state, deep_link or resume.", why: "A fixed enum of our own surfaces, not a referrer and not a URL. It separates a task somebody chose to start from one they were pushed into by an empty state." },
  { id: "channel", shape: "email, push, sms, whatsapp or in_product.", why: "Which channel, never the address. Addresses are contact details and forbidden." },
  { id: "consent_state", shape: "not_asked, granted, declined, withdrawn.", why: "The consent position is the thing being measured and is itself the record that makes an opt-out auditable." },
  { id: "suppression_code", shape: "The reason a send was withheld, from a fixed list including o12_unresolved.", why: "Our own reason codes. Today every external send is suppressed under o12_unresolved and this is how that stays visible rather than silent." },
  { id: "complaint_code", shape: "A fixed complaint reason code.", why: "A code, not the complaint text. The text is a message and is forbidden." },
  { id: "passport_tier", shape: "The evidence tier shown in the passport.", why: "The tier is already displayed on the page to the person who opened it." },
  { id: "evidence_state", shape: "The verification state displayed beside the figure.", why: "Also already displayed, and the comprehension measure is meaningless without knowing which state was on screen." },
  { id: "comprehension_answer_code", shape: "The selected option code from the comprehension prompt, from a fixed set.", why: "A choice among our own options. There is no free-text answer in the prompt design, deliberately, so that there is nothing to redact." },
  { id: "tool_name", shape: "The name of the typed Advisor tool that produced the result.", why: "Names our own code path. The Advisor grounding rule is enforced at the tool boundary, so the tool name is the unit an incident is attributed to." },
  { id: "grounded", shape: "Boolean, true only when every displayed figure traced to an authorised typed tool result.", why: "This is the assertion the Advisor already has to make internally before it may attach a passport. Recording it changes nothing about what is computed." },
  { id: "refusal_code", shape: "The reason the Advisor declined, from a fixed list.", why: "A refusal is a success of the boundary, and counting refusals by reason is how we learn which question the product cannot answer yet. The question itself is a prompt and is forbidden." },
  { id: "failure_code", shape: "A transport or provider failure code.", why: "A transport or provider failure code, which is infrastructure rather than content. It says an attempt failed and how, never what was being asked for when it did." },
  { id: "latency_ms_band", shape: 'Banded: "<1s", "1-3s", "3-10s", ">10s".', why: "Latency is one third of the AI measure Codex named." },
  { id: "cost_band", shape: "A banded cost bucket for one Advisor turn.", why: "Cost is the third third. Bands are enough to see a trend and avoid implying a precision the router does not have." },
  { id: "progression_stage", shape: "viewing_requested, viewing_confirmed, rfp_started, rfp_submitted, decision_pack_generated.", why: "Stage names from our own funnel, recorded only where the platform is the place the stage happened. Nothing here describes the deal, the parties or the terms." },
  {
    id: "observation_authorised",
    shape: "Boolean. False means the stage happened outside anything SAT is permitted to observe.",
    why: 'Codex wrote "where SAT is authorized to observe it" into the requirement. This property is that clause, made into a field, so an unauthorised stage is recorded as unobserved rather than quietly counted.',
  },
];

/** On every event, without being restated forty-three times. */
export const BASE_PROPERTIES: readonly PropertyId[] = [
  "schema_version",
  "occurred_at_minute",
  "locale",
  "surface",
  "session_key",
];

// ---------------------------------------------------------------------------
// The forbidden catalogue
// ---------------------------------------------------------------------------

/**
 * Codex item 6, made mechanical. These are the things a well-meaning
 * implementer reaches for first, named individually so that the prohibition is
 * a list a test can check rather than a sentence a reader can interpret.
 */
export type ForbiddenId =
  | "query_text"
  | "facet_values"
  | "saved_search_definition"
  | "requirement_text"
  | "requirement_field_values"
  | "shortlist_contents"
  | "message_body"
  | "enquiry_text"
  | "document_content"
  | "document_filename"
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "national_id"
  | "cr_number"
  | "deed_number"
  | "nafath_payload"
  | "prompt_text"
  | "model_output_text"
  | "draft_field_value"
  | "exact_price"
  | "exact_area"
  | "lat_lng"
  | "street_address"
  | "ip_address"
  | "user_agent_string"
  | "full_url_with_query"
  | "referrer_with_query"
  | "screen_recording"
  | "keystrokes";

export const FORBIDDEN_PROPERTIES: readonly ForbiddenId[] = [
  "query_text",
  "facet_values",
  "saved_search_definition",
  "requirement_text",
  "requirement_field_values",
  "shortlist_contents",
  "message_body",
  "enquiry_text",
  "document_content",
  "document_filename",
  "contact_name",
  "contact_email",
  "contact_phone",
  "national_id",
  "cr_number",
  "deed_number",
  "nafath_payload",
  "prompt_text",
  "model_output_text",
  "draft_field_value",
  "exact_price",
  "exact_area",
  "lat_lng",
  "street_address",
  "ip_address",
  "user_agent_string",
  "full_url_with_query",
  "referrer_with_query",
  "screen_recording",
  "keystrokes",
];

// ---------------------------------------------------------------------------
// Basis, retention, scope, deduplication
// ---------------------------------------------------------------------------

/**
 * The vocabulary is taken from `docs/regulatory-register.md` Part C2 rather than
 * invented here, so that a basis written on an event is the same basis the
 * register already relies on for the underlying record.
 */
export type LawfulBasis =
  /** Necessary to provide the service the person asked for. Register C2 row 1 and 2. */
  | "contract"
  /** Held because a rule requires it. Register C2, verification rows. */
  | "legal_obligation"
  /** Requires an affirmative, recorded, withdrawable act by the person. */
  | "consent"
  /** No basis has been established. The event may not be collected. Register C2 marks two categories this way today. */
  | "not_established";

/**
 * Retention is stated as a window on the row-level event and a separate position
 * on the aggregate, because the two are different risks. A row can single a
 * person out. A weekly rate cannot.
 */
export type RetentionWindow =
  /** Raw rows for 90 days, then aggregate only. The default, and what most of the funnel needs. */
  | "raw_90_then_aggregate"
  /** Raw rows for 400 days, then aggregate only. For seasonal measures that need a year plus a comparison period. */
  | "raw_400_then_aggregate"
  /** Never stored as a row. Counted into an aggregate at write time. */
  | "aggregate_only"
  /** Not collected at all at this commit. */
  | "not_collected";

export type Scope =
  /** Attributable to a person inside an organization. */
  | "user_and_org"
  /** Attributable to the organization only. */
  | "org_only"
  /** No actor key at all. Session-scoped and nothing more. */
  | "anonymous_session";

export type DedupWindow = "once_ever" | "per_session" | "per_day" | "none";

export type Dedup = {
  readonly window: DedupWindow;
  /** The properties that form the identity of one occurrence. Must be properties the event is allowed to carry. */
  readonly key: readonly PropertyId[];
};

export type EventFamily =
  | "listing"
  | "missing_fact"
  | "media"
  | "search"
  | "requirement"
  | "match"
  | "notification"
  | "passport"
  | "advisor"
  | "progression";

export const EVENT_FAMILIES: readonly EventFamily[] = [
  "listing",
  "missing_fact",
  "media",
  "search",
  "requirement",
  "match",
  "notification",
  "passport",
  "advisor",
  "progression",
];

/** One event, carrying the nine attributes Codex required and nothing else. */
export type EventSpec = {
  readonly id: string;
  readonly family: EventFamily;
  /** 1. Why this exists. A purpose that does not name a decision is a purpose that will not survive review. */
  readonly purpose: string;
  /** 2. The precise moment it fires. */
  readonly trigger: string;
  /** 3. Allowed properties, beyond the base set every event carries. */
  readonly allowed: readonly PropertyId[];
  /** 4. Prohibited sensitive properties, named because they are the ones an implementer would reach for on this event. */
  readonly prohibited: readonly ForbiddenId[];
  /** 5. Lawful basis or consent dependency. */
  readonly basis: LawfulBasis;
  readonly basisNote: string;
  /** 6. Retention. */
  readonly retention: RetentionWindow;
  /** 7. User and organization scope. */
  readonly scope: Scope;
  /** 8. Deduplication. */
  readonly dedup: Dedup;
  /** 9. The measures this event supports. At least one, or the event should not exist. */
  readonly metrics: readonly MeasureId[];
};

// ---------------------------------------------------------------------------
// The dictionary
// ---------------------------------------------------------------------------

const CONTRACT_LISTING =
  "Contract performance. The lister asked SAT to publish an inventory record and these events measure whether the tool given to them works. Register C2 row 2.";
const CONTRACT_SEARCH =
  "Contract performance for the underlying activity, which the register already covers. The measurement layer itself is held under O17 and is not collected until that is ruled.";

export const EVENTS: readonly EventSpec[] = [
  // --- 1. Listing lifecycle -------------------------------------------------
  {
    id: "listing_draft_started",
    family: "listing",
    purpose:
      "The denominator for independent listing completion. Without a start there is no completion rate, only a count of finished listings, which flatters every version of the product equally.",
    trigger: "A new listing draft record is created, once, on the first save of the first step.",
    allowed: ["actor_key", "org_key", "actor_role", "listing_id", "entry_point", "is_research_participant"],
    prohibited: ["draft_field_value", "exact_price", "exact_area", "street_address"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id"] },
    metrics: ["independent_listing_completion", "time_to_tenant_ready"],
  },
  {
    id: "listing_step_saved",
    family: "listing",
    purpose:
      "Where a listing stalls. A completion rate says how many finished, this says which step the rest stopped at, and those are the two halves of the same decision.",
    trigger: "A Listing Studio step is saved successfully.",
    allowed: ["actor_key", "org_key", "listing_id", "step_id", "duration_ms_band", "help_opened", "assist_used", "attempt_index"],
    prohibited: ["draft_field_value", "exact_price", "exact_area", "street_address", "lat_lng"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "step_id", "attempt_index"] },
    metrics: ["independent_listing_completion", "time_to_tenant_ready"],
  },
  {
    id: "listing_validation_failed",
    family: "listing",
    purpose:
      "Which rules people cannot satisfy. A validation rule that fires constantly is usually a rule that is explained badly rather than a population that is careless.",
    trigger: "A save or a publish attempt is rejected by a validation rule, once per rule per attempt.",
    allowed: ["actor_key", "org_key", "listing_id", "step_id", "validation_code", "field_group", "attempt_index"],
    prohibited: ["draft_field_value", "exact_price", "exact_area", "requirement_field_values"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "validation_code", "attempt_index"] },
    metrics: ["independent_listing_completion", "accessibility_health"],
  },
  {
    id: "listing_completed",
    family: "listing",
    purpose:
      "The numerator for independent listing completion, and the end of the clock for time to a tenant-ready listing.",
    trigger: "The listing first reaches the completeness state the product calls tenant ready.",
    allowed: ["actor_key", "org_key", "listing_id", "duration_ms_band", "help_opened", "assist_used", "is_research_participant"],
    prohibited: ["draft_field_value", "exact_price", "exact_area", "street_address"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id"] },
    metrics: ["independent_listing_completion", "time_to_tenant_ready"],
  },
  {
    id: "listing_abandoned",
    family: "listing",
    purpose:
      "Abandonment is the observation the ELITE-1 facilitator guide asks a human to watch for. It should also be visible outside the research room, or the only abandonment SAT ever sees is the abandonment it paid someone to sit through.",
    trigger:
      "A draft has been untouched past the inactivity threshold and has not reached tenant ready. Computed on a schedule, not on a user action.",
    allowed: ["actor_key", "org_key", "listing_id", "step_id", "abandoned", "duration_ms_band"],
    prohibited: ["draft_field_value", "exact_price", "exact_area"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id"] },
    metrics: ["independent_listing_completion"],
  },
  {
    id: "listing_publication_readiness_evaluated",
    family: "listing",
    purpose:
      "Whether the publication gate blocks people for reasons they can act on. Finding 137 added a location-consistency block, and a block nobody can clear is a defect that would otherwise be invisible.",
    trigger: "The publication readiness decision is computed for a listing, on demand or on save.",
    allowed: ["actor_key", "org_key", "listing_id", "outcome", "missing_fact_code", "evidence_state"],
    prohibited: ["draft_field_value", "lat_lng", "street_address", "deed_number"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "outcome"] },
    metrics: ["independent_listing_completion", "time_to_tenant_ready"],
  },
  {
    id: "listing_published",
    family: "listing",
    purpose:
      "The transition from a complete record to a public one, kept separate from completion because they are different decisions and conflating them hides the gap between them.",
    trigger: "A listing first becomes publicly visible.",
    allowed: ["actor_key", "org_key", "listing_id", "duration_ms_band"],
    prohibited: ["exact_price", "exact_area", "street_address"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id"] },
    metrics: ["time_to_tenant_ready", "data_freshness"],
  },

  // --- 2. Missing-fact remediation -----------------------------------------
  {
    id: "missing_fact_shown",
    family: "missing_fact",
    purpose:
      "Which facts the product asks for most often. The denominator for whether an explanation actually causes a fix.",
    trigger: "A missing-fact prompt is rendered for the first time in a session for a given fact on a given listing.",
    allowed: ["actor_key", "org_key", "listing_id", "missing_fact_code", "field_group"],
    prohibited: ["draft_field_value", "exact_price", "exact_area"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "missing_fact_code"] },
    metrics: ["independent_listing_completion"],
  },
  {
    id: "missing_fact_explanation_opened",
    family: "missing_fact",
    purpose:
      'The ELITE-1 supply task "understand missing facts and why they matter" needs a behavioural counterpart. This is it: whether people go looking for the reason.',
    trigger: "The why-it-matters disclosure for a missing fact is opened.",
    allowed: ["actor_key", "org_key", "listing_id", "missing_fact_code", "help_opened"],
    prohibited: ["draft_field_value"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "missing_fact_code"] },
    metrics: ["independent_listing_completion", "evidence_comprehension"],
  },
  {
    id: "missing_fact_resolved",
    family: "missing_fact",
    purpose:
      "The remediation rate itself. A fact that is shown a thousand times and resolved twice is a question the product is asking wrongly.",
    trigger: "A previously missing fact becomes present on the listing record.",
    allowed: ["actor_key", "org_key", "listing_id", "missing_fact_code", "duration_ms_band", "assist_used"],
    prohibited: ["draft_field_value", "exact_price", "exact_area"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id", "missing_fact_code"] },
    metrics: ["independent_listing_completion", "time_to_tenant_ready"],
  },

  // --- 3. Media completion --------------------------------------------------
  {
    id: "media_added",
    family: "media",
    purpose: "Whether the media standard is reachable in practice, by kind.",
    trigger: "A media item is successfully attached to a listing.",
    allowed: ["actor_key", "org_key", "listing_id", "media_kind", "media_count_band", "attempt_index"],
    prohibited: ["document_content", "document_filename", "lat_lng", "street_address"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["independent_listing_completion"],
  },
  {
    id: "media_upload_failed",
    family: "media",
    purpose:
      "Upload failure is the kind of defect that people work around by giving up quietly. A failure the product does not count is a failure the product will not fix.",
    trigger: "A media upload attempt does not complete.",
    allowed: ["actor_key", "org_key", "listing_id", "media_kind", "failure_code", "attempt_index"],
    prohibited: ["document_content", "document_filename"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["independent_listing_completion"],
  },
  {
    id: "media_standard_met",
    family: "media",
    purpose: "The point at which a listing stops being penalised for its media, which is a step on the way to tenant ready.",
    trigger: "The listing first satisfies the media standard in full.",
    allowed: ["actor_key", "org_key", "listing_id", "media_count_band", "duration_ms_band"],
    prohibited: ["document_content", "document_filename"],
    basis: "contract",
    basisNote: CONTRACT_LISTING,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id"] },
    metrics: ["independent_listing_completion", "time_to_tenant_ready"],
  },
  {
    id: "map_pin_placed",
    family: "media",
    purpose:
      "Finding 137 turned the first map pin into a gated action. This counts how often the pin and the selected district disagree, which is the number that decides whether the district picker or the map is the thing to fix.",
    trigger: "A map pin is set or moved and the location-consistency decision is computed.",
    allowed: ["actor_key", "org_key", "listing_id", "outcome", "attempt_index"],
    prohibited: ["lat_lng", "street_address", "exact_area"],
    basis: "contract",
    basisNote:
      CONTRACT_LISTING +
      " The coordinate itself is forbidden here: the consistency verdict is the measurement, and the pin is property-sensitive content.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["independent_listing_completion", "data_freshness"],
  },

  // --- 4. Search, filter, save, comparison ---------------------------------
  {
    id: "search_run",
    family: "search",
    purpose:
      "The denominator for search task success and the only place zero-result rate can be seen. It carries which controls were used and never what was put in them, which is the whole design of this family.",
    trigger: "A search result set is returned to the browser.",
    allowed: ["actor_key", "org_key", "facet_ids", "facet_count", "sort_id", "result_count_band", "entry_point", "is_research_participant"],
    prohibited: ["query_text", "facet_values", "saved_search_definition", "full_url_with_query", "referrer_with_query", "lat_lng"],
    basis: "contract",
    basisNote: CONTRACT_SEARCH,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["search_task_success"],
  },
  {
    id: "search_refined",
    family: "search",
    purpose:
      "Repeated refinement without an opened result is the behavioural signature of a filter set that does not express what the person means.",
    trigger: "A facet or sort is changed on an existing result set.",
    allowed: ["actor_key", "org_key", "facet_ids", "facet_count", "sort_id", "result_count_band", "attempt_index"],
    prohibited: ["query_text", "facet_values", "full_url_with_query"],
    basis: "contract",
    basisNote: CONTRACT_SEARCH,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["search_task_success"],
  },
  {
    id: "search_result_opened",
    family: "search",
    purpose: "The numerator for the simplest version of search success, and the input to whether rank is doing anything.",
    trigger: "A result is opened from a result set.",
    allowed: ["actor_key", "org_key", "listing_id", "rank_band", "result_count_band"],
    prohibited: ["query_text", "facet_values", "full_url_with_query"],
    basis: "contract",
    basisNote: CONTRACT_SEARCH,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id"] },
    metrics: ["search_task_success"],
  },
  {
    id: "search_saved",
    family: "search",
    purpose:
      "A saved search is an intention strong enough to come back for. It is also the point where the notification question starts, which is why the event exists in this family and the send does not.",
    trigger: "A search is saved or a watch is created.",
    allowed: ["actor_key", "org_key", "facet_ids", "facet_count"],
    prohibited: ["query_text", "facet_values", "saved_search_definition"],
    basis: "contract",
    basisNote:
      "Contract performance for the saved search itself, which register C2 already covers. Any external message about it is O12 and lives in the notification family.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["search_task_success", "notification_opt_out_and_complaint"],
  },
  {
    id: "comparison_opened",
    family: "search",
    purpose:
      'The ELITE-1 demand task "compare options" needs a counterpart that is not a facilitator note. Whether anybody compares at all is the first question, before whether comparison is good.',
    trigger: "A comparison view is opened with at least two items.",
    allowed: ["actor_key", "org_key", "compare_slot_count", "entry_point"],
    prohibited: ["shortlist_contents", "query_text", "facet_values"],
    basis: "contract",
    basisNote: CONTRACT_SEARCH,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["compare_slot_count"] },
    metrics: ["search_task_success", "evidence_comprehension"],
  },
  {
    id: "comparison_evidence_expanded",
    family: "search",
    purpose:
      "Whether the evidence column in a comparison is read or scrolled past. An evidence-first product that nobody expands is a product whose evidence is in the wrong place.",
    trigger: "An evidence detail is expanded inside a comparison.",
    allowed: ["actor_key", "org_key", "listing_id", "figure_id", "evidence_state", "passport_tier"],
    prohibited: ["shortlist_contents", "exact_price", "exact_area"],
    basis: "contract",
    basisNote: CONTRACT_SEARCH,
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "figure_id"] },
    metrics: ["evidence_comprehension"],
  },

  // --- 5. Requirement creation and completion ------------------------------
  {
    id: "requirement_started",
    family: "requirement",
    purpose: "The denominator for requirement completion, which is the demand side of the same measure as listing completion.",
    trigger: "A requirement draft record is created.",
    allowed: ["actor_key", "org_key", "actor_role", "requirement_id", "entry_point", "is_research_participant"],
    prohibited: ["requirement_text", "requirement_field_values", "exact_area", "exact_price", "lat_lng"],
    basis: "contract",
    basisNote:
      "Contract performance. Register C2 covers requirements. The requirement content is private commercial information and appears nowhere in this family.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["requirement_id"] },
    metrics: ["requirement_completion"],
  },
  {
    id: "requirement_field_group_completed",
    family: "requirement",
    purpose: "Which part of a structured requirement people can express and which part defeats them.",
    trigger: "All fields in a named group are present for the first time.",
    allowed: ["actor_key", "org_key", "requirement_id", "field_group", "duration_ms_band", "help_opened"],
    prohibited: ["requirement_text", "requirement_field_values", "exact_area", "exact_price"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above for the requirement family under register C2. The group name is ours; the values inside the group are the private commercial requirement and are forbidden.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["requirement_id", "field_group"] },
    metrics: ["requirement_completion"],
  },
  {
    id: "requirement_completed",
    family: "requirement",
    purpose: "A requirement that is structured enough to match against, which is the only state that produces anything downstream.",
    trigger: "The requirement first reaches the matchable state.",
    allowed: ["actor_key", "org_key", "requirement_id", "duration_ms_band", "help_opened", "assist_used", "is_research_participant"],
    prohibited: ["requirement_text", "requirement_field_values", "exact_area", "exact_price", "lat_lng"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above. Completion is a state of a record the person asked us to hold, and the record is not copied into the event.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["requirement_id"] },
    metrics: ["requirement_completion", "match_relevance_progression"],
  },
  {
    id: "requirement_abandoned",
    family: "requirement",
    purpose: "The demand-side counterpart of listing abandonment, and the number that says whether the requirement form is too long.",
    trigger: "A requirement draft passes the inactivity threshold without reaching the matchable state.",
    allowed: ["actor_key", "org_key", "requirement_id", "field_group", "abandoned", "duration_ms_band"],
    prohibited: ["requirement_text", "requirement_field_values"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above. An abandonment is the absence of a completion, so it carries less than the completion event does, not more.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["requirement_id"] },
    metrics: ["requirement_completion"],
  },

  // --- 6. Match display, explanation, dismiss, shortlist, interest ---------
  {
    id: "match_displayed",
    family: "match",
    purpose: "The denominator for match relevance. Without it, a dismissal rate is a number with no population.",
    trigger: "A match is rendered to a person for the first time in a session.",
    allowed: ["actor_key", "org_key", "match_id", "listing_id", "requirement_id", "rank_band", "outcome"],
    prohibited: ["requirement_text", "requirement_field_values", "exact_price", "exact_area", "shortlist_contents"],
    basis: "contract",
    basisNote:
      "Contract performance. A match shown inside the product to a party to it is the service working. Anything sent outside the product about the same match is O12.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["match_id"] },
    metrics: ["match_relevance_progression"],
  },
  {
    id: "match_explanation_opened",
    family: "match",
    purpose:
      "Whether the dimension-by-dimension explanation is used. The matching surface was built on the premise that an unexplained match is not actionable, and this is the only way to find out whether that premise holds.",
    trigger: "The match explanation panel is opened.",
    allowed: ["actor_key", "org_key", "match_id", "help_opened"],
    prohibited: ["requirement_text", "requirement_field_values"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above for the match family. Opening an explanation about a match a party is already shown is the same in-product service, and O12 still governs anything sent outside it.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["match_id"] },
    metrics: ["match_relevance_progression", "evidence_comprehension"],
  },
  {
    id: "match_dismissed",
    family: "match",
    purpose:
      "The clearest relevance signal the product can get without asking. A dismissal reason code is included and free text is not, deliberately.",
    trigger: "A match is dismissed.",
    allowed: ["actor_key", "org_key", "match_id", "rank_band", "outcome"],
    prohibited: ["requirement_text", "message_body", "enquiry_text"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above. A dismissal is a control the person used, and recording that they used it does not record what they rejected.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["match_id"] },
    metrics: ["match_relevance_progression"],
  },
  {
    id: "match_shortlisted",
    family: "match",
    purpose: "The first positive act on a match, and the step before interest.",
    trigger: "A match is added to a shortlist.",
    allowed: ["actor_key", "org_key", "match_id", "rank_band", "compare_slot_count"],
    prohibited: ["shortlist_contents", "requirement_text"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above. The shortlist membership stays in the record; the event says a shortlist action happened, and shortlist_contents is forbidden.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["match_id"] },
    metrics: ["match_relevance_progression"],
  },
  {
    id: "match_interest_registered",
    family: "match",
    purpose:
      "The event whose count is currently zero and whose absence is the reason Codex ruled against building another surface. It is the first behavioural evidence of demand that the platform can produce.",
    trigger: "Interest is registered against a match or a requirement.",
    allowed: ["actor_key", "org_key", "match_id", "requirement_id", "listing_id", "outcome"],
    prohibited: ["message_body", "enquiry_text", "contact_name", "contact_email", "contact_phone"],
    basis: "contract",
    basisNote:
      "Contract performance for the registration. The release of contact details is a separate question under O14 and is not part of this event.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["match_id", "actor_key"] },
    metrics: ["match_relevance_progression"],
  },

  // --- 7. Notification consent, suppression, opt-out -----------------------
  {
    id: "notification_consent_prompted",
    family: "notification",
    purpose:
      "Whether people are being asked clearly. An opt-out rate is only interpretable next to how the question was put.",
    trigger: "A per-channel consent choice is presented.",
    allowed: ["actor_key", "org_key", "channel", "consent_state", "entry_point"],
    prohibited: ["contact_email", "contact_phone", "contact_name", "message_body"],
    basis: "not_established",
    basisNote:
      "O12. The consent basis for external-channel routing is unresolved and register C2 marks the category as not established. The prompt itself is not shown and the event is not collected.",
    retention: "not_collected",
    scope: "user_and_org",
    dedup: { window: "per_day", key: ["channel"] },
    metrics: ["notification_opt_out_and_complaint"],
  },
  {
    id: "notification_consent_changed",
    family: "notification",
    purpose:
      "The auditable record of an affirmative act, which is what makes a consent claim defensible rather than asserted.",
    trigger: "A person grants, declines or withdraws consent for a channel.",
    allowed: ["actor_key", "org_key", "channel", "consent_state"],
    prohibited: ["contact_email", "contact_phone", "contact_name"],
    basis: "not_established",
    basisNote: "O12, as above. When O12 is ruled this row becomes the record the ruling depends on, which is why it is designed now.",
    retention: "not_collected",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["notification_opt_out_and_complaint"],
  },
  {
    id: "notification_suppressed",
    family: "notification",
    purpose:
      "The event that keeps a fail-closed decision visible. Today every external send is suppressed under o12_unresolved, and a suppression nobody counts is indistinguishable from a feature nobody built.",
    trigger: "An outbound message is withheld by the notification gate.",
    allowed: ["actor_key", "org_key", "channel", "suppression_code"],
    prohibited: ["contact_email", "contact_phone", "message_body"],
    basis: "not_established",
    basisNote:
      "O12. The suppression itself is arguably operational rather than personal, but it names a channel and an actor, so it fails closed with the rest of the family rather than being argued into a different category.",
    retention: "not_collected",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["notification_opt_out_and_complaint"],
  },
  {
    id: "notification_opted_out",
    family: "notification",
    purpose: "One half of the measure Codex named by name.",
    trigger: "A person opts out of a channel, from any surface including an unsubscribe link.",
    allowed: ["actor_key", "org_key", "channel", "consent_state", "entry_point"],
    prohibited: ["contact_email", "contact_phone", "contact_name"],
    basis: "not_established",
    basisNote: 
      "O12, as above for the whole notification family. An opt-out is the one event in it that must survive whatever the consent ruling says, because a withdrawal nobody recorded is a withdrawal that will be ignored.",
    retention: "not_collected",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["notification_opt_out_and_complaint"],
  },
  {
    id: "notification_complaint_received",
    family: "notification",
    purpose:
      "The other half. A complaint rate is the measure that should be able to stop a channel, and a channel that can only be stopped by a person noticing is not governed.",
    trigger: "A complaint or spam report is received for a channel.",
    allowed: ["org_key", "channel", "complaint_code"],
    prohibited: ["contact_email", "contact_phone", "message_body", "contact_name"],
    basis: "not_established",
    basisNote: "O12, as above. Scoped to the organization rather than the person, because the measure is about the channel and not about who complained.",
    retention: "not_collected",
    scope: "org_only",
    dedup: { window: "none", key: [] },
    metrics: ["notification_opt_out_and_complaint"],
  },

  // --- 8. Evidence Passport ------------------------------------------------
  {
    id: "passport_opened",
    family: "passport",
    purpose:
      "Whether the evidence layer is reached at all. The whole product position is that a verified figure beats an unverified one, and this is the first fact that either supports or undermines it.",
    trigger: "An Evidence Passport is opened for a figure.",
    allowed: ["actor_key", "org_key", "listing_id", "figure_id", "source_id", "passport_tier", "evidence_state"],
    prohibited: ["exact_price", "exact_area", "document_content", "document_filename"],
    basis: "contract",
    basisNote:
      
      "Contract performance for the underlying view, under the register C2 lawful basis table. The figure value is absent: the event names which figure and which tier, never what it said, because a withheld figure must not reach an event store either.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["listing_id", "figure_id"] },
    metrics: ["evidence_comprehension"],
  },
  {
    id: "passport_tier_expanded",
    family: "passport",
    purpose: "How deep people go. A tier nobody expands is a tier that can be simplified.",
    trigger: "A tier or section inside an open passport is expanded.",
    allowed: ["actor_key", "org_key", "figure_id", "passport_tier", "source_id"],
    prohibited: ["exact_price", "exact_area", "document_content"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above for passport_opened. The tier is already on the screen of the person who expanded it, and the figure it contains is not in the event.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "per_session", key: ["figure_id", "passport_tier"] },
    metrics: ["evidence_comprehension"],
  },
  {
    id: "comprehension_prompt_shown",
    family: "passport",
    purpose:
      "The denominator for evidence comprehension. This is the one place in the dictionary where the product asks rather than infers, and it asks a closed question so that there is no free text to redact.",
    trigger: "The comprehension prompt is presented after a passport interaction, at the sampled rate.",
    allowed: ["actor_key", "org_key", "figure_id", "evidence_state", "passport_tier", "is_research_participant"],
    prohibited: ["exact_price", "exact_area", "message_body"],
    basis: "consent",
    basisNote:
      "Consent. Asking a person a question and keeping the answer is a distinct act from measuring their use of the product, so it carries its own affirmative, declinable prompt and is not covered by O17 alone.",
    retention: "not_collected",
    scope: "user_and_org",
    dedup: { window: "per_day", key: ["figure_id"] },
    metrics: ["evidence_comprehension"],
  },
  {
    id: "comprehension_answered",
    family: "passport",
    purpose:
      "Whether people can say what a verification state means. Codex asked for verification comprehension in the research instrument, and this is the same question asked continuously instead of five times.",
    trigger: "A comprehension prompt is answered.",
    allowed: ["actor_key", "org_key", "figure_id", "evidence_state", "comprehension_answer_code", "is_research_participant"],
    prohibited: ["message_body", "exact_price", "exact_area"],
    basis: "consent",
    basisNote: "Consent, as above. A declined prompt produces no row at all rather than a row saying declined.",
    retention: "not_collected",
    scope: "user_and_org",
    dedup: { window: "per_day", key: ["figure_id"] },
    metrics: ["evidence_comprehension"],
  },

  // --- 9. Advisor -----------------------------------------------------------
  {
    id: "advisor_grounded_result",
    family: "advisor",
    purpose:
      "The success half of the AI measure. Grounded means every displayed figure traced to an authorised typed tool result, which is already the condition the Advisor must satisfy before it may attach a passport.",
    trigger: "An Advisor answer is displayed and the grounding assertion passes.",
    allowed: ["actor_key", "org_key", "tool_name", "grounded", "figure_id", "source_id", "latency_ms_band", "cost_band"],
    prohibited: ["prompt_text", "model_output_text", "query_text", "requirement_text", "document_content"],
    basis: "contract",
    basisNote:
      
      "Contract performance for the answer, under the register C2 lawful basis table. The prompt and the output are forbidden without exception: they are the two fields that would turn an operational counter into a transcript store.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["ai_grounded_success_latency_cost", "unsupported_figure_incidents"],
  },
  {
    id: "advisor_refusal",
    family: "advisor",
    purpose:
      "A refusal is the boundary working, not the product failing, and counting refusals by reason is how SAT learns which questions it cannot yet answer without inventing a figure.",
    trigger: "The Advisor declines to answer or withholds a figure.",
    allowed: ["actor_key", "org_key", "refusal_code", "source_id", "tool_name", "latency_ms_band"],
    prohibited: ["prompt_text", "model_output_text", "query_text"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above for the Advisor family. A refusal is our own guardrail firing, and the prompt that triggered it is forbidden, so the count is operational rather than a transcript.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["ai_grounded_success_latency_cost", "unsupported_figure_incidents"],
  },
  {
    id: "advisor_retry",
    family: "advisor",
    purpose: "Retries separate a slow answer from a wrong one, and they are the cheapest available proxy for an answer that did not land.",
    trigger: "A person reasks or regenerates within the same Advisor thread.",
    allowed: ["actor_key", "org_key", "attempt_index", "tool_name", "latency_ms_band"],
    prohibited: ["prompt_text", "model_output_text", "query_text"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above. A retry counts attempts at the same task and carries no part of what was attempted.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["ai_grounded_success_latency_cost"],
  },
  {
    id: "advisor_failure",
    family: "advisor",
    purpose: "Transport and provider failures, separated from refusals so that a broken route is never read as a cautious one.",
    trigger: "An Advisor turn ends without an answer for a technical reason.",
    allowed: ["actor_key", "org_key", "failure_code", "tool_name", "latency_ms_band", "attempt_index"],
    prohibited: ["prompt_text", "model_output_text"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above. A failure carries a transport or provider code, which is infrastructure rather than anything the person said.",
    retention: "raw_90_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["ai_grounded_success_latency_cost"],
  },

  // --- 10. Viewing and request-for-proposal progression --------------------
  {
    id: "viewing_requested",
    family: "progression",
    purpose:
      "The first stage past interest, and the first stage where SAT may not be entitled to see anything. The authorisation flag is part of the event rather than a rule applied later.",
    trigger: "A viewing request is created inside the platform.",
    allowed: ["actor_key", "org_key", "listing_id", "requirement_id", "progression_stage", "observation_authorised"],
    prohibited: ["message_body", "contact_name", "contact_email", "contact_phone", "street_address"],
    basis: "contract",
    basisNote:
      
      "Contract performance for a request made through the platform, under the register C2 lawful basis table. Where the parties move off the platform, the stage is unobserved and no row is written, which is what observation_authorised records.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id", "requirement_id", "progression_stage"] },
    metrics: ["match_relevance_progression"],
  },
  {
    id: "viewing_confirmed",
    family: "progression",
    purpose: "The difference between requesting and happening, which is the point where a marketplace either works or stops.",
    trigger: "A viewing request is confirmed by the other party inside the platform.",
    allowed: ["actor_key", "org_key", "listing_id", "progression_stage", "observation_authorised", "duration_ms_band"],
    prohibited: ["message_body", "contact_name", "contact_email", "contact_phone", "street_address"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above for viewing_requested, and recorded only where observation_authorised is true for the same reason.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "once_ever", key: ["listing_id", "progression_stage"] },
    metrics: ["match_relevance_progression"],
  },
  {
    id: "rfp_progressed",
    family: "progression",
    purpose:
      "The last observable stage before a transaction. Recorded as a stage transition rather than as a document, because the document is the confidential part.",
    trigger: "A request for proposal moves to a new stage inside the platform.",
    allowed: ["org_key", "requirement_id", "progression_stage", "observation_authorised"],
    prohibited: ["document_content", "document_filename", "message_body", "exact_price", "exact_area", "requirement_text"],
    basis: "contract",
    basisNote:
      
      "Contract performance for the stage record, under the register C2 lawful basis table. Scoped to the organization because the commercially meaningful actor here is the organization and the individual adds nothing the measure needs.",
    retention: "raw_400_then_aggregate",
    scope: "org_only",
    dedup: { window: "once_ever", key: ["requirement_id", "progression_stage"] },
    metrics: ["match_relevance_progression"],
  },
  {
    id: "decision_pack_generated",
    family: "progression",
    purpose:
      "The decision pack is the artefact SAT claims is the reason to use the platform. Whether it is generated, and at which stage, is the test of that claim.",
    trigger: "A decision pack is generated.",
    allowed: ["actor_key", "org_key", "listing_id", "requirement_id", "progression_stage", "evidence_state"],
    prohibited: ["document_content", "document_filename", "exact_price", "exact_area"],
    basis: "contract",
    basisNote: 
      "Contract performance, as above for the progression family. A pack generated through the platform is the platform working; its contents are the commercial matter and appear nowhere here.",
    retention: "raw_400_then_aggregate",
    scope: "user_and_org",
    dedup: { window: "none", key: [] },
    metrics: ["match_relevance_progression", "evidence_comprehension"],
  },
];

// ---------------------------------------------------------------------------
// The collection gate
// ---------------------------------------------------------------------------

/**
 * O17. Nobody has ruled on the lawful basis, the retention position or the user
 * disclosure for first-party behavioural measurement, so nothing is collected.
 *
 * This is a constant rather than an environment variable on purpose. An
 * environment variable can be set by whoever has the dashboard. A constant has
 * to be changed in a commit, next to this comment, by someone who has read the
 * ruling.
 */
export const COLLECTION_AUTHORISED = false as boolean;

/**
 * The fail-closed decision, and the only function any future emitter may call.
 *
 * Two independent conditions, deliberately not collapsed into one: the
 * platform-wide authorisation, and the per-event basis. Answering O17 does not
 * open the notification family, because that family is held by O12, and a single
 * flag would have opened both.
 */
export function basisPermitsCollection(event: EventSpec): boolean {
  if (event.basis === "not_established") return false;
  if (event.retention === "not_collected") return false;
  return true;
}

export function mayCollect(event: EventSpec): boolean {
  return COLLECTION_AUTHORISED && basisPermitsCollection(event);
}

/** Every property an event may carry, base set included. */
export function allowedPropertiesOf(event: EventSpec): readonly PropertyId[] {
  return [...BASE_PROPERTIES, ...event.allowed];
}

/** Lookup by id. Returns undefined rather than throwing, so a caller decides. */
export function findEvent(id: string): EventSpec | undefined {
  return EVENTS.find((e) => e.id === id);
}

/** Every event that serves a given measure. */
export function eventsForMeasure(measure: MeasureId): readonly EventSpec[] {
  return EVENTS.filter((e) => e.metrics.includes(measure));
}
