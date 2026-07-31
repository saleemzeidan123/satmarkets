// ADV-1C. The runtime Evidence Passport: the producer that turns a passport plus
// a rights row into the one object a public surface is allowed to render.
//
// WHY THIS MODULE EXISTS AT ALL.
//
// `evidence.ts` shipped complete and dormant. It carries the passport type, the
// derivations and `publishability`, and nothing in `src/app` ever built one, so
// the honesty spine existed as a design rather than as a thing a reader could
// see. Codex boundary 3 rules that types, utilities and components are not a
// package: at least the agreed high-value public surfaces must construct and
// render a passport from actual permitted data in both languages. This is the
// construction half. `components/EvidencePassport.tsx` is the rendering half.
//
// WHY IT IS A SEPARATE TYPE AND NOT JUST THE PASSPORT.
//
// Two reasons, and each is a rule rather than a convenience.
//
// The first is completeness. Codex boundary 4 lists eleven things the passport
// must preserve, and four of them are not on `EvidencePassport`: the source
// owner, the asset type, the export permission and the AI-use permission. Three
// of those four live on `SourceRights` instead, because they are properties of
// the licence rather than of the figure. So the object a surface renders is a
// JOIN of the two, and the join has to happen somewhere that is not a page.
//
// The second is separation. Codex boundary 6: never expose an internal source
// record, confidential URL, contributor identity or restricted field simply
// because it exists in the passport object. `SourceRights` carries three fields
// that must never reach a reader, and one of them says so in its own doc
// comment: `denialReason` quotes internal licence reasoning, and `stopCondition`
// and `reviewedNote` are recorded in one language only, so rendering either
// would put English text on the Arabic page. `PublicEvidenceView` therefore has
// no field they could travel in. The separation is structural: a page cannot
// leak what the type it receives cannot hold.
//
// `/sources` already keeps those three omissions and states them in public. This
// module is that same rule applied per figure rather than per source.
//
// WHAT THE LIVE REGISTER SAYS TODAY, AND WHY IT SHAPES THE DEFAULT.
//
// CORRECTED AT ADV-1C.1. The ADV-1C note here said "there is no external source
// rights row in production". That was wrong, and the reason it was wrong is
// finding 88: the loader collapsed four different outcomes into one empty map,
// and `/sources` printed one sentence for all of them, so "the read returned
// nothing to this reader" was read as "nothing is recorded".
//
// What the evidence actually supports. The rights ledger migration writes nine
// reviewed rows into `public.source_registry` and records that it was applied to
// production. On the same deployed preview, `/en/rent-index` reads
// `rent_index_published` through the same anon client and returns rows, while
// `/en/sources` returns none. Supabase is configured, reachable and readable;
// `source_registry` specifically returns nothing to the public runtime, which is
// what row-level security with no SELECT policy produces: HTTP 200, no error,
// zero rows. Whether the register holds nothing or shows this reader nothing is
// not something the response can tell us, and we do not guess.
//
// What that means for this module is unchanged, and deliberately so. The public
// runtime cannot read a rights row, so every `tier: "sourced"` passport resolves
// to `permission_unrecorded` today, and the only figures that can lawfully carry
// a public passport are the exchange's own: entered by a lister, verified by
// SAT, or computed by SAT from those. The correction is to the STATEMENT, not to
// the behaviour: an unreadable register and an empty one deny identically, and
// they must, because the alternative is publishing on the strength of a silence.
//
// Owner ruling 7 and Codex boundary 10 both point the same way: no gated feature
// is enabled before the permission exists, and no missing evidence is filled
// with generated wording or an inferred figure.

import {
  type CorrectionEntry,
  type EntityKind,
  type EvidencePassport,
  type Freshness,
  type PublishContext,
  type StatisticKind,
  type Transformation,
  type VerificationDimension,
  type VerificationState,
  anyVerified,
  freshnessOf,
  isRetracted,
  latestCorrection,
  publishability,
  verificationStateOf,
} from "./evidence";
import { effectivePolicy } from "./sourceRights";
import type { SourceRights, UsePolicy } from "./sourceRights";

// ---------------------------------------------------------------------------
// The states a figure can be in
// ---------------------------------------------------------------------------

/**
 * Codex boundary 10, as a closed union rather than as a set of intentions.
 *
 * Every one of these is a real position a figure can be in, and none of them is
 * a blank. A surface that receives `empty` says we do not hold it; a surface
 * that receives `restricted` says we hold it and may not show it here. Those are
 * different sentences and a reader deserves the right one.
 *
 *   held                  sourced or checked within a defined scope, nothing qualifying it
 *   empty                 not supplied: we do not hold this
 *   retracted             the latest correction withdrew it, so there is no value to show
 *   restricted            access restricted: a rights row exists and its policy denies this audience
 *   permission_unrecorded no rights row could be read, so permission is not established
 *   insufficient          the sample behind it does not support a figure
 *   check_unavailable     a check was recorded and its outcome is not known to us
 *   unverified            supplied to us and shown as supplied, not independently checked
 *   stale                 past the tolerance the field itself declares
 *   corrected             shown, with a correction history a reader can see
 *   derived               SAT changed it: aggregated, derived or modelled, never as published
 *
 * ADV-1C.1 correction 5. Codex named seven things a reader must be able to tell
 * apart and ruled that they must not collapse into one generic unavailable
 * state. Each now has its own member:
 *
 *   not supplied                          -> empty
 *   supplied but not independently verified -> unverified
 *   verification unavailable              -> check_unavailable
 *   stale                                 -> stale
 *   insufficient                          -> insufficient
 *   access restricted                     -> restricted
 *   sourced and verified within a scope   -> held
 *
 * `unavailable` was renamed to `permission_unrecorded` in the same pass. It was
 * the only member of this union whose name described how it feels to a reader
 * rather than what it says, and "unavailable" is the exact word Codex ruled must
 * stop standing in for several different facts. It is a statement about a
 * MISSING PERMISSION RECORD and about nothing else: not about the figure, not
 * about the source, and not about whether we hold the value.
 */
export type EvidenceState =
  | "held"
  | "empty"
  | "retracted"
  | "restricted"
  | "permission_unrecorded"
  | "insufficient"
  | "check_unavailable"
  | "unverified"
  | "stale"
  | "corrected"
  | "derived";

/**
 * Precedence, most disqualifying first. A figure is often several of these at
 * once (stale AND corrected AND derived is ordinary), so the view carries the
 * full set in `states` and the one a compact indicator should say in `state`.
 */
const STATE_ORDER: readonly EvidenceState[] = [
  "retracted",
  "empty",
  "restricted",
  "permission_unrecorded",
  "insufficient",
  // The two checking states sit below the five that withhold a figure and above
  // the three that qualify a shown one, because they are neither: the value is
  // shown, and what is missing is our own check rather than the value or the
  // right to display it.
  "check_unavailable",
  "unverified",
  "stale",
  "corrected",
  "derived",
  "held",
];

const STATE_LABEL: Record<EvidenceState, [string, string]> = {
  held: ["Evidence held", "الدليل متوفر"],
  empty: ["Not supplied", "لم تُقدَّم"],
  retracted: ["Withdrawn", "مسحوب"],
  restricted: ["Not shown here", "غير معروض هنا"],
  permission_unrecorded: ["Permission not recorded", "الإذن غير مسجّل"],
  insufficient: ["Sample not sufficient", "العينة غير كافية"],
  check_unavailable: ["Check unavailable", "التحقق غير متاح"],
  unverified: ["Shown as supplied", "معروضة كما قُدِّمت"],
  stale: ["Out of date", "غير محدّث"],
  corrected: ["Corrected", "مصحّح"],
  derived: ["Derived by SAT", "اشتقّته سات"],
};

export function evidenceStateLabel(s: EvidenceState, ar: boolean): string {
  return STATE_LABEL[s][ar ? 1 : 0];
}

/**
 * One sentence per state, for the detail panel. Written as an answer to "why
 * does it say that", because the compact indicator is a label and a label on its
 * own is the thing this package exists to stop shipping.
 */
const STATE_NOTE: Record<EvidenceState, [string, string]> = {
  held: [
    "We hold this value and the record behind it supports showing it here.",
    "نحتفظ بهذه القيمة، والسجل الذي خلفها يسمح بعرضها هنا.",
  ],
  empty: [
    "This was not supplied to us, so we do not hold it. Nothing is estimated in its place.",
    "لم تُقدَّم إلينا هذه القيمة فلا نحتفظ بها، ولا نضع تقديراً مكانها.",
  ],
  retracted: [
    "A correction withdrew this value, so it is no longer stated. The record of the withdrawal stays.",
    "سحب تصحيحٌ هذه القيمة، فلم تعد معروضة. ويبقى سجل السحب قائماً.",
  ],
  restricted: [
    "The permission recorded for this source does not cover showing the value to this audience.",
    "الإذن المسجّل لهذا المصدر لا يشمل عرض القيمة لهذه الفئة.",
  ],
  permission_unrecorded: [
    "No permission record could be read for this source, so the value is not shown. This says nothing about the source or the value: an unread permission is simply not a permission.",
    "تعذّرت قراءة سجل الإذن لهذا المصدر، فلم تُعرض القيمة. ولا يقول هذا شيئاً عن المصدر ولا عن القيمة، فالإذن غير المقروء ليس إذناً.",
  ],
  check_unavailable: [
    "A check was recorded for this and its outcome is not known to us. That is a gap in our checking, not a finding about the value.",
    "سُجّل فحص لهذه القيمة ولا نعرف نتيجته. وهذا نقص في فحصنا لا حكم على القيمة.",
  ],
  unverified: [
    "This was supplied to us and is shown as supplied. We have not matched it against an independent record, and we do not present it as checked.",
    "قُدِّمت إلينا هذه القيمة وتُعرض كما قُدِّمت. ولم نطابقها مع سجل مستقل، ولا نقدّمها على أنها مُتحقَّق منها.",
  ],
  insufficient: [
    "The records behind this do not amount to a figure, so no figure is stated.",
    "السجلات التي خلف هذه القيمة لا تكفي لإصدار رقم، فلم يُذكر رقم.",
  ],
  stale: [
    "This is past the age this kind of value stays true for. It is shown with its date rather than withdrawn.",
    "تجاوزت هذه القيمة العمر الذي تبقى فيه صحيحة لهذا النوع. وتُعرض بتاريخها بدل حجبها.",
  ],
  corrected: [
    "This value was corrected. The previous display and the reason are kept on the record.",
    "صُحّحت هذه القيمة، ويُحفظ ما كان معروضاً سابقاً وسبب التصحيح في السجل.",
  ],
  derived: [
    "SAT produced this from other records rather than republishing a figure someone else published.",
    "أنتجت سات هذه القيمة من سجلات أخرى، لا بإعادة نشر رقم نشره غيرنا.",
  ],
};

export function evidenceStateNote(s: EvidenceState, ar: boolean): string {
  return STATE_NOTE[s][ar ? 1 : 0];
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * `UsePolicy` plus the one value a licence ledger cannot express: not recorded.
 *
 * The distinction is the whole point. `none` is a decision someone made and
 * wrote down. `unknown` is the absence of a decision, and reporting it as `none`
 * would credit us with a caution we did not exercise, while reporting it as
 * permitted would be the fabrication this package exists to prevent.
 */
export type PermissionValue = UsePolicy | "unknown";

export type EvidencePermissions = {
  /** May the value be displayed to this audience at all. */
  display: PermissionValue;
  /** May a reader take it out of the platform, in a decision pack or an export. */
  export: PermissionValue;
  /** May it be retrieved into an assistant answer. */
  aiUse: PermissionValue;
};

const PERMISSION_LABEL: Record<PermissionValue, [string, string]> = {
  public: ["Permitted", "مسموح"],
  internal: ["Internal only", "داخلي فقط"],
  none: ["Not permitted", "غير مسموح"],
  unknown: ["Not recorded", "غير مسجّل"],
};

export function permissionLabel(v: PermissionValue, ar: boolean): string {
  return PERMISSION_LABEL[v][ar ? 1 : 0];
}

/**
 * What SAT may say about its own records.
 *
 * Display is public because the lister filed the space on the exchange to be
 * seen, and SAT verified or computed against that filing. Export and AI use are
 * NOT public and are not `none` either: no clause covering bulk export of a
 * lister's own figures, or their use as model input, is recorded anywhere in the
 * lister terms today. That gap is a real one and it is stated as a gap. When the
 * owner records the clause, this constant changes and every first-party passport
 * on the platform changes with it, which is the reason it is one constant.
 */
export const FIRST_PARTY_PERMISSIONS: EvidencePermissions = {
  display: "public",
  export: "unknown",
  aiUse: "unknown",
};

// ---------------------------------------------------------------------------
// Source identity
// ---------------------------------------------------------------------------

/**
 * The owner behind a registered source id, in both languages.
 *
 * Boundary 4 asks the passport to preserve "source owner and permitted source
 * reference". The reference is the source id, which is already public on
 * `/sources`. The owner is the body that published the data, and it is a name,
 * so it needs both languages or it breaks parity on the Arabic page.
 *
 * ADV-1C.1 correction 2: this table used to be declared here, a second hand
 * written list of the same nine ids `/sources` declared separately. Both now
 * read the one catalogue. Re-exported rather than re-pointed at every call site
 * because the passport is what a reader sees the name in, so this module is
 * where a reader of the code expects to find it.
 */
export { sourceOwnerLabel } from "./sources/catalogue";
import { sourceOwnerLabel } from "./sources/catalogue";

export type PublicSourceRef = {
  /** The registered id, which is already public on /sources. */
  id: string;
  /** The body that published it. */
  owner: string;
};

// ---------------------------------------------------------------------------
// The public view
// ---------------------------------------------------------------------------

/**
 * Everything a public surface may know about one figure, and nothing else.
 *
 * The eleven things Codex boundary 4 requires the passport to preserve are all
 * here: source owner and reference (`source`), reporting period (`period`),
 * geography and entity kind (`geography`, `subjectKind`), asset type and unit
 * (`assetType`, `unit`), statistic type (`statistic`), the transformation SAT
 * performed (`transformation`), sample sufficiency (`states` carries
 * `insufficient`, `sufficiency` carries the value), freshness and last update
 * (`freshness`, `asOf`), correction history (`corrections`), exact verification
 * scope (`verification`) and the three permissions (`permissions`).
 *
 * What is NOT here is the point of the type: no `denialReason`, no
 * `stopCondition`, no `reviewedNote`, no rights row, no contributor, no internal
 * identifier beyond the subject id the URL already carries.
 */
/**
 * A correction as a reader may receive it.
 *
 * `CorrectionEntry` also carries `actorRole`, which this type does not. A role
 * is not a name, but boundary 6 is a rule about the shape of the object a page
 * is handed, not about how careful the page is: the separation only holds if
 * the field is absent, because a field that is present is a field some future
 * surface renders. Who filed a correction is an internal audit fact, and the
 * public sentence is what changed, when, and what was shown before.
 */
export type PublicCorrection = {
  at: string;
  kind: CorrectionEntry["kind"];
  reason: CorrectionEntry["reason"];
  reasonLang?: "en" | "ar" | null;
  previousDisplay?: string | null;
};

export type PublicEvidenceView = {
  /** The machine field name, so a correction and a log line name the same thing. */
  field: string;
  /** The value to display, or null. Null is a state, never a blank. */
  value: string | null;
  unit: string | null;

  subjectKind: EntityKind | null;
  assetType: string | null;

  tier: EvidencePassport["tier"];
  statistic: StatisticKind;
  transformation: Transformation;
  sufficiency: EvidencePassport["sufficiency"];

  period: string | null;
  geography: string | null;
  asOf: string | null;
  freshness: Freshness;

  source: PublicSourceRef | null;
  permissions: EvidencePermissions;

  verification: readonly { dimension: VerificationDimension; state: VerificationState; checkedAt: string | null }[];
  corrections: readonly PublicCorrection[];

  /** The one state a compact indicator should say. */
  state: EvidenceState;
  /** Every state that applies, most disqualifying first. */
  states: readonly EvidenceState[];
};

export type PublicViewContext = {
  /** The entity kind of the page the figure would appear on. */
  pageKind: EntityKind;
  /**
   * Rights row for the passport's source id, or null when none could be read.
   *
   * Null and "a row that denies" are deliberately different inputs, because they
   * are different sentences to a reader: one says we have no permission record,
   * the other says the permission we have does not cover this.
   */
  rights?: SourceRights | null;
  now: number;
};

/**
 * Build the object a public surface renders.
 *
 * The audience is fixed to "public" and is not a parameter. A caller that could
 * pass "internal" could pass it from a public page, and the one thing this type
 * exists to guarantee is that what it holds is safe to render to anyone. The
 * internal view is a separate function with a separate type, so the two cannot
 * be confused at a call site.
 */
export function publicEvidenceView(
  p: EvidencePassport,
  ctx: PublicViewContext
): PublicEvidenceView {
  const pub: PublishContext = {
    pageKind: ctx.pageKind,
    audience: "public",
    rights: ctx.rights,
    now: ctx.now,
  };
  const decision = publishability(p, pub);
  const fresh = freshnessOf(p, ctx.now);
  const sourced = p.tier === "sourced";

  // Permissions. A first-party record answers from the one constant; a sourced
  // record answers from its licence and from nothing else.
  let permissions: EvidencePermissions;
  if (!sourced) {
    permissions = FIRST_PARTY_PERMISSIONS;
  } else if (!ctx.rights || ctx.rights.sourceId !== p.sourceId) {
    permissions = { display: "unknown", export: "unknown", aiUse: "unknown" };
  } else {
    // Finding 89. These used to be the raw policy columns, and a raw column is
    // not what applies. `rights_status` places a downward ceiling on every one
    // of them, so a row reading `redisplay_policy = 'public'` at
    // `rights_status = 'asserted_unverified'` effectively permits internal use
    // only. Reporting the column would have printed "Permitted" beside a value
    // that `publishability` had already withheld for exactly that reason, and
    // it would have kept `restricted` out of the state set below, leaving the
    // reader with a permission, a blank, and no explanation of either.
    //
    // `effectivePolicy` is the same computation the enforcement path runs, so
    // what is shown and what is applied can no longer disagree.
    const asPublished = p.transformation === "as_published" || p.transformation === "unit_converted";
    permissions = {
      display: effectivePolicy(ctx.rights, asPublished ? "redisplay" : "derived_display"),
      export: effectivePolicy(ctx.rights, "export"),
      aiUse: effectivePolicy(ctx.rights, "ai_retrieval"),
    };
  }

  // Source identity. Named only when the figure is actually shown.
  //
  // `/sources` states the rule this follows: no licensor is named on a
  // prohibited row, because naming them republishes the term being respected. A
  // denied sourced figure therefore carries no source block at all, and the
  // state says why without saying who.
  const source: PublicSourceRef | null =
    sourced && p.sourceId && decision.allowed
      ? { id: p.sourceId, owner: sourceOwnerLabel(p.sourceId, false) }
      : null;

  const states = statesOf(p, ctx, decision.allowed, fresh, permissions);

  return {
    field: p.field,
    // A value that may not be shown is not carried in the object that renders
    // it. Boundary 6 as a data shape: a page cannot leak a figure it never got.
    value: decision.allowed ? p.value : null,
    unit: p.unit ?? null,
    subjectKind: p.subjectKind,
    assetType: p.assetType ?? null,
    tier: p.tier,
    statistic: p.statistic,
    transformation: p.transformation,
    sufficiency: p.sufficiency,
    period: p.period ?? null,
    geography: p.geography ?? null,
    asOf: p.asOf ?? null,
    freshness: fresh,
    source,
    permissions,
    verification: (p.verification ?? []).map((r) => ({
      dimension: r.dimension,
      state: verificationStateOf(r),
      checkedAt: r.checkedAt ?? null,
    })),
    // Rebuilt field by field rather than passed through. A spread would carry
    // `actorRole` and anything a future `CorrectionEntry` gains, which is how a
    // structural separation quietly stops being one.
    corrections: (p.corrections ?? []).map((c) => ({
      at: c.at,
      kind: c.kind,
      reason: c.reason,
      reasonLang: c.reasonLang ?? null,
      previousDisplay: c.previousDisplay ?? null,
    })),
    state: states[0],
    states,
  };
}

/**
 * The Arabic reading of the same view. Only the two name fields differ, because
 * everything else on the type is either a code the renderer labels or a value
 * already formatted by the caller in its own locale.
 */
export function localiseSource(v: PublicEvidenceView, ar: boolean): PublicEvidenceView {
  if (!ar || !v.source) return v;
  return { ...v, source: { ...v.source, owner: sourceOwnerLabel(v.source.id, true) } };
}

/**
 * The states that are, on their own, a reason a figure is not stated. Used to
 * answer the last question below: the decision denied, and did anything already
 * in the set explain why.
 */
const DISQUALIFYING: readonly EvidenceState[] = [
  "retracted",
  "empty",
  "restricted",
  "permission_unrecorded",
  "insufficient",
];

// The two checking states are deliberately NOT in that list. Neither withholds a
// figure: `unverified` says the value is shown as it was supplied, and
// `check_unavailable` says our own check has no recorded outcome. Adding either
// here would make a shown figure look like a withheld one, which is precisely
// the confusion Codex correction 5 is about.

/**
 * The verification dimensions that are a check on the VALUE.
 *
 * `measurement` is an area someone measured. `document` is a figure evidenced by
 * a filed document. Everything else in `VerificationDimension` is a check on the
 * party, the filing or the right to advertise, and none of those makes a number
 * true. Kept as an explicit list rather than an exclusion so that a dimension
 * added tomorrow is unverifying by default: a new check has to be argued into
 * this list, not out of it.
 */
const VALUE_DIMENSIONS: readonly VerificationDimension[] = ["measurement", "document"];

function statesOf(
  p: EvidencePassport,
  ctx: PublicViewContext,
  allowed: boolean,
  fresh: Freshness,
  permissions: EvidencePermissions
): readonly EvidenceState[] {
  const set = new Set<EvidenceState>();

  // The record's own condition, each judged on its own terms.
  if (isRetracted(p)) set.add("retracted");
  if (p.value === null || p.value === undefined) set.add("empty");
  if (p.sufficiency !== "sufficient") set.add("insufficient");
  if (fresh === "stale") set.add("stale");
  if (!isRetracted(p) && latestCorrection(p.corrections)) set.add("corrected");
  if (p.transformation === "aggregated" || p.transformation === "derived" || p.transformation === "modelled") {
    set.add("derived");
  }

  // Permission, read from the licence rather than inferred from the outcome.
  //
  // This distinction is the whole reason the two are computed separately. An
  // insufficient sample from a source whose licence permits everything is not a
  // restricted figure, and saying so would blame a licensor for a decision SAT
  // made about its own sample. The two denials a reader must also be able to
  // tell apart are here: no readable row is "permission not established", a
  // readable row that says no is "permission refused".
  if (p.tier === "sourced") {
    if (!ctx.rights || ctx.rights.sourceId !== p.sourceId) set.add("permission_unrecorded");
    else if (permissions.display !== "public") set.add("restricted");
  }

  // Checking, which is a different question from permission and from sample.
  //
  // Codex correction 5 asks that "supplied but not independently verified" and
  // "verification unavailable" stop being read as the same thing, and that
  // neither be read as the platform having tried to verify and failed.
  //
  // Only checks on the FIGURE count here, which is a narrower set than the
  // records a passport carries. `listingEvidence.ts` attaches the filing checks
  // to every figure on a listing and says in its own comment that they are not a
  // check on the number: ownership, authorisation, the right to market and the
  // advertising permit are facts about the party who filed, not about the value
  // they filed. Reading them as checks on the value would clear an unmeasured
  // area as verified because its lister proved they own the building, which is
  // the exact conflation the per-field passport exists to end.
  const checks = (p.verification ?? []).filter((r) => VALUE_DIMENSIONS.includes(r.dimension));

  // `check_unavailable` reads the STORED state rather than the resolved one.
  // `verificationStateOf` demotes a stored `unknown` to `not_verified`, which is
  // the right resolution for deciding whether to claim a check but the wrong
  // input for describing one: it turns "we do not know the outcome" into "it did
  // not pass". A seeded record is excluded because a fixture is not an attempted
  // check, and it is already answered by `unverified` below.
  if (checks.some((r) => r.isDemo !== true && r.state === "unknown")) set.add("check_unavailable");

  // `unverified` is a statement about a value someone gave us. A computed or
  // sourced figure is not "supplied to us", so the state would be a category
  // error there: what those two carry instead is `derived` and a source.
  if (p.tier === "entered" && !anyVerified(checks)) set.add("unverified");

  // A denial with nothing above it to account for it. Subject mismatch, an
  // unlabelled statistic and a missing period all land here. The honest summary
  // is that we do not hold this as a fact on this page, which is what empty
  // says, rather than a state that would blame the source or the sample.
  if (!allowed && !DISQUALIFYING.some((s) => set.has(s))) set.add("empty");

  if (set.size === 0) set.add("held");
  return STATE_ORDER.filter((s) => set.has(s));
}
