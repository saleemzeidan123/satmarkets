"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Init = {
  about_en: string;
  about_ar: string;
  website: string;
  public_email: string;
  public_phone: string;
  logo_url: string;
};

// The owner's editor for their PUBLIC profile: the about text, website, public
// contact, and logo that appear on their public lister page. Identity and
// verification are shown elsewhere, read-only.
export default function ProfileForm({ locale, init }: { locale: string; init: Init }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [f, setF] = useState<Init>(init);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Init, v: string) => setF((p) => ({ ...p, [k]: v }));

  const inp: React.CSSProperties = { width: "100%", borderRadius: 8, border: "1px solid var(--silver-2)", padding: "9px 11px", fontSize: "0.84375rem", color: "var(--ink)", background: "var(--paper)", fontFamily: "var(--sans)" };
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--slate)", marginBottom: 5, fontWeight: 600 };

  const t = ar ? {
    aboutEn: "نبذة (بالإنجليزية)", aboutAr: "نبذة (بالعربية)", website: "الموقع الإلكتروني",
    email: "بريد عام للتواصل", phone: "هاتف عام للتواصل", logo: "رابط الشعار",
    save: "حفظ الملف", saving: "جارٍ الحفظ...", saved: "تم حفظ الملف", err: "تعذّر الحفظ",
    hint: "تظهر هذه المعلومات في صفحتك العامة التي يراها المستأجرون.",
  } : {
    aboutEn: "About (English)", aboutAr: "About (Arabic)", website: "Website",
    email: "Public contact email", phone: "Public contact phone", logo: "Logo URL",
    save: "Save profile", saving: "Saving...", saved: "Profile saved", err: "Could not save",
    hint: "This is what tenants see on your public profile page.",
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/account`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: j.error || t.err }); setBusy(false); return; }
      setMsg({ ok: true, text: t.saved });
      setBusy(false);
      router.refresh();
    } catch {
      setMsg({ ok: false, text: t.err }); setBusy(false);
    }
  }

  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="muted" style={{ fontSize: "0.78125rem", margin: 0 }}>{t.hint}</p>
      {/* ELITE-4 J1-1: every label was bare, so no field had a programmatic name.
          Each control now carries an id and its label the matching htmlFor. */}
      <div>
        <label htmlFor="pf-about-en" style={lbl}>{t.aboutEn}</label>
        <textarea id="pf-about-en" style={{ ...inp, minHeight: 88, resize: "vertical" }} value={f.about_en} onChange={(e) => set("about_en", e.target.value)} />
      </div>
      <div>
        <label htmlFor="pf-about-ar" style={lbl}>{t.aboutAr}</label>
        <textarea id="pf-about-ar" dir="rtl" style={{ ...inp, minHeight: 88, resize: "vertical" }} value={f.about_ar} onChange={(e) => set("about_ar", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="pf-website" style={lbl}>{t.website}</label>
          <input id="pf-website" style={inp} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </div>
        <div>
          <label htmlFor="pf-logo" style={lbl}>{t.logo}</label>
          <input id="pf-logo" style={inp} value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label htmlFor="pf-public-email" style={lbl}>{t.email}</label>
          <input id="pf-public-email" style={inp} type="email" value={f.public_email} onChange={(e) => set("public_email", e.target.value)} />
        </div>
        <div>
          <label htmlFor="pf-public-phone" style={lbl}>{t.phone}</label>
          <input id="pf-public-phone" style={inp} value={f.public_phone} onChange={(e) => set("public_phone", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? t.saving : t.save}</button>
        {msg && <span style={{ fontSize: "0.8125rem", color: msg.ok ? "var(--harbor-d)" : "var(--red)" }}>{msg.text}</span>}
      </div>
    </form>
  );
}
