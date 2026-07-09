"use client";

// src/app/[locale]/ops/page.tsx
// SAT Markets - Data Operations simulation console (Slice 2, bilingual EN/AR).
// SELF-CONTAINED. All data below is SYNTHETIC sample data for testing. Never production.
// Shows: source health, inbound feeds as they arrive, ingestion run log, reconciliation,
// how it appears on the platform (with click-through lineage), verification gate, thin-sample watch, reports.

import { useMemo, useState } from "react";

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
  tag?: "disagreement" | "restated";
  tagAr?: string;
};

type Listing = {
  ref: string; district: string; districtAr: string; asset: string; assetAr: string;
  deal: string; dealAr: string; nafath: boolean; permit: string | null;
  deed: "valid" | "not_found" | "pending"; asking: number | null;
};

type Source = { name: string; nameAr: string; cadence: string; cadenceAr: string; last: string; status: "fresh" | "attention"; note: string; noteAr: string };

type ScenarioKey = "thinDistrict" | "failedDeed" | "brokersDisagree" | "staleRega" | "regaRestatement";

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

const LISTINGS: Listing[] = [
  { ref: "SAT-1847", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256841", deed: "valid", asking: 1550 },
  { ref: "SAT-1902", district: "Al Malaz", districtAr: "الملز", asset: "Warehouse", assetAr: "مستودعات", deal: "Lease", dealAr: "إيجار", nafath: true, permit: "7200256990", deed: "not_found", asking: 205 },
  { ref: "SAT-1955", district: "Al Olaya", districtAr: "العليا", asset: "Office", assetAr: "مكاتب", deal: "Sale", dealAr: "بيع", nafath: true, permit: "7200257050", deed: "pending", asking: null },
];

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

function fmt(n: number): string { return n.toLocaleString("en-US"); }

function buildRows(period: string, scenarios: ScenarioKey[]): IndexRow[] {
  const rows = INDEX.map((row) => ({ ...row }));
  if (period === "2026-07") {
    rows.push({
      district: "An Nakheel",
      districtAr: "النخيل",
      asset: "Office",
      assetAr: "مكاتب",
      segment: "blended",
      segmentEn: "Blended",
      segmentAr: "مجمع",
      low: 900,
      median: 1150,
      high: 1500,
      sufficient: true,
      sourceType: "rega",
      period: "2026-07",
      source: "REGA Rental Index (Ejar)",
      sourceAr: "مؤشر إيجار (الهيئة العامة للعقار)",
      basis: "58 transactions",
      basisAr: "58 صفقة",
      districtResolved: true,
    });
  }

  if (scenarios.includes("thinDistrict")) {
    const target = rows.find((row) => row.district === "Granada" && row.asset === "Retail" && row.segment === "blended");
    if (target) {
      target.sufficient = false;
    }
  }

  if (scenarios.includes("brokersDisagree")) {
    const target = rows.find((row) => row.district === "Al Olaya" && row.asset === "Office" && row.segment === "grade_a" && row.sourceType === "broker");
    if (target) {
      target.sufficient = false;
      target.tag = "disagreement";
      target.tagAr = "اختلاف";
    }
  }

  if (scenarios.includes("regaRestatement")) {
    const target = rows.find((row) => row.district === "Al Olaya" && row.asset === "Office" && row.segment === "blended" && row.sourceType === "rega");
    if (target) {
      target.median = 1650;
      target.tag = "restated";
      target.tagAr = "مُعاد صياغته";
    }
  }

  return rows;
}

function buildListings(scenarios: ScenarioKey[]): Listing[] {
  const listings = LISTINGS.map((listing) => ({ ...listing }));
  if (scenarios.includes("failedDeed")) {
    const target = listings.find((listing) => listing.ref === "SAT-1847");
    if (target) {
      target.deed = "not_found";
    }
  }
  return listings;
}

function buildSources(period: string, scenarios: ScenarioKey[]): Source[] {
  const sources = SOURCES.map((source) => ({ ...source }));
  const rega = sources.find((source) => source.name === "REGA / Ejar Rental Index");
  if (rega) {
    rega.last = scenarios.includes("staleRega") ? "2026-05" : period;
    rega.status = scenarios.includes("staleRega") ? "attention" : "fresh";
    rega.note = scenarios.includes("staleRega") ? `stale, expected ${period}` : "7 rows received";
    rega.noteAr = scenarios.includes("staleRega") ? `قديم، متوقع ${period}` : "7 صفوف مستلمة";
  }

  const broker = sources.find((source) => source.name === "Broker benchmarks (JLL/CBRE/KF)");
  if (broker) {
    broker.status = scenarios.includes("brokersDisagree") ? "attention" : "fresh";
    broker.note = scenarios.includes("brokersDisagree") ? "1 broker disagreement" : "4 rows received";
    broker.noteAr = scenarios.includes("brokersDisagree") ? "اختلاف واحد بين الوسطاء" : "4 صفوف مستلمة";
  }

  return sources;
}

export default function OpsPage({ params }: { params: { locale: string } }) {
  const ar = params.locale === "ar";
  const t = (en: string, arr: string) => (ar ? arr : en);
  const [simPeriod, setSimPeriod] = useState("2026-06");
  const [activeScenarios, setActiveScenarios] = useState<ScenarioKey[]>([]);

  const rows = useMemo(() => buildRows(simPeriod, activeScenarios), [simPeriod, activeScenarios]);
  const listings = useMemo(() => buildListings(activeScenarios), [activeScenarios]);
  const sources = useMemo(() => buildSources(simPeriod, activeScenarios), [simPeriod, activeScenarios]);

  const published = rows.filter((row) => row.sufficient);
  const thin = rows.filter((row) => !row.sufficient);
  const publishedListings = listings.filter((listing) => listing.nafath && listing.permit && listing.deed === "valid");
  const unresolved = rows.filter((row) => !row.districtResolved);
  const expectedOutcomeText = activeScenarios.length > 0 ? activeScenarios.map((scenario) => scenarioDetails[scenario][ar ? "outcomeAr" : "outcome"]).join(" | ") : "";

  const verdictFor = (listing: Listing): { label: string; labelAr: string; tone: string } | null => {
    if (listing.asking == null) return null;
    const band = rows.find((row) => row.district === listing.district && row.asset === listing.asset && row.sufficient && (row.segment === "grade_a" || row.segment === "blended"));
    if (!band) return null;
    const delta = Math.round(((listing.asking - band.median) / band.median) * 100);
    if (delta <= -8) return { label: "Below median (" + delta + "%)", labelAr: "دون الوسيط (" + delta + "%)", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (delta >= 8) return { label: "Above median (+" + delta + "%)", labelAr: "فوق الوسيط (+" + delta + "%)", tone: "text-rose-700 bg-rose-50 border-rose-200" };
    return { label: "Within band (" + delta + "%)", labelAr: "ضمن النطاق (" + delta + "%)", tone: "text-slate-700 bg-slate-50 border-slate-200" };
  };

  const toggleScenario = (scenario: ScenarioKey) => {
    setActiveScenarios((current) => current.includes(scenario) ? current.filter((item) => item !== scenario) : [...current, scenario]);
  };

  const exportCsv = () => {
    const lines = [
      "district,asset,segment,source,period,low,high,median,verdict,tag",
      ...rows.map((row) => [
        `"${row.district}"`,
        `"${row.asset}"`,
        `"${row.segmentEn}"`,
        `"${row.source}"`,
        row.period,
        row.low,
        row.high,
        row.sufficient ? row.median : "Thin sample",
        row.sufficient ? "Sufficient" : "Thin",
        row.tag ?? "",
      ].join(",")),
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reconciliation.csv";
    link.click();
    URL.revokeObjectURL(link.href);
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
        <H n="00" en="Controls" arr="الضوابط" />
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{t("Sim period", "فترة المحاكاة")}</span>
            <div className="flex gap-2">
              {(["2026-06", "2026-07"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSimPeriod(period)}
                  className={"rounded-full border px-3 py-1.5 text-sm " + (simPeriod === period ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700")}
                >
                  {period}
                </button>
              ))}
            </div>
            <button type="button" onClick={exportCsv} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
              {t("Reconciliation CSV", "تصدير CSV للتوحيد")}
            </button>
          </div>
        </div>
      </section>

      <section>
        <H n="01" en="Scenario injector" arr="حقن السيناريوهات" />
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {scenarioOptions.map((scenario) => {
              const active = activeScenarios.includes(scenario.id);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  title={t(scenario.outcome, scenario.outcomeAr)}
                  onClick={() => toggleScenario(scenario.id)}
                  className={"rounded-full border px-3 py-1.5 text-sm " + (active ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700")}
                >
                  {t(scenario.label, scenario.labelAr)}
                </button>
              );
            })}
          </div>
          {activeScenarios.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">{t("Expected outcome", "النتيجة المتوقعة")}</p>
              <p className="mt-1">{expectedOutcomeText}</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <H n="02" en="Source health" arr="حالة المصادر" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((source) => (
            <div key={source.name} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{t(source.name, source.nameAr)}</p>
                <span className={"inline-block h-2 w-2 shrink-0 rounded-full " + (source.status === "fresh" ? "bg-emerald-500" : "bg-amber-500")} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{t(source.cadence, source.cadenceAr)} · {source.last}</p>
              <p className="mt-1 text-xs text-slate-600">{t(source.note, source.noteAr)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <H n="03" en="Inbound feeds (as delivered)" arr="التغذيات الواردة (كما تصل)" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{t("REGA / Ejar rental index - CSV, monthly", "مؤشر إيجار - CSV، شهري")}</div>
            <pre className="overflow-x-auto px-3 py-2 text-xs leading-5 text-slate-700" dir="ltr">{`district,asset_type,avg_rent,band_low,band_high,transactions,period\nAl Olaya,office,1700,1200,2200,412,${simPeriod}`}</pre>
          </div>
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{t("Broker benchmarks - CSV from PDF, quarterly", "مراجع الوسطاء - CSV من PDF، ربعي")}</div>
            <pre className="overflow-x-auto px-3 py-2 text-xs leading-5 text-slate-700" dir="ltr">{`district,asset_type,grade,low,median,high,sources,period\nAl Olaya,office,A,1750,2043,2500,"CBRE;JLL;Knight Frank",2026-Q1`}</pre>
          </div>
        </div>
      </section>

      <section>
        <H n="04" en="Ingestion run log" arr="سجل عملية الاستقبال" />
        <ol className="space-y-1 text-sm text-slate-700">
          <li>{t("Received: 7 REGA rows + 4 broker rows = 11 index rows.", "المستلم: 7 صفوف ريجا + 4 صفوف وسطاء = 11 صف مؤشر.")}</li>
          <li>{t("Validated against SAT schema: 11 / 11 valid (enums, unit sar_sqm_year, required fields).", "التحقق مقابل مخطط سات: 11 / 11 صالحة (القيم، الوحدة، الحقول المطلوبة).")}</li>
          <li>{t("District resolution (SPL): 10 / 11 resolved. Unresolved: An Narjis (queued for crosswalk).", "توحيد الأحياء (سبل): 10 / 11 محلولة. غير محلول: النرجس (بانتظار المطابقة).")}</li>
          <li>{t("Sufficiency gate: 7 sufficient, 4 thin (flagged, no firm band).", "بوابة الكفاية: 7 كافية، 4 قليلة (موسومة، بلا نطاق مؤكد).")}</li>
          <li>{t("Listings: 3 received, 1 published, 2 held for verification.", "الإعلانات: 3 مستلمة، 1 منشور، 2 محجوزة للتحقق.")}</li>
        </ol>
      </section>

      <section>
        <H n="05" en="Reconciliation board" arr="لوحة التوحيد" />
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
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">{ar ? row.districtAr : row.district}{!row.districtResolved && <span className="ms-1 rounded bg-amber-100 px-1 text-xs text-amber-800">{t("unresolved", "غير محلول")}</span>}</td>
                  <td className="px-3 py-2 text-slate-600">{t(row.asset, row.assetAr)} · {t(row.segmentEn, row.segmentAr)}</td>
                  <td className="px-3 py-2 text-slate-600">{t(row.source, row.sourceAr)} · {row.period}</td>
                  <td className="px-3 py-2 text-slate-600" dir="ltr">{fmt(row.low)}-{fmt(row.high)}</td>
                  <td className="px-3 py-2 text-slate-900">{row.sufficient ? fmt(row.median) : t("Thin sample", "عينة قليلة")}</td>
                  <td className="px-3 py-2">
                    {row.sufficient ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Sufficient", "كافٍ")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Thin", "قليل")}</span>}
                    {row.tag && (
                      <span className={"ms-2 rounded border px-2 py-0.5 text-xs " + (row.tag === "restated" || row.tag === "disagreement" ? "border-rose-300 bg-rose-50 text-rose-700" : "")}>{ar ? row.tagAr : row.tag}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H n="06" en="How it appears on the platform (with lineage)" arr="كيف يظهر على المنصة (مع التتبع)" />
        <p className="mb-2 text-xs text-slate-500">{t("This is the public Rent Index view. Open Why on any row to trace the exact source behind it.", "هذا عرض مؤشر الإيجارات العام. افتح لماذا على أي صف لتتبع المصدر الدقيق خلفه.")}</p>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {rows.map((row, index) => (
            <details key={index} className="group px-3 py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <span className="text-slate-900">{ar ? row.districtAr : row.district} · {t(row.asset, row.assetAr)} · {t(row.segmentEn, row.segmentAr)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-slate-900">{row.sufficient ? fmt(row.median) + " " + t("SAR/m2/yr", "ريال/م2/سنة") : t("Thin sample", "عينة قليلة")}</span>
                  <span className="text-xs text-sky-600 group-open:hidden">{t("Why", "لماذا")}</span>
                </span>
              </summary>
              <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                <p>{t("Source", "المصدر")}: {t(row.source, row.sourceAr)}</p>
                <p>{t("Period", "الفترة")}: {row.period}</p>
                <p>{t("Band", "النطاق")}: <span dir="ltr">{fmt(row.low)}-{fmt(row.high)}</span> · {t("Basis", "الأساس")}: {t(row.basis, row.basisAr)}</p>
                <p>{row.sufficient ? t("Passed sufficiency gate, shown as a firm band.", "اجتاز بوابة الكفاية، ويظهر كنطاق مؤكد.") : t("Failed sufficiency gate, shown as thin sample, never a firm number.", "لم يجتز بوابة الكفاية، يظهر كعينة قليلة، وليس رقماً مؤكداً.")}</p>
                {row.tag && <p className="mt-1 font-medium text-rose-700">{ar ? row.tagAr : row.tag}</p>}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <H n="07" en="Verification gate queue" arr="طابور بوابة التحقق" />
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
              {listings.map((listing) => {
                const ok = listing.nafath && !!listing.permit && listing.deed === "valid";
                const verdict = verdictFor(listing);
                return (
                  <tr key={listing.ref} className="border-t border-slate-100">
                    <td className="px-3 py-2"><span className="font-medium text-slate-900" dir="ltr">{listing.ref}</span><span className="text-slate-500"> · {ar ? listing.districtAr : listing.district} · {t(listing.asset, listing.assetAr)} · {t(listing.deal, listing.dealAr)}</span></td>
                    <td className="px-3 py-2">{listing.nafath ? "✓" : "✕"}</td>
                    <td className="px-3 py-2" dir="ltr">{listing.permit ? listing.permit : "-"}</td>
                    <td className="px-3 py-2">{listing.deed === "valid" ? t("Valid", "سارٍ") : listing.deed === "not_found" ? t("Not found", "غير موجود") : t("Pending", "قيد الانتظار")}</td>
                    <td className="px-3 py-2">
                      {ok ? <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{t("Published", "منشور")}</span> : <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{t("Held for review", "محجوز للمراجعة")}</span>}
                      {ok && verdict && <span className={"ms-2 rounded border px-2 py-0.5 text-xs " + verdict.tone}>{ar ? verdict.labelAr : verdict.label}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <H n="08" en="Thin-sample watch and crosswalk queue" arr="مراقبة العينات القليلة وطابور المطابقة" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{t("Thin segments (never shown as a firm band)", "الشرائح القليلة (لا تظهر كنطاق مؤكد)")}</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {thin.map((row, index) => (
                <li key={index}>{ar ? row.districtAr : row.district} · {t(row.asset, row.assetAr)} · {t(row.segmentEn, row.segmentAr)} <span className="text-slate-400">- {t(row.basis, row.basisAr)}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{t("Unresolved districts (SPL crosswalk)", "أحياء غير محلولة (مطابقة سبل)")}</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {unresolved.map((row, index) => (
                <li key={index}>{ar ? row.districtAr : row.district} <span className="text-slate-400">- {t("needs a manual crosswalk to a canonical district id", "يحتاج مطابقة يدوية لمعرّف حي معتمد")}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <H n="09" en="Reports" arr="التقارير" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{published.length}/{rows.length}</p><p className="text-xs text-slate-500">{t("Index cells sufficient", "خلايا المؤشر الكافية")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{publishedListings.length}/{listings.length}</p><p className="text-xs text-slate-500">{t("Listings passing verification", "إعلانات اجتازت التحقق")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{thin.length}</p><p className="text-xs text-slate-500">{t("Reconciliation exceptions", "استثناءات التوحيد")}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-2xl font-semibold text-slate-900">{unresolved.length}</p><p className="text-xs text-slate-500">{t("Districts to crosswalk", "أحياء للمطابقة")}</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Slice 2 now includes a sim clock, a scenario injector, CSV export, and live report totals.", "الشريحة 2 تشمل الآن ساعة محاكاة، وحاقن سيناريوهات، وتصدير CSV، ومجاميع التقارير المباشرة.")}</p>
      </section>

      <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">
        {t("SAT Markets data operations. Synthetic simulation. FAL 1200025510.", "عمليات بيانات سات ماركتس. محاكاة اصطناعية. رخصة فال 1200025510.")}
      </footer>
    </main>
  );
}

const scenarioOptions: Array<{ id: ScenarioKey; label: string; labelAr: string; outcome: string; outcomeAr: string }> = [
  { id: "thinDistrict", label: "Thin district", labelAr: "حي رقيق", outcome: "Granada Retail drops below threshold and renders Thin sample.", outcomeAr: "تتراجع Granada Retail دون الحد وتظهر كعينة قليلة." },
  { id: "failedDeed", label: "Failed deed", labelAr: "صك غير موجود", outcome: "Listing SAT-1847 changes to not_found and moves from Published to Held.", outcomeAr: "يصبح الإعلان SAT-1847 غير موجود ويُحوّل من منشور إلى محجوز." },
  { id: "brokersDisagree", label: "Brokers disagree", labelAr: "اختلاف بين الوسطاء", outcome: "Al Olaya Grade A becomes insufficient and the broker source card turns amber.", outcomeAr: "تصبح Al Olaya Grade A غير كافية وتتحول بطاقة المصدر الخاصة بالوسطاء إلى اللون العنبر." },
  { id: "staleRega", label: "Stale REGA feed", labelAr: "تغذية ريجا قديمة", outcome: "The REGA card shows the prior period and turns amber.", outcomeAr: "تظهر بطاقة ريجا الفترة السابقة وتتحول إلى اللون العنبر." },
  { id: "regaRestatement", label: "REGA restatement", labelAr: "إعادة صياغة ريجا", outcome: "Al Olaya Office Blended median changes from 1700 to 1650 with a restated tag.", outcomeAr: "يتغير وسيط Al Olaya Office Blended من 1700 إلى 1650 مع علامة إعادة صياغة." },
];

const scenarioDetails: Record<ScenarioKey, { outcome: string; outcomeAr: string }> = scenarioOptions.reduce((acc, item) => ({ ...acc, [item.id]: { outcome: item.outcome, outcomeAr: item.outcomeAr } }), {} as Record<ScenarioKey, { outcome: string; outcomeAr: string }>);
