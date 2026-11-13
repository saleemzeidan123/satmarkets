import { getSupabaseServer } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/getDictionary";
import { getSourceRights } from "@/lib/queries/sourceRights";
import { mayRedisplay } from "@/lib/sourceRights";
import { REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID } from "@/lib/sources/catalogue";
import { leasingActivityFor, columnMax, LEASING_DATASET, type LeasingKind, type LeasingRow, type PlatformDistrict } from "@/lib/market/leasingActivity";
import { formatPeriod } from "@/lib/market/period";
import { formatInteger, fill } from "@/lib/format";

// PKG-DATA-1. Registered commercial leases by district, as the Real Estate
// General Authority publishes them on the National Open Data Platform.
//
// Three rules shape this section, and each is the reason for something that
// may look like an omission.
//
// It asks the source register first. The right to show these figures is a row
// in `source_registry`, written by a migration that quotes the licence. With no
// row, or a row that does not allow public display, the section is not drawn.
// It does not fall back to a note, because a note would still name a source
// the register has not cleared.
//
// It shows the source's own figures and nothing computed from them. There is
// no city total, no share and no rank number: the regulatory register holds
// derived market figures until open decision O13 is answered. The rows are put
// in order and each column's bars are scaled to that column's largest value,
// which arranges the published figures without stating a new one.
//
// It shows no rent, because the file has none for commercial property, and it
// says so in the paragraph above the rows rather than leaving a reader to
// wonder where the rents are.

const KINDS: readonly LeasingKind[] = ["office", "shop", "showroom"];

export default async function LeasingActivity({ locale }: { locale: "en" | "ar" }) {
  const rights = await getSourceRights(REGA_OPEN_RENTAL_INDICATORS_SOURCE_ID);
  if (!mayRedisplay(rights, "public")) return null;

  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data } = await sb.from("districts").select("name_en,name_ar,city");
  const districts = (data ?? []) as PlatformDistrict[];
  const found = leasingActivityFor(districts);
  if (found.length === 0) return null;

  const ar = locale === "ar";
  const t = getDictionary(locale).marketPage;
  const label: Record<LeasingKind, string> = { office: t.laOffice, shop: t.laShop, showroom: t.laShowroom };
  // Office contracts first, most to fewest; a district with no office row goes
  // last. The order is stated beneath the rows.
  const rows: LeasingRow[] = [...found].sort((a, b) => (b.office ?? -1) - (a.office ?? -1));
  const max: Record<LeasingKind, number> = { office: columnMax(rows, "office"), shop: columnMax(rows, "shop"), showroom: columnMax(rows, "showroom") };
  // How many of the platform's own districts in the file's city the file names.
  const inCity = new Set(districts.filter((d) => d.city === /* i18n-exempt */ "Riyadh").map((d) => d.name_ar)).size;

  // The licence notice is one sentence with two links in it, so the sentence
  // stays whole in the dictionary and the links are placed where it names them.
  const notice = t.laNotice.split(/(\{dataset\}|\{licence\})/);

  return (
    <section className="card" style={{ marginTop: 18, padding: "22px 24px" }} aria-labelledby="la-title">
      <div className="row between wrap" style={{ alignItems: "baseline", gap: 10 }}>
        <h2 id="la-title" className="serif" style={{ fontSize: "1.3125rem", fontWeight: 500, margin: 0 }}>{t.laTitle}</h2>
        <span className="mono muted" style={{ fontSize: "0.71875rem" }}>{formatPeriod(LEASING_DATASET.period, ar)}</span>
      </div>
      <p className="muted" style={{ fontSize: "0.8125rem", marginTop: 8, lineHeight: 1.65, maxWidth: 720 }}>{t.laIntro}</p>

      <div className="mt-4 hidden border-b border-silver pb-2 text-[0.75rem] text-slate sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(3,116px)] sm:gap-x-5" aria-hidden="true">
        <span>{t.laDistrict}</span>
        {KINDS.map((k) => <span key={k}>{label[k]}</span>)}
      </div>
      <ol className="m-0 list-none p-0">
        {rows.map((r) => (
          <li key={r.ar} className="grid grid-cols-3 gap-x-5 gap-y-1.5 border-b border-silver py-2.5 sm:grid-cols-[minmax(0,1fr)_repeat(3,116px)] sm:items-center sm:gap-x-5 sm:py-2.5">
            <span className="col-span-3 text-[0.875rem] font-semibold text-ink sm:col-span-1">{ar ? r.ar : r.en}</span>
            {KINDS.map((k) => {
              const n = r[k];
              return (
                <span key={k} className="block">
                  {/* On a phone each figure carries its own label above it,
                      because three labelled figures do not fit on one line in
                      English. From the small breakpoint up the column heading
                      carries the label and this one is for screen readers. */}
                  <span className="block text-[0.6875rem] leading-tight text-slate sm:sr-only">{label[k]}</span>
                  {n == null ? (
                    <span className="block text-[0.75rem] text-slate">{t.laNone}</span>
                  ) : (
                    <>
                      <span className="mono block whitespace-nowrap text-[0.875rem] leading-snug text-ink">{formatInteger(n, locale)}</span>
                      <span className="mt-1 block h-[3px] rounded-full bg-silver" aria-hidden="true">
                        <span className="block h-full rounded-full bg-harbor" style={{ width: `${max[k] ? Math.max((n / max[k]) * 100, 2) : 0}%` }} />
                      </span>
                    </>
                  )}
                </span>
              );
            })}
          </li>
        ))}
      </ol>

      <p className="muted" style={{ fontSize: "0.71875rem", marginTop: 12, lineHeight: 1.7 }}>
        {t.laOrder} {fill(t.laCoverage, { shown: formatInteger(rows.length, locale), all: formatInteger(inCity, locale) })}
      </p>
      <p className="muted" style={{ fontSize: "0.71875rem", marginTop: 6, lineHeight: 1.7 }}>
        {notice.map((part, i) =>
          part === "{dataset}" ? (
            <a key={i} href={LEASING_DATASET.url} rel="noopener noreferrer" target="_blank" style={{ color: "var(--harbor)" }}><bdi dir="ltr">{LEASING_DATASET.title}</bdi></a>
          ) : part === "{licence}" ? (
            <a key={i} href={LEASING_DATASET.licenceUrl} rel="noopener noreferrer" target="_blank" style={{ color: "var(--harbor)" }}>{t.laLicenceName}</a>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    </section>
  );
}
