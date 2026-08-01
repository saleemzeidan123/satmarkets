// PKG-ELITE-E1 slice F. Codex item 6, second half: the initial product scorecard.
//
// WHAT A SCORECARD IS FOR HERE.
//
// SAT Markets is at stage E0 with six requirements and zero registered interest.
// Codex's ruling that the next highest-value action is not another product
// surface rests on exactly that pair of numbers, and the pair was assembled by
// hand. This module is the attempt to make the next such ruling cheaper to make
// and harder to make wrongly.
//
// THE THING THIS FILE REFUSES TO DO.
//
// There is no target in it. Not one. A target invented before a baseline exists
// is a figure with no source, which is the same defect the platform spends most
// of its gates preventing on the public side, and it does not become acceptable
// because the audience is internal. Every `baseline` field says the same thing
// and says it in a typed way rather than in prose that could be skimmed past:
// the first measurement comes from the ELITE-1 design-partner round, and until
// that round runs, each of these twelve is a definition rather than a number.
//
// The definitions are the deliverable. Agreeing what "independent completion"
// means before anyone has an incentive for it to mean something convenient is
// most of the value, and it is the part that is impossible to do honestly later.
//
// WHAT EACH MEASURE CARRIES.
//
// Alongside the formula, two fields that are usually left out and are usually
// the reason a scorecard degrades: `decision`, which names what changes if the
// number moves, and `distortion`, which names the cheapest way to make the
// number look good without the product being better. A measure with no decision
// attached is a number kept for its own sake. A measure with no known distortion
// has not been thought about for long enough.

import { EVENTS, MEASURE_IDS, type MeasureId } from "@/lib/analytics/events";

/** Where a measure's input comes from. Most are mixed, and saying so is the point. */
export type MeasureSource =
  /** First-party product events from the dictionary. */
  | "event"
  /** Computed from platform records, without any behavioural event. */
  | "record"
  /** Field or synthetic instrumentation of the delivered page. */
  | "runtime"
  /** A person reads something and writes down what they found. */
  | "manual";

export type Cadence = "continuous" | "weekly" | "per_release" | "per_research_round";

/**
 * O17 holds every behavioural input shut. This field says, per measure, what is
 * left when that is true, and the answer is the honest picture of where the
 * product's self-knowledge actually stands today.
 */
export type Computable = "yes" | "partial" | "no";

export type MeasureSpec = {
  readonly id: MeasureId;
  /** The plain question. If this cannot be stated in one sentence the measure is two measures. */
  readonly question: string;
  /** How it is computed, precisely enough that two people would produce the same number. */
  readonly definition: string;
  readonly unit: string;
  readonly sources: readonly MeasureSource[];
  /** Event ids from the dictionary. Empty where the measure is not behavioural. */
  readonly events: readonly string[];
  readonly cadence: Cadence;
  /** What this number causes somebody to do. */
  readonly decision: string;
  /** The cheapest way to move the number without improving anything. */
  readonly distortion: string;
  /** Always the same sentence today, and typed so that a later edit is visible in a diff. */
  readonly baseline: "not_established";
  readonly baselineNote: string;
  /** Whether this measure could be produced at this commit, with no event collection at all. */
  readonly computable: Computable;
  readonly computableNote: string;
};

const FIRST_ROUND =
  "No baseline exists. The first value comes from the ELITE-1 design-partner round, whose instrument is already written and whose recruitment is the outstanding dependency.";

export const SCORECARD: readonly MeasureSpec[] = [
  {
    id: "independent_listing_completion",
    computable: "partial",
    computableNote:
      "The finished-to-started ratio is derivable from listing records. Independence is not: nothing in the record says whether help was opened or a reviewer intervened, and independence is the part of the definition that matters.",
    question: "What share of people who start a listing finish one without help?",
    definition:
      "Listings reaching the tenant-ready state, divided by listings started, over the same cohort of starts. Independent means the listing reached that state with no help opened, no assist accepted and no SAT reviewer intervention. The helped share is reported beside it rather than folded into it, because a product that works only when explained is a different product from one that works.",
    unit: "Share of starts, reported with its denominator.",
    sources: ["event", "record"],
    events: [
      "listing_draft_started",
      "listing_step_saved",
      "listing_validation_failed",
      "listing_completed",
      "listing_abandoned",
      "listing_publication_readiness_evaluated",
      "missing_fact_shown",
      "missing_fact_explanation_opened",
      "missing_fact_resolved",
      "media_added",
      "media_upload_failed",
      "media_standard_met",
      "map_pin_placed",
    ],
    cadence: "weekly",
    decision:
      "A low rate with a concentrated stall step is a Listing Studio change. A low rate spread evenly across steps is a scope problem, meaning the product asks for more than a lister can supply, and the answer is fewer required facts rather than better forms.",
    distortion:
      "Lowering the completeness bar. The rate rises the same day and nothing improves, which is why the tenant-ready definition lives in `listingQuality.ts` under its own tests and is not a dial on this dashboard.",
    baseline: "not_established",
    baselineNote: FIRST_ROUND,
  },
  {
    id: "time_to_tenant_ready",
    computable: "no",
    computableNote:
      "The record carries the current completeness state, not the moment it was first reached, so the clock has no stop time until an event marks one.",
    question: "How long does it take to get one commercial listing to the state a tenant can act on?",
    definition:
      "Median and interquartile range of elapsed working time between the first draft save and the first tenant-ready state, counted in banded working time rather than wall-clock so that a listing left overnight is not read as a nine-hour task. Median and average are reported as distinct figures and never as one number.",
    unit: "Banded elapsed working time, median with interquartile range.",
    sources: ["event", "record"],
    events: ["listing_draft_started", "listing_step_saved", "listing_completed", "listing_published", "missing_fact_resolved", "media_standard_met", "listing_publication_readiness_evaluated"],
    cadence: "weekly",
    decision:
      "This is the number a landlord asks about before agreeing to move an inventory across. A long tail matters more than the median for that conversation, so the range is reported first.",
    distortion:
      "Measuring only the listings that finished. A product where half the starts are abandoned can post an excellent median, so this measure is never read without independent listing completion beside it.",
    baseline: "not_established",
    baselineNote: FIRST_ROUND,
  },
  {
    id: "search_task_success",
    computable: "no",
    computableNote:
      "Search leaves no trace in any record by design. This measure exists only if the events exist.",
    question: "Can somebody find a space that fits what they came for?",
    definition:
      "Share of search sessions that reach an opened result or a saved search, with zero-result rate and refinement count reported alongside. A session that refines repeatedly and opens nothing is counted as a failure even though every request succeeded.",
    unit: "Share of search sessions, with zero-result rate and median refinements.",
    sources: ["event"],
    events: ["search_run", "search_refined", "search_result_opened", "search_saved", "comparison_opened"],
    cadence: "weekly",
    decision:
      "A high zero-result rate against a small inventory is a supply problem and not a search problem, and the two are distinguished by whether the facets used were satisfiable at all. That distinction decides whether the next package is matching or acquisition.",
    distortion:
      "Counting a request rather than a task. Every search request succeeds; the question is whether the person found anything, which is why the numerator is an opened result and not a rendered page.",
    baseline: "not_established",
    baselineNote: FIRST_ROUND,
  },
  {
    id: "requirement_completion",
    computable: "partial",
    computableNote:
      "Started and matchable are both states on the requirement record, so the ratio is computable. Which field group precedes abandonment is not.",
    question: "Can an occupier express what they need in a form the platform can act on?",
    definition:
      "Requirements reaching the matchable state divided by requirements started, with the field group that most often precedes abandonment reported beside it.",
    unit: "Share of starts, reported with its denominator.",
    sources: ["event", "record"],
    events: ["requirement_started", "requirement_field_group_completed", "requirement_completed", "requirement_abandoned"],
    cadence: "weekly",
    decision:
      "This is the demand-side half of the evidence Codex said does not yet exist. Six requirements is a number too small to divide, and the first honest value of this measure is the point at which demand-loop work becomes justifiable.",
    distortion:
      "Accepting a thinner requirement as matchable. That raises this number and lowers match relevance, so the two are always read together and the matchable definition stays in `matching.ts` under test.",
    baseline: "not_established",
    baselineNote: FIRST_ROUND,
  },
  {
    id: "match_relevance_progression",
    computable: "partial",
    computableNote:
      "Registered interests and viewing requests are records. Displayed and dismissed are not, so relevance is uncomputable and progression is computable across a denominator that is currently zero.",
    question: "Are the matches worth showing, and does anything happen after one?",
    definition:
      "Two figures kept together. Relevance is the share of displayed matches that are shortlisted or acted on rather than dismissed. Progression is the share of registered interests that reach a viewing request, a confirmed viewing or a request-for-proposal stage, counted only across stages SAT is authorised to observe.",
    unit: "Two shares, each with its denominator, plus the observed share of stages.",
    sources: ["event", "record"],
    events: ["match_displayed", "match_explanation_opened", "match_dismissed", "match_shortlisted", "match_interest_registered", "viewing_requested", "viewing_confirmed", "rfp_progressed", "decision_pack_generated"],
    cadence: "weekly",
    decision:
      "Relevance without progression means the matching is fine and the next step is missing. Progression without relevance means people are working around the matches. The two failures need opposite responses, which is why one number would be useless.",
    distortion:
      "Showing fewer, safer matches. Relevance rises, the product becomes less useful, and the only defence is reporting the count of matches displayed per requirement next to the rate.",
    baseline: "not_established",
    baselineNote: FIRST_ROUND,
  },
  {
    id: "evidence_comprehension",
    computable: "no",
    computableNote:
      "There is no comprehension prompt in the product yet, so there is nothing to compute from. This measure is entirely a design at this commit.",
    question: "Do people understand what a verification state means and what a figure rests on?",
    definition:
      "Share of comprehension prompts answered with the correct reading of the displayed verification state, reported by state, plus passport open rate per listing view and tier expansion depth. The prompt is consented and closed-form, so a declined prompt produces no row rather than a wrong one.",
    unit: "Share of answered prompts by verification state, plus open and expansion rates.",
    sources: ["event", "manual"],
    events: ["passport_opened", "passport_tier_expanded", "comprehension_prompt_shown", "comprehension_answered", "comparison_evidence_expanded", "match_explanation_opened", "missing_fact_explanation_opened"],
    cadence: "per_research_round",
    decision:
      "Evidence is the product's whole differentiation. A verified badge that people read as an advertisement rather than as a claim about a document is worse than no badge, and this is the measure that would catch it.",
    distortion:
      "Asking the prompt only of people who already opened a passport. That is the population most likely to answer correctly, so the open rate is reported as the denominator context and the prompt sampling is recorded with the answer.",
    baseline: "not_established",
    baselineNote:
      FIRST_ROUND + " The prompt itself is consented and is not collected at all until that consent surface exists.",
  },
  {
    id: "notification_opt_out_and_complaint",
    computable: "no",
    computableNote:
      "Nothing is sent, so nothing is opted out of. The correct current reading is no data because the feature is off, and that is different from a good rate.",
    question: "When SAT starts sending anything, does it become an irritation?",
    definition:
      "Opt-outs per thousand sends and complaints per thousand sends, per channel, with the consent state distribution reported beside them. Zero sends is reported as zero sends rather than as a perfect rate.",
    unit: "Rate per thousand sends, per channel.",
    sources: ["event"],
    events: ["notification_consent_prompted", "notification_consent_changed", "notification_suppressed", "notification_opted_out", "notification_complaint_received", "search_saved"],
    cadence: "weekly",
    decision:
      "This is the measure that should be able to stop a channel without a meeting. Until O12 is ruled the whole family is uncollected and every send is suppressed, so the honest current reading of this measure is that it has no data because the feature is off.",
    distortion:
      "Reporting a rate with a tiny denominator. One complaint against forty sends is not a twenty-five per thousand rate in any useful sense, so the denominator is reported and the rate is withheld below a minimum send count.",
    baseline: "not_established",
    baselineNote:
      FIRST_ROUND + " Held additionally by O12, which keeps every event in this family uncollected and every external send suppressed.",
  },
  {
    id: "unsupported_figure_incidents",
    computable: "partial",
    computableNote:
      "Gate rejections and manual review findings are already recorded and already counted. The Advisor grounding share is not, because no Advisor turn is instrumented.",
    question: "How often does a figure reach a person without traceable support?",
    definition:
      "Count of incidents in which a displayed figure could not be traced to an authorised source at the moment of display, from three inputs: Advisor turns where the grounding assertion failed, publication decisions where a withheld figure was nonetheless requested, and manual review findings. Reported as a count and never as a rate, because the acceptable number is zero and a rate implies a budget.",
    unit: "Count per week, with each incident individually attributable to a figure.",
    sources: ["event", "record", "manual"],
    events: ["advisor_grounded_result", "advisor_refusal"],
    cadence: "continuous",
    decision:
      "Any nonzero value stops the next package until the path is closed. This is the only measure on the scorecard with that property, and it has it because O10 fails closed and the whole rights model depends on that staying true.",
    distortion:
      "Counting only what the gate caught. The gate catching something is the system working; the incidents that matter are the ones found by a reader, which is why manual review is a declared input rather than a fallback.",
    baseline: "not_established",
    baselineNote:
      "The target is zero and it is not a baseline. Every recorded incident to date has been caught by a gate or a review rather than by a reader, and that record is what this measure continues.",
  },
  {
    id: "data_freshness",
    computable: "yes",
    computableNote:
      "Computable from published listing records today with no event collection at all. It is the only one of the twelve in that position.",
    question: "Is what the platform shows still true?",
    definition:
      "Median and ninetieth-percentile age of the availability state and the price state across published listings, plus the share of published listings whose last confirmation is older than the staleness threshold. Computed from records rather than from behaviour.",
    unit: "Age in days, median and ninetieth percentile, plus share past threshold.",
    sources: ["record", "event"],
    events: ["listing_published", "map_pin_placed"],
    cadence: "weekly",
    decision:
      "Freshness is the first thing that decays in a marketplace and the last thing anyone notices. Past the threshold, the response is a confirmation prompt to the lister rather than a badge change, because a stale listing is a lister problem and not a display problem.",
    distortion:
      "Touching records automatically. Any process that refreshes a timestamp without a human confirming the fact makes this measure meaningless, which is why the input is the confirmation event and not the row's update time.",
    baseline: "not_established",
    baselineNote:
      "Computable from records today without any event collection, and it is the one measure on this scorecard that O17 does not hold shut.",
  },
  {
    id: "accessibility_health",
    computable: "yes",
    computableNote:
      "Computable today by reading `docs/findings-register.md` and the ELITE-4 evidence table. It is manual, it is slow, and it is real.",
    question: "Is the platform usable without a mouse, without sight, and at four times zoom?",
    definition:
      "Open accessibility defects by severity from `docs/findings-register.md`, plus the share of the four core journeys that have been tested by each of the five evidence levels the ELITE-4 pass defined. A journey with zero open defects and zero independent testing is reported as untested rather than as healthy.",
    unit: "Open defect count by severity, plus coverage by evidence level.",
    sources: ["manual", "event"],
    events: ["listing_validation_failed"],
    cadence: "per_release",
    decision:
      "The count decides remediation priority. The coverage decides whether the count means anything, and today it means very little: 126 defects were found by one reader reading source, none were confirmed on a physical device and none by a specialist.",
    distortion:
      "Reading the open count as product health. Slice E raised the open count from 57 to 111 while fixing 48 severe defects, because looking finds things. A falling count with no pass behind it means nobody looked.",
    baseline: "not_established",
    baselineNote:
      "Findings 139 to 192 are the first entries. No independent WCAG conformance is claimed and none will be until a specialist has tested it.",
  },
  {
    id: "core_web_vitals",
    computable: "no",
    computableNote:
      "No field measurement exists and a laboratory run is not this measure.",
    question: "Is the delivered page fast enough to use on a phone on a weak network?",
    definition:
      "Largest contentful paint, interaction to next paint and cumulative layout shift at the seventy-fifth percentile, split by locale and by device class, measured on the delivered production pages. Split by locale because the Arabic build loads different fonts and a single figure would hide a parity failure.",
    unit: "Seventy-fifth percentile per metric, split by locale and device class.",
    sources: ["runtime"],
    events: [],
    cadence: "per_release",
    decision:
      "A regression blocks a release. Nothing else on this scorecard has a per-release cadence, and this does because performance regressions arrive with a deployment rather than with a behaviour change.",
    distortion:
      "Synthetic measurement on a fast connection from a nearby region. Laboratory figures are useful for catching a regression and are not the measure, which is why the source is field measurement of delivered pages and the laboratory run is a leading indicator only.",
    baseline: "not_established",
    baselineNote:
      "No field measurement exists. Collecting it is a first-party runtime measurement of the delivered page and falls under O17 with everything else, which is why it is defined here and not instrumented.",
  },
  {
    id: "ai_grounded_success_latency_cost",
    computable: "no",
    computableNote:
      "Held twice over: by O17 for the measurement and by the absent provider agreement for the thing being measured.",
    question: "Does the Advisor answer real questions, quickly, at a defensible cost?",
    definition:
      "Three figures reported together. Grounded success is the share of Advisor turns that produced a displayed answer with every figure traced to an authorised typed tool result. Latency is the seventy-fifth percentile banded turn time. Cost is the banded cost per grounded answer. Refusals are excluded from the failure count and reported separately.",
    unit: "Share of turns, banded latency percentile, banded cost per grounded answer.",
    sources: ["event"],
    events: ["advisor_grounded_result", "advisor_refusal", "advisor_retry", "advisor_failure"],
    cadence: "weekly",
    decision:
      "A rising refusal rate against a stable failure rate means the boundary is holding and the tool coverage is too narrow, which is a data-rights question rather than an engineering one. The two must not be summed into a single success rate or that distinction disappears.",
    distortion:
      "Counting a refusal as a failure, or counting an ungrounded answer as a success. The first understates the boundary working and would create pressure to weaken it. The second is the failure mode the boundary exists to prevent.",
    baseline: "not_established",
    baselineNote:
      FIRST_ROUND +
      " Held additionally by the provider agreement dependency, which keeps external processing off entirely under owner ruling 7.",
  },
];

/** Lookup by id. */
export function findMeasure(id: MeasureId): MeasureSpec | undefined {
  return SCORECARD.find((m) => m.id === id);
}

/**
 * The measures that could be produced at this commit if somebody asked for the
 * scorecard tomorrow, with no event collection and no ruling on O17.
 *
 * Two qualify in full and four in part. That is the useful fact, and it is the
 * reason this module ships before any instrumentation: a scorecard where ten of
 * twelve measures are held by an unanswered question is an accurate picture of
 * how little the product currently knows about itself, and rounding it up would
 * be exactly the flattering summary the rest of these gates exist to prevent.
 */
export function computableToday(): readonly MeasureId[] {
  return SCORECARD.filter((m) => m.computable === "yes").map((m) => m.id);
}

/** Measures with some record or manual input available now and the rest held by O17. */
export function partiallyComputableToday(): readonly MeasureId[] {
  return SCORECARD.filter((m) => m.computable === "partial").map((m) => m.id);
}

/** Every measure a given event feeds. */
export function measuresForEvent(eventId: string): readonly MeasureId[] {
  return MEASURE_IDS.filter((id) => {
    const m = findMeasure(id);
    return m ? m.events.includes(eventId) : false;
  });
}

/** Event ids named by the scorecard that do not exist in the dictionary. Should always be empty. */
export function unknownEventReferences(): readonly string[] {
  const known = new Set(EVENTS.map((e) => e.id));
  const out = new Set<string>();
  for (const m of SCORECARD) for (const e of m.events) if (!known.has(e)) out.add(e);
  return [...out].sort();
}
