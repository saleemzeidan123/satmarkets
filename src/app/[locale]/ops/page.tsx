// src/app/[locale]/ops/page.tsx
// SAT Markets - Data Operations simulation console (Slice 1, bilingual EN/AR).
// SELF-CONTAINED. All data below is SYNTHETIC sample data for testing. Never production.
// Shows: source health, inbound feeds as they arrive, ingestion run log, reconciliation,
// how it appears on the platform (with click-through lineage), verification gate, thin-sample watch, reports.

export const dynamic = "force-dynamic";

type Seg = "blended" | "grade_a" | "grade_b" | "modern";

type IndexRow = {
  district: string; districtAr: string;
  asset: string; assetAr: string;
  segment: Seg; segmentEn: string; segmentAr: string;
  low: number; median: number; high: number;
  sufficient: boolean;
  sourceType: "rega" | "broker";
  period: string;
  source: string; sourceAr: string;
  basis: string; basisAr: string;
  districtResolved: boolean;
};

const INDEX: IndexRow[] = [
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 1200, median: 1700, high: 2200, sufficient: true, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "412 transactions", basisAr: "412 صفقة", districtResolved: true },
  { district: "Al Malaz", districtAr: "الملز", asset: "Office", assetAr: "مكاتب", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 700, median: 980, high: 1300, sufficient: true, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "208 transactions", basisAr: "208 صفقة", districtResolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 1000, median: 1350, high: 1800, sufficient: true, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "151 transactions", basisAr: "151 صفقة", districtResolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Retail", assetAr: "تجزئة", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 1800, median: 2600, high: 3600, sufficient: true, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "96 transactions", basisAr: "96 صفقة", districtResolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Retail", assetAr: "تجزئة", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 1300, median: 1900, high: 2600, sufficient: true, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "44 transactions", basisAr: "44 صفقة", districtResolved: true },
  { district: "An Narjis", districtAr: "النرجس", asset: "Office", assetAr: "مكاتب", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 600, median: 760, high: 980, sufficient: false, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "7 transactions, below threshold", basisAr: "7 صفقات، دون الحد", districtResolved: false },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "blended", segmentEn: "Blended", segmentAr: "مجمع", low: 180, median: 240, high: 320, sufficient: true, sourceType: "rega", period: "2026-06", source: "REGA Rental Index (Ejar)", sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)", basis: "63 transactions", basisAr: "63 صفقة", districtResolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segmentEn: "Grade A", segmentAr: "الفئة أ", low: 1750, median: 2043, high: 2500, sufficient: true, sourceType: "broker", period: "2026-Q1", source: "Published benchmarks: CBRE, JLL, Knight Frank", sourceAr: "مراجع منشورة: CBRE و JLL و Knight Frank", basis: "3 sources agree within tolerance", basisAr: "3 مصادر متوافقة ضمن الحد", districtResolved: true },
  { district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", segment: "grade_b", segmentEn: "Grade B", segmentAr: "الفئة ب", low: 1100, median: 1300, high: 1550, sufficient: false, sourceType: "broker", period: "2026-Q1", source: "Published benchmarks: JLL", sourceAr: "مراجع منشورة: JLL", basis: "single source", basisAr: "مصدر واحد", districtResolved: true },
  { district: "Granada", districtAr: "غرناطة", asset: "Office", assetAr: "مكاتب", segment: "grade_a", segmentEn: "Grade A", segmentAr: "الفئة أ", low: 1300, median: 1500, high: 1850, sufficient: false, sourceType: "broker", period: "2026-Q1", source: "Published benchmarks: JLL", sourceAr: "مراجع منشورة: JLL", basis: "single source", basisAr: "مصدر واحد", districtResolved: true },
  { district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", segment: "modern", segmentEn: "Modern", segmentAr: "حديثة", low: 190, median: 235, high: 300, sufficient: false, sourceType: "broker", period: "2026-Q1", source: "Published benchmarks: CBRE", sourceAr: "مراجع منشورة: CBRE", basis: "single source", basisAr: "مصدر واحد", districtResolved: true },
];

type Listing = {
  ref: string; district: string; districtAr: string; asset: string; assetAr: string;
  deal: string; dealAr: string; nafath: boolean; permit: string | null;
  deed: "valid" | "not_found" | "pending"; asking: number | null;
};
const LISTINGS: Listing[] = [
  { ref: "SAT-1847", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256841", deed: "valid", asking: 1550 },
  { ref: "SAT-1902", district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256990", deed: "not_found", asking: 205 },
  { ref: "SAT-1955", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Sale", dealAr: "بيع", nafath: true, permit: "7200257050", deed: "pending", asking: null },
];

type Source = { name: string; nameAr: string; cadence: string; cadenceAr: string; last: string; status: "fresh" | "attention"; note: string; noteAr: string };
const SOURCES: Source[] = [
  { name: "REGA / Ejar Rental Index", nameAr: "مؤشر إيجار / الهيئة العامة للعقار", cadence: "Dated, monthly", cadenceAr: "مؤرخ، شهري", last: "2026-06", status: "fresh", note: "7 rows received", noteAr: "7 صفوف مستلمة" },
  { name: "Broker benchmarks (JLL/CBRE/KF)", nameAr: "مراجع الوسطاء (JLL/CBRE/KF)", cadence: "Dated, quarterly", cadenceAr: "مؤرخ، ربعي", last: "2026-Q1", status: "fresh", note: "4 rows received", noteAr: "4 صفوف مستلمة" },
  { name: "SPL National Address", nameAr: "العنوان الوطني (سبل)", cadence: "Live API", cadenceAr: "مباشر", last: "live", status: "attention", note: "1 district unresolved (An Narjis)", noteAr: "حي واحد غير محلول (النرجس)" },
  { name: "Wathq (deeds)", nameAr: "واثق (الصكوك)", cadence: "Live API, per listing", cadenceAr: "مباشر، لكل إعلان", last: "live", status: "attention", note: "1 deed not found", noteAr: "صك واحد غير موجود" },
  { name: "Nafath (identity)", nameAr: "نفاذ (الهوية)", cadence: "Live OIDC", cadenceAr: "مباشر", last: "live", status: "fresh", note: "all advertisers verified", noteAr: "جميع المعلنين موثّقون" },
  { name: "REGA advertising permit", nameAr: "رخصة الإعلان (العقار)", cadence: "Live inquiry", cadenceAr: "استعلام مباشر", last: "live", status: "fresh", note: "all permits valid", noteAr: "جميع الرخص سارية" },
  { name: "GASTAT / SAMA (context)", nameAr: "الإحصاء / ساما (سياق)", cadence: "Dated, monthly", cadenceAr: "مؤرخ، شهري", last: "2026-06", status: "fresh", note: "context only, not index", noteAr: "سياق فقط، ليس المؤشر" },
  { name: "Foursquare / Mapbox (geo)", nameAr: "Foursquare / Mapbox (جغرافيا)", cadence: "Snapshot / live", cadenceAr: "لقطة / مباشر", last: "2026-06", status: "fresh", note: "POI + isochrones", noteAr: "نقاط اهتمام + عزل زمني" },
];

const REGA_CSV = `district,asset_type,avg_rent,band_low,band_high,transactions,period
Al Olaya,office,1700,1200,2200,412,2026-06
Al Malaz,office,980,700,1300,208,2026-06
Granada,office,1350,1000,1800,151,2026-06
Al Olaya,retail,2600,1800,3600,96,2026-06
Granada,retail,1900,1300,2600,44,2026-06
An Narjis,office,760,600,980,7,2026-06
Al Malaz,warehouse,240,180,320,63,2026-06`;

const BROKER_CSV = `district,asset_type,grade,low,median,high,sources,period
Al Olaya,office,A,1750,2043,2500,"CBRE;JLL;Knight Frank",2026-Q1
Al Olaya,office,B,1100,1300,1550,"JLL",2026-Q1
Granada,office,A,1300,1500,1850,"JLL",2026-Q1
Al Malaz,warehouse,Modern,190,235,300,"CBRE",2026-Q1`;

function fmt(n: number): string { return n.toLocaleString("en-US"); }

export default function OpsPage({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  const t = (en: string, arr: string) => (ar ? arr : en);

  const published = INDEX.filter((r) => r.sufficient);
  const thin = INDEX.filter((r) => !r.sufficient);
  const publishedListings = LISTINGS.filter((l) => l.nafath && l.permit && l.deed === "valid");
  const heldListings = LISTINGS.filter((l) => !(l.nafath && l.permit && l.deed === "valid"));

  const verdictFor = (l: Listing): { label: string; labelAr: string; tone: string } | null => {
    if (l.asking == null) return null;
    const band = INDEX.find((r) => r.district === l.district && r.asset === l.asset && r.sufficient && (r.segment === "grade_a" || r.segment === "blended"));
    if (!band) return null;
    const delta = Math.round(((l.asking - band.median) / band.median) * 100);
    if (delta <= -8) return { label: "Below median (" + delta + "%)", labelAr: "دون الوسيط (" + delta + "%)", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (delta >= 8) return { label: "Above median (+" + delta + "%)", labelAr: "فوق الوسيط (+" + delta + "%)", tone: "text-rose-700 bg-rose-50 border-rose-200" };
    return { label: "Within band (" + delta + "%)", labelAr: "ضمن النطاق (" + delta + "%)", tone: "text-slate-700 bg-slate-50 border-slate-200" };
  };

  const H = ({ n, en, arr }: { n: string; en: string; arr: string }) => (
    <div className="mb-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{n}</p>
      <h2 className="text-lg font-semibold text-slate-900">{t(en, arr)}</h2>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        {t("SAMPLE DATA. This is a data-operations simulation. Everything below is synthetic and never reaches production.", "بيانات عيّنة. هذه محاكاة لعمليات البيانات. كل ما يظهر هنا اصطناعي ولا يصل إلى الإنتاج إطلاقاً.")}
      </div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("Data Operations", "عمليات البيانات")}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{t("Ingestion simulation console", "محاكاة استقبال البيانات")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("Simulated period: REGA 2026-06 and broker benchmarks 2026-Q1. Follow each source as it arrives, how it reconciles, how it appears on the platform, and why.", "الفترة المحاكاة: ريجا 2026-06 ومراجع الوسطاء 2026-الربع الأول. تابع كل مصدر عند وصوله، وكيف يُوحَّد، وكيف يظهر على المنصة، ولماذا.")}</p>
      </header>

      <section>
        <H n="01" en="Source health" arr="حالة المصادر" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => (
            <div key={s.name} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{t(s.name, s.nameAr)}</p>
                <span className={"inline-block h-2 w-2 shrink-0 rounded-full " + (s.status === "fresh" ? "bg-emerald-500" : "bg-amber-500")} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{t(s.cadence, s.cadenceAr)} · {s.last}</p>
              <p className="mt-1 text-xs text-slate-600">{t(s.note, s.noteAr)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H n="02" en="Inbound feeds (as delivered)" arr="التغذيات الواردة (كما تصل)" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{t("REGA / Ejar rental index — CSV, monthly", "مؤشر إيجار — CSV، شهري")}</div>
            <pre className="overflow-x-auto px-3 py-2 text-xs leading-5 text-slate-700" dir="ltr">{REGA_CSV}</pre>
          </div>
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{t("Broker benchmarks — CSV from PDF, quarterly", "مراجع الوسطاء — CSV من PDF، ربعي")}</div>
            <pre className="overflow-x-auto px-3 py-2 text-xs leading-5 text-slate-700" dir="ltr">{BROKER_CSV}</pre>
          </div>
        </div>
      </section>

      <section>
        <H n="03" en="Ingestion run log" arr="سجل عملية الاستقبال" />
        <ol className="space-y-1 text-sm text-slate-700">
          <li>{t("Received: 7 REGA rows + 4 broker rows = 11 index rows.", "المستلم: 7 صفوف ريجا + 4 صفوف وسطاء = 11 صف مؤشر.")}</li>
          <li>{t("Validated against SAT schema: 11 / 11 valid (enums, unit sar_sqm_year, required fields).", "التحقق مقابل مخطط سات: 11 / 11 صالحة (القيم، الوحدة، الحقول المطلوبة).")}</li>
          <li>{t("District resolution (SPL): 10 / 11 resolved. Unresolved: An Narjis (queued for crosswalk).", "توحيد الأحياء (سبل): 10 / 11 محلولة. غير محلول: النرجس (بانتظار المطابقة).")}</li>
          <li>{t("Sufficiency gate: 7 sufficient, 4 thin (flagged, no firm band).", "بوابة الكفاية: 7 كافية، 4 قليلة (موسومة، بلا نطاق مؤكد).")}</li>
          <li>{t("Listings: 3 received, 1 published, 2 held for verification.", "الإعلانات: 3 مستلمة، 1 منشور، 2 محجوزة للتحقق.")}</li>
        </ol>
      </section>

      <section>
        <H n="04" en="Reconciliation board" arr="لوحة التوحيد" />
        <p className="mb-2 text-xs text-slate-500">{t("One row per source per district, asset and segment. REGA and broker rows coexist and are never blended into an unattributed number.", "صف لكل مصدر لكل حي وأصل وشريحة. صفوف ريجا والوسطاء تتعايش ولا تُدمج في رقم بلا مصدر.")}</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("District", "الحي")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Asset · Segment", "الأصل · الشريحة")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Source", "المصدر")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Band", "النطاق")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Median", "الوسيط")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Verdict", "الحكم")}</th>
              </tr>
            </thead>
            <tbody>
              {INDEX.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">{ar ? r.districtAr : r.district}{!r.districtResolved && <span className="ms-1 rounded bg-amber-100 px-1 text-xs text-amber-800">{t("unresolved", "غير محلول")}</span>}</td>
                  <td className="px-3 py-2 text-slate-600">{t(r.asset, r.assetAr)} · {t(r.segmentEn, r.segmentAr)}</td>
                  <td className="px-3 py-2 text-slate-600">{t(r.source, r.sourceAr)} · {r.period}</td>
                  <td className="px-3 py-2 text-slate-600" dir="ltr">{fmt(r.low)}–{fmt(r.high)}</td>
                  <td className="px-3 py-2 text-slate-900">{r.sufficient ? fmt(r.median) : t("Thin sample", "عينة قليلة")}</td>
                  <td className="px-3 py-2">{r.sufficient ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Sufficient", "كافٍ")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin", "قليل")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H n="05" en="How it appears on the platform (with lineage)" arr="كيف يظهر على المنصة (مع التتبع)" />
        <p className="mb-2 text-xs text-slate-500">{t("This is the public Rent Index view. Open Why on any row to trace the exact source behind it.", "هذا عرض مؤشر الإيجارات العام. افتح لماذا على أي صف لتتبع المصدر الدقيق خلفه.")}</p>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {INDEX.map((r, i) => (
            <details key={i} className="group px-3 py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="text-slate-900">{ar ? r.districtAr : r.district} · {t(r.asset, r.assetAr)} · {t(r.segmentEn, r.segmentAr)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-900">{r.sufficient ? fmt(r.median) + " " + t("SAR/m2/yr", "ريال/م2/سنة") : t("Thin sample", "عينة قليلة")}</span>
                  <span className="text-xs text-sky-600 group-open:hidden">{t("Why", "لماذا")}</span>
                </span>
              </summary>
              <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                <p>{t("Source", "المصدر")}: {t(r.source, r.sourceAr)}</p>
                <p>{t("Period", "الفترة")}: {r.period}</p>
                <p>{t("Band", "النطاق")}: <span dir="ltr">{fmt(r.low)}–{fmt(r.high)}</span> · {t("Basis", "الأساس")}: {t(r.basis, r.basisAr)}</p>
                <p>{r.sufficient ? t("Passed sufficiency gate, shown as a firm band.", "اجتاز بوابة الكفاية، ويظهر كنطاق مؤكد.") : t("Failed sufficiency gate, shown as thin sample, never a firm number.", "لم يجتز بوابة الكفاية، يظهر كعينة قليلة، وليس رقماً مؤكداً.")}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <H n="06" en="Verification gate queue" arr="طابور بوابة التحقق" />
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("Listing", "الإعلان")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Nafath", "نفاذ")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Permit", "الرخصة")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Deed (Wathq)", "الصك (واثق)")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {LISTINGS.map((l) => {
                const ok = l.nafath && !!l.permit && l.deed === "valid";
                const v = verdictFor(l);
                return (
                  <tr key={l.ref} className="border-t border-slate-100">
                    <td className="px-3 py-2"><span className="font-medium text-slate-900" dir="ltr">{l.ref}</span><span className="text-slate-500"> · {ar ? l.districtAr : l.district} · {t(l.asset, l.assetAr)} · {t(l.deal, l.dealAr)}</span></td>
                    <td className="px-3 py-2">{l.nafath ? "✓" : "✕"}</td>
                    <td className="px-3 py-2" dir="ltr">{l.permit ? l.permit : "—"}</td>
                    <td className="px-3 py-2">{l.deed === "valid" ? t("Valid", "سارٍ") : l.deed === "not_found" ? t("Not found", "غير موجود") : t("Pending", "قيد الانتظار")}</td>
                    <td className="px-3 py-2">
                      {ok ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Published", "منشور")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Held for review", "محجوز للمراجعة")}</span>}
                      {ok && v && <span className={"ms-2 rounded border px-2 py-0.5 text-xs " + v.tone}>{ar ? v.labelAr : v.label}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H n="07" en="Thin-sample watch and crosswalk queue" arr="مراقبة العينات القليلة وطابور المطابقة" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{t("Thin segments (never shown as a firm band)", "الشرائح القليلة (لا تظهر كنطاق مؤكد)")}</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {thin.map((r, i) => (
                <li key={i}>{ar ? r.districtAr : r.district} · {t(r.asset, r.assetAr)} · {t(r.segmentEn, r.segmentAr)} <span className="text-slate-400">— {t(r.basis, r.basisAr)}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{t("Unresolved districts (SPL crosswalk)", "أحياء غير محلولة (مطابقة سبل)")}</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {INDEX.filter((r) => !r.districtResolved).map((r, i) => (
                <li key={i}>{ar ? r.districtAr : r.district} <span className="text-slate-400">— {t("needs a manual crosswalk to a canonical district id", "يحتاج مطابقة يدوية لمعرّف حي معتمد")}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <H n="08" en="Reports" arr="التقارير" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{published.length}/{INDEX.length}</p><p className="text-xs text-slate-500">{t("Index cells sufficient", "خلايا المؤشر الكافية")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{publishedListings.length}/{LISTINGS.length}</p><p className="text-xs text-slate-500">{t("Listings passing verification", "إعلانات اجتازت التحقق")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{thin.length}</p><p className="text-xs text-slate-500">{t("Reconciliation exceptions", "استثناءات التوحيد")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">1</p><p className="text-xs text-slate-500">{t("Districts to crosswalk", "أحياء للمطابقة")}</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Coming next (Slice 2): a sim clock to advance periods, a scenario injector, CSV and XLSX export, roles and audit trail, and stale-source alerting.", "التالي (الشريحة 2): ساعة محاكاة لتقديم الفترات، وحاقن سيناريوهات، وتصدير CSV و XLSX، والأدوار وسجل التدقيق، وتنبيهات المصادر القديمة.")}</p>
      </section>

      <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">
        {t("SAT Markets data operations. Synthetic simulation. FAL 1200025510.", "عمليات بيانات سات ماركتس. محاكاة اصطناعية. رخصة فال 1200025510.")}
      </footer>
    </main>
  );
}
