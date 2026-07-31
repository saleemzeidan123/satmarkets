import { RENT_INDEX_SOURCE } from "@/lib/market/attribution";

// ADV-1C.1 correction 2. The one place a registered source is named in code.
//
// WHAT WAS WRONG.
//
// Codex asked whether SAT keeps two registries, a database one and a runtime
// passport one. The answer is neither and worse: there is ONE rights authority,
// the `public.source_registry` table, and there were THREE independent code
// artifacts that each spelled out the source ids by hand.
//
//   1. `DECLARED_SOURCES` and `SOURCE_COPY` in `src/lib/publishedRecords.ts`,
//      giving `/sources` its reading order and its dictionary keys.
//   2. `SOURCE_OWNER` in `src/lib/evidenceView.ts`, giving the passport its
//      bilingual owner names.
//   3. A bare `const source_id = "rega_ejar"` inside the rent ingest pipeline.
//
// Three hand-written lists of the same nine ids is not a registry, it is three
// chances to disagree. A source added to the database appears on `/sources` as a
// bare id, appears in a passport as a bare id, and is ingested under a string
// literal that no test can connect to either.
//
// WHAT THIS FILE IS, AND WHAT IT IS NOT.
//
// It is the CATALOGUE: which sources this build knows about, what order they
// read in, which dictionary keys describe them, and what the publishing body is
// called in each language. All of that is presentation, and all of it is static.
//
// It is NOT the rights authority. Whether a source may be redisplayed, derived
// from, exported or retrieved is decided in `public.source_registry` and read at
// request time through `src/lib/queries/sourceRights.ts`. Nothing in this file
// grants anything. A source can sit in this catalogue and be denied everything,
// which is exactly what happens today, and the catalogue is what lets the denial
// be reported with the source's real name instead of its id.
//
// The boundary is therefore: catalogue answers "what is it called", register
// answers "what may we do with it". They are joined at render time and never
// merged, because merging them would let a build-time constant participate in a
// permission decision.

/** The dictionary key pair on `sources.*` that names and describes a source. */
export type SourceCopyKey =
  | "Gastat"
  | "Rega"
  | "Broker"
  | "Fsq"
  | "Mapbox"
  | "Permit"
  | "Nafath"
  | "Wathq"
  | "Spl";

export type SourceCatalogueEntry = {
  /** The registered id, matching `source_registry.source_id`. */
  readonly id: string;
  /** The dictionary key pair that names and describes it on /sources. */
  readonly copyKey: SourceCopyKey;
  /** The publishing body, English then Arabic. A name needs both or parity breaks. */
  readonly owner: readonly [string, string];
};

/**
 * The catalogue, in the order `/sources` reads it. A map has no reading order,
 * so the order is the array's, and the array is the declaration.
 */
export const SOURCE_CATALOGUE: readonly SourceCatalogueEntry[] = [
  {
    id: "gastat_sama",
    copyKey: "Gastat",
    owner: ["General Authority for Statistics and SAMA", "الهيئة العامة للإحصاء ومؤسسة النقد"],
  },
  {
    id: "rega_ejar",
    copyKey: "Rega",
    // Not a hand-written name. Owner ruling 2 requires every Rent Index
    // reference to carry the canonical attribution, and a second spelling of it
    // living here is exactly the defect `market/attribution.ts` was created to
    // end. The passport row is headed "Source", so the canonical clause is also
    // the right thing to print there.
    owner: [RENT_INDEX_SOURCE.en, RENT_INDEX_SOURCE.ar],
  },
  {
    id: "broker_overlay",
    copyKey: "Broker",
    owner: ["Licensed brokers filing on SAT Markets", "وسطاء مرخّصون يودعون عبر سات ماركتس"],
  },
  {
    id: "fsq_os_places",
    copyKey: "Fsq",
    owner: ["Foursquare Open Source Places", "فورسكوير للأماكن مفتوحة المصدر"],
  },
  {
    id: "foursquare_mapbox",
    copyKey: "Mapbox",
    owner: ["Foursquare, through Mapbox", "فورسكوير، عبر ماببوكس"],
  },
  {
    id: "rega_permit",
    copyKey: "Permit",
    owner: ["Real Estate General Authority", "الهيئة العامة للعقار"],
  },
  {
    id: "nafath",
    copyKey: "Nafath",
    owner: ["National Single Sign On (Nafath)", "النفاذ الوطني الموحد (نفاذ)"],
  },
  {
    id: "wathq_deeds",
    copyKey: "Wathq",
    owner: ["Ministry of Justice, through Wathq", "وزارة العدل، عبر وثق"],
  },
  {
    id: "spl_address",
    copyKey: "Spl",
    owner: ["Saudi Post (SPL) National Address", "البريد السعودي (سبل) العنوان الوطني"],
  },
];

/**
 * The REGA Rental Index (Ejar) source id, as one exported constant.
 *
 * The rent ingest pipeline used to carry this as a string literal in its own
 * function body, so nothing connected the row it wrote to the register row that
 * governs it. Codex gate 3 asks that the REGA source resolve through one
 * canonical path; this constant plus `catalogue.test.ts` is that path.
 */
export const REGA_RENT_INDEX_SOURCE_ID = "rega_ejar";

/** Declared reading order for the source register. */
export const DECLARED_SOURCES: readonly string[] = SOURCE_CATALOGUE.map((e) => e.id);

/** source_id to the dictionary key pair that names and describes it. */
export const SOURCE_COPY: Record<string, SourceCopyKey> = Object.fromEntries(
  SOURCE_CATALOGUE.map((e) => [e.id, e.copyKey])
);

const OWNER_BY_ID: Record<string, readonly [string, string]> = Object.fromEntries(
  SOURCE_CATALOGUE.map((e) => [e.id, e.owner])
);

/**
 * The publishing body behind a registered source id, in the reader's language.
 *
 * An id with no entry falls back to the id itself, which is a single token in
 * Latin characters and reads the same in both languages. A source added to the
 * register tomorrow therefore appears unlabelled rather than nameless, and the
 * `/sources` page shows it rather than dropping it.
 */
export function sourceOwnerLabel(sourceId: string, ar: boolean): string {
  const e = OWNER_BY_ID[sourceId];
  return e ? e[ar ? 1 : 0] : sourceId;
}
