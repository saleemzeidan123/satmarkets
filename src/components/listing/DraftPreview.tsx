"use client";
import { useState } from "react";
import { Photo, Icon } from "@/components/satkit";
import { photoFor } from "@/lib/photos";
import Gallery from "@/components/Gallery";
import VerificationSummary from "@/components/VerificationState";
import AdPermit from "@/components/AdPermit";
import ListingFactsGrid from "@/components/listing/ListingFactsGrid";
import ListingAttributeSection from "@/components/listing/ListingAttributeSection";
import { factsGridTiles, type FactsGridSource } from "@/lib/listingFactsGrid";
import type { Dictionary } from "@/i18n/getDictionary";
import type { ListingPresentation } from "@/lib/listingPresentation";
import type { EvidenceItem } from "@/lib/guidedEvidence";
import { evidenceSummary, evidenceStateLabel } from "@/lib/guidedEvidence";
import { displayProvenanceLabel, displayProvenanceAria, type DisplayProvenance } from "@/lib/provenanceDisplay";
import type { FilingAccount, VerifiableListing } from "@/lib/listingVerification";

// PKG-LISTING-CREATION-1A, requirement G. The exact bilingual preview.
//
// Every value rendered here was computed once, by listingPresentation.ts,
// server side, for both languages, before this component ever mounted. This
// component makes no figure, no label and no verification decision on its
// own: it toggles which of the two already-built bundles is on screen and
// lays them out with the same shared components (ListingFactsGrid,
// ListingAttributeSection, VerificationSummary, AdPermit, Gallery) the public
// listing page itself uses. A reviewer reading this file for drift risk
// should look for a place a number or a word is computed here rather than
// received as a prop; there is deliberately none.
//
// WHAT THIS DOES NOT ATTEMPT. Location facts (nearest metro, travel time),
// similar listings and the flyer are page-level features of the public
// detail page, not properties of the listing, and are out of this preview's
// stated coverage. The contact block below is NOT the live ContactBar: a
// draft has no public URL and messaging a lister previewing their own listing
// is not a real action, so this shows which channels will be offered,
// inertly, rather than wiring dead WhatsApp and message-thread links.

type RawListing = Record<string, unknown> & {
  ad_permit_no?: string | null;
  ad_permit_number?: string | null;
  ad_permit_expires_at?: string | null;
};

export default function DraftPreview({
  status,
  en,
  ar,
  rawListing,
  account,
  photos,
  evidenceItems,
  initialLocale,
  dict,
}: {
  status: string;
  en: ListingPresentation;
  ar: ListingPresentation;
  rawListing: RawListing;
  account: FilingAccount | null;
  photos: string[];
  evidenceItems: EvidenceItem[];
  initialLocale: "en" | "ar";
  /** Both locales' dictionaries, so the toggle needs no round trip. */
  dict: { en: Dictionary; ar: Dictionary };
}) {
  const [locale, setLocale] = useState<"en" | "ar">(initialLocale);
  const [confirmedThisSession, setConfirmedThisSession] = useState(false);
  const isAr = locale === "ar";
  const p = isAr ? ar : en;
  const d = dict[locale];
  const summary = evidenceSummary(evidenceItems);

  return (
    <div dir={isAr ? "rtl" : "ltr"} lang={locale} style={{ fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div
        className="row between wrap"
        style={{ padding: "14px 24px", borderBottom: "1px solid var(--silver)", background: "var(--paper)", gap: 10 }}
      >
        <div className="row gap8" role="group" aria-label={isAr ? "لغة المعاينة" : "Preview language"}>
          {/* aria-current, not aria-pressed: this is a choice among two options
              (which language is showing), not a single thing being toggled on or
              off. formGroups.test.ts holds this distinction (finding 182). */}
          <button
            type="button"
            className="touch-target"
            aria-current={locale === "en" ? "true" : undefined}
            onClick={() => setLocale("en")}
            style={toggleBtnStyle(locale === "en")}
          >
            EN
          </button>
          <button
            type="button"
            className="touch-target"
            aria-current={locale === "ar" ? "true" : undefined}
            onClick={() => setLocale("ar")}
            style={toggleBtnStyle(locale === "ar")}
          >
            AR
          </button>
        </div>
        <span className="tag" style={{ background: "var(--cool)", color: "var(--slate)" }}>
          {status === "draft"
            ? (isAr ? "معاينة مسودة، لا يوجد رابط عام لها" : "Draft preview, no public URL exists")
            : (isAr ? "معاينة، تطابق الصفحة العامة الحالية" : "Preview, matches the current public page")}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {photos.length > 1 ? (
          <Gallery images={photos} title={p.title} locale={locale} />
        ) : (
          <Photo src={photos[0] ?? photoFor(String(rawListing.asset_type ?? ""), String(rawListing.id ?? ""))} kind={String(rawListing.asset_type ?? "")} label={p.title} h={280} />
        )}

        <div className="row gap10 wrap" style={{ marginTop: 18 }}>
          <span className="tag" style={{ color: "var(--azure-d)", background: "var(--azure-wash)", borderColor: "var(--azure-l)" }}>
            {p.assetTypeLabel} · {p.dealLabel}
          </span>
          {p.gradePhrase ? <span className="tag">{p.gradePhrase}</span> : null}
          {p.fitoutLabel ? <span className="tag">{p.fitoutLabel}</span> : null}
        </div>

        {/* <h2>, not <h1>: the route's own page title ("Listing preview" /
            "معاينة العرض") is the page's first-level heading. This is the
            listing's own name within that page, one level down. */}
        <h2 className="serif" style={{ fontSize: "1.875rem", fontWeight: 500, letterSpacing: "-.02em", margin: "14px 0 0" }}>
          {p.title || (isAr ? "بلا عنوان بعد" : "No title yet")}
        </h2>
        <div className="row gap10 wrap" style={{ marginTop: 10, color: "var(--slate)", fontSize: "0.875rem" }}>
          {p.place ? <span className="row gap6"><Icon.pin size={16} /> {p.place}{p.city ? (isAr ? "، " : ", ") + p.city : ""}</span> : null}
          {p.figures.areaText ? <span>{p.figures.areaText}</span> : null}
        </div>

        <VerificationSummary listing={rawListing as unknown as VerifiableListing} account={account} ar={isAr} />
        <AdPermit listing={rawListing} ar={isAr} />

        {(p.figures.priceText || p.figures.annualTotalText) && (
          <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
            <div className="muted" style={{ fontSize: "0.71875rem" }}>{p.figures.lease ? d.ld.asking : d.ld.price}</div>
            <div className="mono" style={{ fontSize: "1.25rem", fontWeight: 500, marginTop: 6 }}>{p.figures.priceText ?? d.ld.onRequest}</div>
            {p.figures.annualTotalText ? <div className="muted" style={{ fontSize: "0.8125rem", marginTop: 4 }}>{p.figures.annualTotalText}</div> : null}
          </div>
        )}

        <ListingFactsGrid tiles={factsGridTiles(rawListing as unknown as FactsGridSource, d, locale)} ar={isAr} locale={locale} />

        <ListingAttributeSection title={d.ld.spaceTitle} rows={p.spaceRows} footnote={d.ld.statedGeneric} ar={isAr} locale={locale} />
        <ListingAttributeSection title={d.ld.termsTitle} rows={p.commercialRows} footnote={d.ld.statedByLister} ar={isAr} locale={locale} />
        <ListingAttributeSection title={d.ld.complianceTitle} rows={p.complianceRows} footnote={d.ld.statedGeneric} ar={isAr} locale={locale} />

        {p.descriptionText && (
          <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
            <p style={{ fontSize: "0.90625rem", lineHeight: 1.7, margin: 0 }}>{p.descriptionText}</p>
            {isAr && (
              <div className="row gap8" style={{ marginTop: 10, alignItems: "center" }}>
                <ProvenanceBadge value={p.arabicWording.description.provenance} ar={isAr} />
                {p.arabicWording.description.provenance === "ai_suggested" && !confirmedThisSession && (
                  <button type="button" className="chip touch-target" onClick={() => setConfirmedThisSession(true)}>
                    {isAr ? "أؤكد صحة النص العربي" : "Confirm this Arabic reads correctly"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <EvidenceMissionSummary items={evidenceItems} summary={summary} ar={isAr} />

        <ContactPreview channels={p.contact.channels} phone={p.contact.phone} email={p.contact.email} ar={isAr} />
      </div>
    </div>
  );
}

function toggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 999,
    border: "1px solid var(--silver)",
    background: active ? "var(--harbor)" : "transparent",
    color: active ? "#fff" : "var(--ink)",
    fontWeight: 600,
    fontSize: "0.8125rem",
  };
}

function ProvenanceBadge({ value, ar }: { value: DisplayProvenance; ar: boolean }) {
  return (
    <span
      className="tag"
      title={displayProvenanceAria(value, ar)}
      style={{ fontSize: "0.6875rem", background: value === "ai_suggested" ? "var(--cool)" : undefined }}
    >
      {displayProvenanceLabel(value, ar)}
    </span>
  );
}

function EvidenceMissionSummary({
  items,
  summary,
  ar,
}: {
  items: readonly EvidenceItem[];
  summary: ReturnType<typeof evidenceSummary>;
  ar: boolean;
}) {
  const outstanding = items.filter((i) => i.state === "awaiting_evidence");
  const unavailable = items.filter((i) => i.state === "unavailable");
  return (
    <div className="card pad" style={{ marginTop: 22, boxShadow: "none", border: "1px solid var(--silver)" }}>
      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{ar ? "اكتمال الأدلة" : "Evidence completeness"}</div>
      <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 4 }}>
        {ar
          ? `${summary.requiredOutstanding} عنصراً مطلوباً لا يزال ناقصاً، ${summary.recommendedOutstanding} موصى به لا يزال ناقصاً.`
          : `${summary.requiredOutstanding} required item still missing, ${summary.recommendedOutstanding} recommended item still missing.`}
      </div>
      {outstanding.length > 0 && (
        <ul style={{ marginTop: 10, paddingInlineStart: 18, fontSize: "0.8125rem" }}>
          {outstanding.slice(0, 8).map((i) => (
            <li key={i.key}>
              {ar ? i.label_ar : i.label_en}
              <span className="muted" style={{ marginInlineStart: 6, fontSize: "0.6875rem" }}>
                ({evidenceStateLabel(i.state, ar)})
              </span>
            </li>
          ))}
        </ul>
      )}
      {unavailable.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: "0.71875rem" }}>{ar ? "مُحدَّد كغير متاح" : "Marked unavailable"}</div>
          <ul style={{ marginTop: 4, paddingInlineStart: 18, fontSize: "0.8125rem" }}>
            {unavailable.map((i) => (
              <li key={i.key}>
                {ar ? i.label_ar : i.label_en}
                {i.unavailableReason ? `: ${i.unavailableReason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ContactPreview({
  channels,
  phone,
  email,
  ar,
}: {
  channels: readonly string[];
  phone: string | null;
  email: string | null;
  ar: boolean;
}) {
  // Not the live ContactBar. See the module header: a draft has no public
  // URL, and wiring a WhatsApp deep link or a message-thread action to
  // one's own draft is not a real action a lister should be invited to take.
  // This names what will be offered, inertly, once published.
  const NAMES: Record<string, [string, string]> = {
    whatsapp: ["WhatsApp", "واتساب"],
    call: ["Call", "اتصال"],
    email: ["Email", "بريد إلكتروني"],
    message: ["Message on SAT", "رسالة عبر سات"],
  };
  if (channels.length === 0) return null;
  return (
    <div className="card pad" style={{ marginTop: 22, boxShadow: "none" }}>
      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{ar ? "قنوات التواصل عند النشر" : "Contact channels once published"}</div>
      <div className="row gap8 wrap" style={{ marginTop: 10 }}>
        {channels.map((c) => (
          <span key={c} className="chip" style={{ pointerEvents: "none" }}>
            {NAMES[c] ? NAMES[c][ar ? 1 : 0] : c}
          </span>
        ))}
      </div>
      {(phone || email) && (
        <div className="muted" style={{ fontSize: "0.78125rem", marginTop: 8 }}>
          {ar ? "لن تُعرض بيانات التواصل مباشرة هنا؛ الأزرار أعلاه توضّح القنوات المفعّلة فقط." : "Contact details are not shown directly here; the chips above only show which channels are enabled."}
        </div>
      )}
    </div>
  );
}
