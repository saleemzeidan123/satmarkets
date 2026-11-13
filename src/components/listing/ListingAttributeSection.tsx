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
    /* PKG-DESIGN-4. A titled section on the page's own hairline grid rather
       than a card inside a card, with the same cells as the facts grid above. */
    <section className="fx-section">
      <h2 className="serif ld-h2">{title}</h2>
      <div className="fx-grid">
        {rows.map((r, i) => (
          <div key={i} className="fx-cell">
            <div className="fx-k">{r.label}</div>
            <div className="fx-v">{r.value}</div>
            {r.evidence ? <EvidencePassport view={r.evidence} label={r.label} ar={ar} locale={locale} /> : null}
          </div>
        ))}
      </div>
      {footnote ? <p className="fx-foot">{footnote}</p> : null}
    </section>
  );
}
