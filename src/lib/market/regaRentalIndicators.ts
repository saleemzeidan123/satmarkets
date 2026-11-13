// PKG-DATA-2. Reading one official "Rental indicators" file, and refusing it.
//
// The weekly job downloads a file it has never seen from a portal SAT does not
// run, and what it accepts is published without a person looking at it first.
// So this module is written as a list of reasons to say no. A file is accepted
// only when every row of it is the shape the earlier quarters had, and the
// first thing that is not stops the load with the reason in words. A rejected
// file changes nothing a reader sees: the quarter already on the page stays.
//
// It carries counts and nothing else. A commercial row that holds a rent is a
// reason to stop, not a figure to show: showing a commercial rent would be a
// new public claim, and that is a decision for a person.
//
// Pure: bytes in, a verdict out. The route does the network and the database.

export type LeasingKind = "office" | "shop" | "showroom";
export type CountRow = { city: string; district: string; office: number | null; shop: number | null; showroom: number | null };

export type ParsedFile =
  | { ok: true; period: string; region: string; officialRows: number; commercialRows: number; rows: CountRow[] }
  | { ok: false; reason: string };

/** The file's own words for the three commercial property types. */
const KIND: Record<string, LeasingKind> = { "مكتب": "office", "محل": "shop", "معرض تجاري": "showroom" };
const COMMERCIAL = "تجاري";

/**
 * The ten column names every quarter since 2025 has carried, in order. The two
 * rent columns were once written with the currency and once without, so the
 * currency is dropped before comparing and nothing else is forgiven.
 */
const HEADER = ["السنة", "الربع", "المنطقة", "المدينة", "الحي", "نوع العقار", "تصنيف العقار", "عدد الصفقات", "متوسط الايجار", "متوسط الايجار لكل متر مربع"];
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const headerName = (s: string) => tidy(s.replace("ر.س", ""));

export function parseRentalIndicators(bytes: Uint8Array): ParsedFile {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, reason: "the file is not valid UTF-8" };
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return { ok: false, reason: "the file has no rows" };
  if (text.includes('"')) return { ok: false, reason: "the file uses quoted fields, which earlier quarters never did" };

  const header = lines[0].split(",").map(headerName);
  if (header.length !== HEADER.length || header.some((h, i) => h !== HEADER[i])) {
    return { ok: false, reason: "the column names are not the ones earlier quarters carried" };
  }

  let period: string | null = null;
  let region: string | null = null;
  let commercialRows = 0;
  const cells = new Map<string, CountRow>();
  for (const line of lines.slice(1)) {
    const f = line.split(",").map((x) => x.trim());
    if (f.length !== 10) return { ok: false, reason: `a row does not have ten columns: ${line.slice(0, 80)}` };
    const [year, quarter, reg, city, district, type, cls, n, rent, rentSqm] = f;
    if (!/^\d{4}$/.test(year) || !/^[1-4]$/.test(quarter)) return { ok: false, reason: `a row has no year and quarter: ${line.slice(0, 80)}` };
    const p = `${year}-Q${quarter}`;
    if (period === null) period = p;
    else if (p !== period) return { ok: false, reason: `the file mixes ${period} and ${p}` };
    if (region === null) region = reg;
    else if (reg !== region) return { ok: false, reason: "the file mixes regions" };
    if (!city || !district) return { ok: false, reason: `a row names no city or district: ${line.slice(0, 80)}` };
    if (cls !== COMMERCIAL) continue;

    commercialRows++;
    if (rent !== "0" || rentSqm !== "0") return { ok: false, reason: `a commercial row carries a rent: ${line.slice(0, 80)}` };
    const kind = KIND[type];
    if (!kind) return { ok: false, reason: `an unknown commercial property type: ${type}` };
    if (!/^[1-9]\d{0,8}$/.test(n)) return { ok: false, reason: `a contract count is not a positive whole number: ${line.slice(0, 80)}` };
    const key = city + "\u0000" + district;
    const cell = cells.get(key) ?? { city, district, office: null, shop: null, showroom: null };
    if (cell[kind] !== null) return { ok: false, reason: `two rows for one district and type: ${line.slice(0, 80)}` };
    cell[kind] = Number(n);
    cells.set(key, cell);
  }
  if (period === null || region === null) return { ok: false, reason: "the file has no rows" };
  if (commercialRows === 0) return { ok: false, reason: "the file has no commercial rows" };
  return { ok: true, period, region, officialRows: lines.length - 1, commercialRows, rows: [...cells.values()] };
}

const ORDINAL: Record<string, string> = { "1st": "1", "2nd": "2", "3rd": "3", "4th": "4" };

/**
 * What a dataset title on the portal says it is, or null when it is not one of
 * these files. The period read from the title must agree with the period read
 * from the rows; the route checks that, because a title is a label and the rows
 * are the fact.
 */
export function rentalIndicatorsTitle(titleEn: string): { regionEn: string; period: string } | null {
  const m = /^Rental indicators in (.+) region (1st|2nd|3rd|4th) Q (\d{4})$/.exec(tidy(titleEn));
  return m ? { regionEn: m[1], period: `${m[3]}-Q${ORDINAL[m[2]]}` } : null;
}

/** The regions the job loads, by the portal's English name, with the name the files use. */
export const LOADED_REGIONS: Record<string, string> = { Riyadh: "الرياض" };

export const PORTAL = {
  origin: "https://open.data.gov.sa",
  /** The Real Estate General Authority's publisher id on the portal. */
  publisherId: "fb522d21-fd36-4842-ac14-d838502a292b",
  datasetUrl: (id: string) => `https://open.data.gov.sa/en/datasets/view/${id}`,
  fileUrl: (path: string) => `https://open.data.gov.sa/odp-public/${path.split("/").map(encodeURIComponent).join("/")}`,
} as const;
