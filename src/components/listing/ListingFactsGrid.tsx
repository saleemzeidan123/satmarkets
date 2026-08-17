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
    <div style={{ scrollMarginTop: 80, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 150px), 1fr))", gap: 16, marginTop: 22 }}>
      {tiles.map((t, i) => {
        const ev = t.evidenceKey ? evidence?.get(t.evidenceKey) : undefined;
        return (
          <div key={i} className="card pad" style={{ boxShadow: "none", padding: 16 }}>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{t.label}</div>
            <div className="mono" style={{ fontSize: "1rem", fontWeight: 500, marginTop: 8 }}>{t.value}</div>
            {ev ? <EvidencePassport view={ev} label={t.label} ar={ar} locale={locale} /> : null}
          </div>
        );
      })}
    </div>
  );
}
