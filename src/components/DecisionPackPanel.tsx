import {
  decisionPack,
  packAsks,
  readinessLabel,
  stateLabel,
  comparabilityLabel,
  type PackListing,
  type PackCandidate,
  type PackReadiness,
} from "@/lib/decisionPack";

// ADV-2D. The decision pack, rendered.
//
// The comparison table above this panel does what every comparison table does: it puts
// figures side by side and lets the reader assume the columns mean the same thing. They
// often do not. One rent is quoted with a service charge inside it and one without; one
// area is net and one is gross and the record does not say which; one permit expired in
// March. A table that prints those four numbers in a row has not compared anything, it
// has arranged four numbers.
//
// So this panel states two things the table cannot. First, per shortlisted space, whether
// there is enough on the record to decide at all, and what is missing when there is not.
// Second, per comparison, whether the comparison may honestly be drawn across THIS set,
// and when it may not, the reason and the candidates that broke it.
//
// Every string here comes from src/lib/decisionPack.ts, which is a pure model with 29
// tests over it. Nothing is computed in this file. A surface that recomputed the verdict
// would eventually disagree with the model, and the disagreement would be invisible.
//
// Colour: harbor for a comparison that holds, amber for one withheld, slate for a caveat.
// Never green. Green states that evidence was checked, and "these two numbers may be
// subtracted" is not a verification of either of them.

const TONE: Record<PackReadiness, string> = {
  ready: "var(--harbor)",
  ask_first: "var(--amber)",
  not_ready: "var(--slate)",
};

export default function DecisionPackPanel({
  listings,
  titleOf,
  ar,
}: {
  listings: readonly PackListing[];
  // How to name a candidate in the reader's language. Kept as a callback because the
  // model holds ids and deliberately knows nothing about listing titles.
  titleOf: (id: string) => string;
  ar: boolean;
}) {
  if (!listings.length) return null;
  const pack = decisionPack(listings);
  const asks = packAsks(pack);

  const t = ar
    ? {
        head: "ما الذي يمكن مقارنته، وما الذي يجب سؤاله أولاً",
        sub: "المقارنة تُعرض حين تذكر كل مساحة ما تحتاجه المقارنة، وتُحجب مع ذكر السبب حين لا تفعل.",
        canCompare: "المقارنات",
        held: "محجوبة",
        excluded: "خارج المقارنة",
        limit: "حدّ المقارنة",
        candidates: "جاهزية كل مساحة",
        askHead: "اسأل المُعلن",
        askSub: "هذه الأسئلة مأخوذة من الحقول الناقصة أو التي مضى عليها وقت، لا من صياغة عامة.",
        counts: (c: PackCandidate) =>
          `${c.known} مثبتة · ${c.stated} مذكورة · ${c.stale} قديمة · ${c.unknown} غير مسجّلة`,
        spaces: "مساحة",
      }
    : {
        head: "What can be compared, and what must be asked first",
        sub: "A comparison is offered when every space states what the comparison needs, and withheld with its reason when one does not.",
        canCompare: "Comparisons",
        held: "Withheld",
        excluded: "Outside this comparison",
        limit: "Limit",
        candidates: "Readiness, space by space",
        askHead: "Ask the lister",
        askSub: "These questions come from the fields the record is missing or has let age, not from generic wording.",
        counts: (c: PackCandidate) =>
          `${c.known} confirmed · ${c.stated} stated · ${c.stale} aged · ${c.unknown} not on the record`,
        spaces: "spaces",
      };

  return (
    <section className="card" style={{ marginTop: 20, padding: 20, boxShadow: "var(--sh-1)" }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em", margin: 0 }}>{t.head}</h2>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: "6px 0 0", maxWidth: 640 }}>{t.sub}</p>

      {/* Comparisons: which hold across this set, which are withheld, and why. */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--slate)" }}>{t.canCompare}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {pack.comparisons.map((c) => (
            <div
              key={c.kind}
              className="card pad"
              style={{
                boxShadow: "none",
                border: "1px solid var(--silver)",
                background: c.comparable ? "var(--paper)" : "var(--status-attention-wash)",
              }}
            >
              <div className="row gap12 wrap" style={{ alignItems: "baseline" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{comparabilityLabel(c.kind, ar)}</span>
                {!c.comparable && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--amber)" }}>{t.held}</span>
                )}
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: "5px 0 0", color: "var(--ink)" }}>
                {ar ? c.reason_ar : c.reason_en}
              </p>
              {(ar ? c.caveat_ar : c.caveat_en) ? (
                <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: "5px 0 0" }}>
                  {t.limit}: {ar ? c.caveat_ar : c.caveat_en}
                </p>
              ) : null}
              {c.excluded_ids.length > 0 ? (
                <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: "5px 0 0" }}>
                  {t.excluded}: {c.excluded_ids.map(titleOf).join(ar ? "، " : ", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Readiness per candidate, with the state of every dimension the model emits. */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--slate)" }}>{t.candidates}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {pack.candidates.map((c) => (
            <div key={c.listing_id} className="card pad" style={{ boxShadow: "none", border: "1px solid var(--silver)" }}>
              <div className="row between wrap" style={{ alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{titleOf(c.listing_id)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: TONE[c.readiness] }}>
                  {readinessLabel(c.readiness, ar)}
                </span>
              </div>
              <div className="muted mono" style={{ fontSize: 11.5, marginTop: 4 }}>
                <bdi dir="ltr">{t.counts(c)}</bdi>
              </div>
              <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                {c.dimensions
                  .filter((d) => d.state !== "not_applicable")
                  .map((d) => (
                    <div key={d.kind} className="row gap12 wrap" style={{ alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 140 }}>{ar ? d.label_ar : d.label_en}</span>
                      <span className="muted" style={{ fontSize: 12, flex: 1, minWidth: 200, lineHeight: 1.55 }}>
                        {ar ? d.detail_ar : d.detail_en}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: d.state === "unknown" || d.state === "stale" ? "var(--amber)" : "var(--slate)",
                        }}
                      >
                        {stateLabel(d.state, ar)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The asks, deduplicated by wording across the shortlist. */}
      {asks.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--slate)" }}>{t.askHead}</div>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: "4px 0 0", maxWidth: 640 }}>{t.askSub}</p>
          <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, display: "grid", gap: 6 }}>
            {asks.map((a, i) => (
              <li key={`${a.kind}-${i}`} style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                {ar ? a.ask_ar : a.ask_en}{" "}
                <span className="muted">
                  ({a.listing_ids.length} {t.spaces})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
