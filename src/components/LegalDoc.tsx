import type { LegalDocContent } from "@/lib/legalContent";

export default function LegalDoc({ locale, doc }: { locale: "en" | "ar"; doc: LegalDocContent }) {
  const ar = locale === "ar";
  const title = ar ? doc.titleAr : doc.titleEn;
  const draft = ar ? doc.draftAr : doc.draftEn;
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--sans)", color: "var(--ink)" }}>
      <div role="note" style={{ border: "1px solid #E4B96B", background: "#FBF3E2", color: "#6B4E1F", borderRadius: 10, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, marginBottom: 22 }}>
        {draft}
      </div>
      <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 20px" }}>{title}</h1>
      {doc.sections.map((s, i) => (
        <section key={i} style={{ marginTop: 22 }}>
          <h2 className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{ar ? s.hAr : s.hEn}</h2>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.85, margin: 0 }}>{ar ? s.ar : s.en}</p>
        </section>
      ))}
    </div>
  );
}
