// The verification-document taxonomy, shared by the upload route, the intake form,
// and the reviewer console. Data, not logic. These map to the listing_document_kind
// Postgres enum. Labels are app-level (no DB enum labels), bilingual. No em dashes.

export type DocumentKind =
  | "deed"
  | "ejar"
  | "cr"
  | "municipal_licence"
  | "ad_licence"
  | "authorization"
  | "other";

export const DOCUMENT_KINDS: DocumentKind[] = [
  "deed",
  "ejar",
  "cr",
  "municipal_licence",
  "ad_licence",
  "authorization",
  "other",
];

// [en, ar]. "deed" is the title deed (صك). Never conflate with a survey (kroki).
const LABELS: Record<DocumentKind, [string, string]> = {
  deed: ["Title deed (Sakk)", "صك الملكية"],
  ejar: ["Ejar contract", "عقد إيجار"],
  cr: ["Commercial registration", "السجل التجاري"],
  municipal_licence: ["Municipal licence", "رخصة بلدية"],
  ad_licence: ["Advertising licence", "رخصة إعلان عقاري"],
  authorization: ["Authorization to market", "تفويض بالتسويق"],
  other: ["Other document", "مستند آخر"],
};

export function isDocumentKind(v: unknown): v is DocumentKind {
  return typeof v === "string" && (DOCUMENT_KINDS as string[]).includes(v);
}

export function documentLabel(kind: unknown, ar = false): string {
  const k = isDocumentKind(kind) ? kind : "other";
  return LABELS[k][ar ? 1 : 0];
}
