import EvidencePassport from "@/components/EvidencePassport";
import type { PublicEvidenceView } from "@/lib/evidenceView";
import type { FactsGridTile } from "@/lib/listingFactsGrid";

// PKG-LISTING-CREATION-1A. The at-a-glance tile grid, extracted from
// listings/[id]/page.tsx, paired with listingFactsGrid.ts which builds the
// tile list itself. See that file for why the tile list is a named set
// rather than a generic sweep.

export default function ListingFactsGrid({
  tiles,
  evidence,
  ar,
  locale,
}: {
  tiles: readonly FactsGridTile[];
  evidence?: ReadonlyMap<string, PublicEvidenceView>;
  ar: boolean;
  locale: "en" | "ar";
}) {
  return (
    /* PKG-DESIGN-4. The tiles were bordered cards with the value in the mono
       face. They are now cells on one hairline grid, label over value, in the
       text face with tabular figures, which is how the approved drawing sets a
       fact. The styles are `.fx-*` in globals.css. */
    <div className="fx-grid" style={{ scrollMarginTop: 80 }}>
      {tiles.map((t, i) => {
        const ev = t.evidenceKey ? evidence?.get(t.evidenceKey) : undefined;
        return (
          <div key={i} className="fx-cell">
            <div className="fx-k">{t.label}</div>
            <div className="fx-v">{t.value}</div>
            {ev ? <EvidencePassport view={ev} label={t.label} ar={ar} locale={locale} /> : null}
          </div>
        );
      })}
    </div>
  );
}
