import EvidencePassport from "@/components/EvidencePassport";
import type { PublicEvidenceView } from "@/lib/evidenceView";

// PKG-LISTING-CREATION-1A. The repeated "titled grid of label/value rows,
// with a footnote" card, extracted from listings/[id]/page.tsx, where it was
// written inline three times (the space section, the terms section, the
// compliance section) with the same structure and only the rows, the title
// and the footnote changing between them.
//
// Extracted for exactly one reason: the draft preview needs the identical
// rendering the public page gives these rows, and a second hand-written copy
// of this markup is a second place the two could drift apart on padding,
// grid breakpoints or the footnote's placement. It is not a general-purpose
// card component; it is this one card, used by the one page that had it and
// the one new surface that needs to match it.
//
// The public page still owns everything this component does not cover:
// the gallery, the header, JsonLd, location facts, similar listings. None of
// that moved, and none of it needed to for draft-preview parity.

export type AttributeSectionRow = {
  label: string;
  value: string;
  /** Present only for rows the public page also gives an Evidence Passport. */
  evidence?: PublicEvidenceView;
};

export default function ListingAttributeSection({
  title,
  rows,
  footnote,
  ar,
  locale,
}: {
  title: string;
  rows: readonly AttributeSectionRow[];
  footnote?: string;
  ar: boolean;
  locale: "en" | "ar";
}) {
  if (rows.length === 0) return null;
  return (
    <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 150px), 1fr))", gap: 14, marginTop: 12 }}>
        {rows.map((r, i) => (
          <div key={i}>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{r.label}</div>
            <div className="mono" style={{ fontSize: "0.9375rem", fontWeight: 500, marginTop: 6 }}>{r.value}</div>
            {r.evidence ? <EvidencePassport view={r.evidence} label={r.label} ar={ar} locale={locale} /> : null}
          </div>
        ))}
      </div>
      {footnote ? <div className="mono muted" style={{ fontSize: "0.65625rem", marginTop: 12 }}>{footnote}</div> : null}
    </div>
  );
}
