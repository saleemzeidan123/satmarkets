import { fill } from "@/lib/format";
import { foldText } from "@/lib/textFold";

// PKG-ADV-5. What the Advisor can actually answer, read from the index itself.
//
// THE DEFECT THIS EXISTS TO KILL, found on the deployed Advisor.
//
// The route held a list of four example questions and a comment above it that
// read "Every entry here is backed by a sufficient published index segment
// today." Three of the four were not. Production publishes Al Olaya, Al Yasmin,
// Al Malqa, Al Sulaimaniyah, Al Muruj and Al Nakheel; the list named KAFD,
// Granada and Hittin. So a person who asked about KAFD was told there was no
// data and to try Granada, and a person who asked about Granada was told to try
// KAFD. Three of the page's own four starter questions ended the same way.
//
// A list in a source file is a claim about a table, and nothing kept it true.
// The examples are now read from the table, through the same gate that decides
// whether a figure may be shown, so a suggestion is a question that has an
// answer by construction. When the table cannot be read there is no example,
// and the sentence is written to stand without one.

// This half is pure and is imported by the page and the widget as well as the
// route, so a question the page offers and an example the route suggests are
// assembled by one function from one row. The half that reads the table lives
// in `coverage.ts`, which a browser bundle must not import.

export type CoverageRow = {
  district_label: string;
  district_label_ar: string | null;
  asset_type: string;
};

/** The words an example is assembled from. Dictionary strings, both languages. */
export type CoverageCopy = {
  exIn: string;
  exOr: string;
  exOffice: string;
  exRetail: string;
  exMedical: string;
  exShowroom: string;
  exWarehouse: string;
  exServiced: string;
  exEducation: string;
  exLand: string;
};

const ASSET_KEY: Record<string, keyof CoverageCopy> = {
  office: "exOffice",
  retail: "exRetail",
  medical: "exMedical",
  showroom: "exShowroom",
  warehouse: "exWarehouse",
  serviced: "exServiced",
  education: "exEducation",
  land: "exLand",
};

/**
 * The district as a person says it. The index labels one cell "Al Olaya,
 * Riyadh" because two cities have an Al Olaya; inside a sentence the city is a
 * second comma, and the intent reader resolves the district by its own name.
 */
export const shortPlace = (label: string): string => String(label ?? "").split(/[,،]/)[0].trim();

/** "offices in Al Olaya", or null when the asset type has no word here. */
export function examplePhrase(row: CoverageRow, ar: boolean, copy: CoverageCopy): string | null {
  const key = ASSET_KEY[row.asset_type];
  const place = shortPlace(ar ? row.district_label_ar || row.district_label : row.district_label);
  if (!key || !place) return null;
  return fill(copy.exIn, { asset: copy[key], district: place });
}

/**
 * Up to `max` examples, in the index's own order, never the one just asked for.
 *
 * Nothing is drawn by chance. The old pair was picked at random, so the same question
 * could be answered with two different suggestions and a test could not say
 * which. The order of the published rows is the order.
 */
export function coverageExamples(rows: readonly CoverageRow[], ar: boolean, copy: CoverageCopy, exclude?: string | null, max = 2): string {
  const skip = exclude ? foldText(shortPlace(exclude)) : "";
  const usable: { phrase: string; place: string }[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const names = [foldText(shortPlace(r.district_label)), foldText(shortPlace(r.district_label_ar ?? ""))].filter(Boolean);
    if (skip && names.some((n) => n.includes(skip) || skip.includes(n))) continue;
    const p = examplePhrase(r, ar, copy);
    if (!p || seen.has(p)) continue;
    seen.add(p);
    usable.push({ phrase: p, place: names[0] ?? "" });
  }
  // Two districts before two asset types in one district: "offices in Al Olaya
  // or retail units in Al Olaya" tells a reader about one place.
  const out: string[] = [];
  const places = new Set<string>();
  for (const u of usable) {
    if (out.length >= max) break;
    if (places.has(u.place)) continue;
    places.add(u.place);
    out.push(u.phrase);
  }
  for (const u of usable) {
    if (out.length >= max) break;
    if (!out.includes(u.phrase)) out.push(u.phrase);
  }
  return out.join(copy.exOr);
}

/** The three questions the page can put for a published row. */
export type RowQuestion = "average" | "watch" | "find";
export type QuestionCopy = CoverageCopy & { qAverage: string; qWatch: string; qFind: string };

/** "Average rent for offices in Al Olaya", or null when the row cannot be phrased. */
export function rowQuestion(kind: RowQuestion, row: CoverageRow, ar: boolean, copy: QuestionCopy): string | null {
  const key = ASSET_KEY[row.asset_type];
  const place = shortPlace(ar ? row.district_label_ar || row.district_label : row.district_label);
  if (!key || !place) return null;
  const template = kind === "average" ? copy.qAverage : kind === "watch" ? copy.qWatch : copy.qFind;
  return fill(template, { asset: copy[key], district: place });
}
