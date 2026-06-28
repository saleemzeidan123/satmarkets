// src/lib/market/verdict.ts
//
// Market-rent verdict: grade a listing's asking rent against the SAT Rent Index.
// This is what turns a listing from "a price" into "a priced fairly / priced high
// / good value" call, grounded in SAT's own verified index. Indicative market
// context, NOT financial advice (per the Rent Index doctrine).

export interface IndexRow {
  asset_type: string;
  segment: string;
  unit: string; // expect "sar_sqm_year"
  band_low: number | null;
  median: number | null;
  band_high: number | null;
  period: string;
  district_label?: string | null;
  district_label_ar?: string | null;
}

export type VerdictStatus = "below" | "within" | "above" | "na";

export interface Verdict {
  status: VerdictStatus;
  deltaPct: number | null; // vs median, negative = cheaper than median
  median: number | null;
  band_low: number | null;
  band_high: number | null;
  period: string | null;
  segment: string | null;
  line_en: string;
  line_ar: string;
}

// Preferred index segment(s) per asset type, in priority order. The first that
// exists for the district (with a usable per-sqm-year median) is used.
const SEGMENT_PREF: Record<string, string[]> = {
  office: ["grade_a", "grade_b", "blended"],
  retail: ["street_front", "mall_inline", "blended"],
  warehouse: ["modern", "older", "blended"],
  showroom: ["listing", "blended"],
  medical: ["clinic", "blended"],
  land: ["ground_lease", "blended"],
  education: ["school", "blended"],
  hospitality: ["hotel", "blended"],
  mixed_use: ["blended"],
  serviced: ["serviced"], // priced per desk/month; handled as n/a for /sqm
};

// Office grade refines the segment choice.
function preferredSegments(assetType: string, grade?: string | null): string[] {
  const base = SEGMENT_PREF[assetType] || ["blended"];
  if (assetType === "office" && grade) {
    if (grade === "a_plus" || grade === "a") return ["grade_a", "grade_b", "blended"];
    if (grade === "b" || grade === "c") return ["grade_b", "grade_a", "blended"];
  }
  return base;
}

const SEG_LABEL_EN: Record<string, string> = {
  grade_a: "Grade A offices",
  grade_b: "Grade B offices",
  street_front: "street-front retail",
  mall_inline: "mall inline retail",
  modern: "modern warehouse",
  older: "older warehouse",
  listing: "showroom",
  clinic: "medical clinic",
  ground_lease: "ground lease",
  school: "education",
  hotel: "hospitality",
  blended: "blended market",
};
const SEG_LABEL_AR: Record<string, string> = {
  grade_a: "المكاتب من الفئة A",
  grade_b: "المكاتب من الفئة B",
  street_front: "التجزئة على الواجهة",
  mall_inline: "تجزئة الممرات الداخلية",
  modern: "المستودعات الحديثة",
  older: "المستودعات الأقدم",
  listing: "صالات العرض",
  clinic: "العيادات الطبية",
  ground_lease: "إيجار الأرض",
  school: "التعليم",
  hotel: "الضيافة",
  blended: "السوق المجمّع",
};

function num(n: number): string {
  return n.toLocaleString("en-US");
}

/** Pick the best index row for a listing from candidate rows of its district. */
export function pickIndexRow(
  rows: IndexRow[],
  assetType: string,
  grade?: string | null,
): IndexRow | null {
  const cands = rows.filter(
    (r) => r.asset_type === assetType && r.unit === "sar_sqm_year" && r.median != null,
  );
  if (cands.length === 0) return null;
  for (const seg of preferredSegments(assetType, grade)) {
    const hit = cands.find((r) => r.segment === seg);
    if (hit) return hit;
  }
  return cands[0];
}

/** Grade asking_rent_sqm against an index row. */
export function marketVerdict(
  askingRentSqm: number | null | undefined,
  row: IndexRow | null,
  districtEn?: string | null,
  districtAr?: string | null,
): Verdict {
  if (!askingRentSqm || !row || row.median == null) {
    return {
      status: "na",
      deltaPct: null,
      median: row?.median ?? null,
      band_low: row?.band_low ?? null,
      band_high: row?.band_high ?? null,
      period: row?.period ?? null,
      segment: row?.segment ?? null,
      line_en: "No SAT Rent Index baseline for this space yet.",
      line_ar: "لا يوجد أساس من مؤشر SAT للإيجارات لهذه المساحة بعد.",
    };
  }
  const asking = Number(askingRentSqm);
  const median = Number(row.median);
  const low = row.band_low != null ? Number(row.band_low) : median;
  const high = row.band_high != null ? Number(row.band_high) : median;
  const deltaPct = Math.round(((asking - median) / median) * 100);

  let status: VerdictStatus;
  if (asking <= low) status = "below";
  else if (asking >= high) status = "above";
  else status = "within";

  const dEn = `${num(asking)} SAR/m²`;
  const dAr = `${num(asking)} ريال/م²`;
  const dist = districtEn || row.district_label || "";
  const distAr = districtAr || row.district_label_ar || dist;
  const segEn = SEG_LABEL_EN[row.segment] || row.segment;
  const segAr = SEG_LABEL_AR[row.segment] || row.segment;
  const bandEn = `band ${num(low)}–${num(high)}`;
  const bandAr = `النطاق ${num(low)}–${num(high)}`;
  const absD = Math.abs(deltaPct);

  let verdictEn: string, verdictAr: string;
  if (status === "below") {
    verdictEn = `about ${absD}% below the ${row.period} median for ${segEn} in ${dist} (${bandEn}). Strong value.`;
    verdictAr = `أقل بنحو ${absD}% من وسيط ${row.period} لـ${segAr} في ${distAr} (${bandAr}). قيمة ممتازة.`;
  } else if (status === "above") {
    verdictEn = `about ${absD}% above the ${row.period} median for ${segEn} in ${dist} (${bandEn}). Priced above market.`;
    verdictAr = `أعلى بنحو ${absD}% من وسيط ${row.period} لـ${segAr} في ${distAr} (${bandAr}). سعر أعلى من السوق.`;
  } else {
    const rel = deltaPct < 0 ? `${absD}% below median` : deltaPct > 0 ? `${absD}% above median` : "at the median";
    const relAr = deltaPct < 0 ? `أقل بـ${absD}% من الوسيط` : deltaPct > 0 ? `أعلى بـ${absD}% من الوسيط` : "عند الوسيط";
    verdictEn = `within the ${row.period} market range for ${segEn} in ${dist} (${rel}, ${bandEn}). Fairly priced.`;
    verdictAr = `ضمن نطاق ${row.period} لـ${segAr} في ${distAr} (${relAr}، ${bandAr}). سعر عادل.`;
  }

  return {
    status,
    deltaPct,
    median,
    band_low: low,
    band_high: high,
    period: row.period,
    segment: row.segment,
    line_en: `${dEn}, ${verdictEn} Indicative, not advice.`,
    line_ar: `${dAr}، ${verdictAr} مؤشر استرشادي وليس نصيحة.`,
  };
}
