import { Icon } from "@/components/satkit";
import { missingChecks, weightLabel, type ListingQuality } from "@/lib/listingQuality";

// What is absent from a listing that already exists, said on the screen the
// lister owns it from.
//
// The model that names every gap has been in the repository since ADV-2 and was
// wired only into the creation path, so a lister who finished the Studio once
// never heard from it again. Measured on the published corpus, every row assesses
// as incomplete and the median row is missing six facts, which is not a corpus
// that needs a better ranking algorithm; it is a corpus nobody was ever told
// about.
//
// D24 governs the presentation. Quality is not verification, so there is no
// score badge, no band colour and no green here. This panel is a list of absent
// facts and the reason each one matters, in the lister's own language, and it is
// never rendered on a public surface.

export default function ListingCompleteness({ quality, ar }: { quality: ListingQuality; ar: boolean }) {
  const missing = missingChecks(quality);
  const applicable = quality.checks.filter((c) => c.state !== "not_applicable");
  const present = applicable.filter((c) => c.state === "present").length;

  const t = ar
    ? {
        head: "ما الذي ينقص هذا العرض",
        note: "هذه قائمة بالحقائق الغائبة عن عرضك، لا تقييم من سات. لا شيء هنا يظهر للزائر، ولا يمنح أي منها شارة التوثيق.",
        counted: `${present} من ${applicable.length} حقيقة مسجّلة`,
        none: "لا شيء. كل حقيقة يمكن أن يحملها هذا العرض مسجّلة.",
        clash: "لا يمكن أن يصحّ هذان معاً",
      }
    : {
        head: "What this listing is missing",
        note: "This is a list of facts absent from your listing, not an assessment by SAT. None of it is shown to a visitor and none of it grants the Verified badge.",
        counted: `${present} of ${applicable.length} facts on file`,
        none: "Nothing. Every fact this listing can carry is on file.",
        clash: "These cannot both be true",
      };

  return (
    <div>
      <div className="row gap8" style={{ alignItems: "center", marginBottom: 6 }}>
        <span className="muted" style={{ display: "inline-flex" }}><Icon.info size={15} /></span>
        <span style={{ fontSize: "0.90625rem", fontWeight: 700 }}>{t.head}</span>
        <span className="mono muted" style={{ fontSize: "0.71875rem" }}>{t.counted}</span>
      </div>

      {quality.contradictions.length > 0 && (
        <div style={{ border: "1px solid var(--silver)", borderRadius: 6, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: "0.78125rem", fontWeight: 600 }}>{t.clash}</div>
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, fontSize: "0.75rem", lineHeight: 1.7 }}>
            {quality.contradictions.map((c) => (
              <li key={c.kind + c.fields.join()}>{ar ? c.statement_ar : c.statement_en}</li>
            ))}
          </ul>
        </div>
      )}

      {missing.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.78125rem", lineHeight: 1.7, marginTop: 10 }}>{t.none}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 10 }}>
          {missing.map((c) => (
            <li key={c.key}>
              <div style={{ fontSize: "0.8125rem" }}>
                {ar ? c.label_ar : c.label_en}
                <span className="muted" style={{ fontSize: "0.71875rem" }}> · {weightLabel(c.weight, ar)}</span>
              </div>
              <div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, marginTop: 2 }}>{ar ? c.why_ar : c.why_en}</div>
            </li>
          ))}
        </ul>
      )}

      <div className="muted" style={{ fontSize: "0.71875rem", lineHeight: 1.6, marginTop: 14, borderTop: "1px solid var(--silver)", paddingTop: 12 }}>{t.note}</div>
    </div>
  );
}
