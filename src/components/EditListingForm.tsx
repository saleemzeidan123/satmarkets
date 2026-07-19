"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// The owner's self-serve editor for a listing. Scoped to the fields an owner may
// safely change; the licence and verification live elsewhere and are read-only. On
// save it PATCHes and refreshes, so the change is visible immediately.
type Init = {
  title_en: string;
  description_en: string;
  area_sqm: string;
  price: string;
  deal_type: string;
  contact_phone: string;
  contact_email: string;
  contact_channels: string[];
};

export default function EditListingForm({ id, locale, init }: { id: string; locale: string; init: Init }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [f, setF] = useState<Init>(init);
  const [ch, setCh] = useState<Record<string, boolean>>({
    whatsapp: init.contact_channels.includes("whatsapp"),
    call: init.contact_channels.includes("call"),
    email: init.contact_channels.includes("email"),
    message: init.contact_channels.includes("message"),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Init, v: string) => setF((p) => ({ ...p, [k]: v }));

  const inp: React.CSSProperties = { width: "100%", borderRadius: 8, border: "1px solid var(--silver-2)", padding: "9px 11px", fontSize: 13.5, color: "var(--ink)", background: "#fff", fontFamily: "var(--sans)" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--slate)", marginBottom: 5, fontWeight: 600 };

  const t = ar ? {
    title: "العنوان", desc: "الوصف", area: "المساحة (م²)",
    price: init.deal_type === "lease" ? "الإيجار المطلوب (ريال/م²·سنة)" : "سعر البيع (ريال)",
    phone: "هاتف التواصل", email: "البريد الإلكتروني", channels: "كيف يصل إليك المهتمّون",
    save: "حفظ التعديلات", saving: "جارٍ الحفظ...", saved: "تم حفظ التعديلات", err: "تعذّر الحفظ",
    chLabels: { whatsapp: "واتساب", call: "اتصال", email: "بريد", message: "رسالة عبر سات" } as Record<string, string>,
  } : {
    title: "Title", desc: "Description", area: "Size (m²)",
    price: init.deal_type === "lease" ? "Asking rent (SAR/m²·yr)" : "Sale price (SAR)",
    phone: "Contact phone", email: "Contact email", channels: "How people reach you",
    save: "Save changes", saving: "Saving...", saved: "Changes saved", err: "Could not save",
    chLabels: { whatsapp: "WhatsApp", call: "Call", email: "Email", message: "Message on SAT" } as Record<string, string>,
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title_en: f.title_en,
          description_en: f.description_en,
          area_sqm: f.area_sqm,
          price: f.price,
          contact_phone: f.contact_phone,
          contact_email: f.contact_email,
          contact_channels: Object.entries(ch).filter(([, v]) => v).map(([k]) => k),
        }),
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
      <div>
        <label style={lbl}>{t.title}</label>
        <input style={inp} value={f.title_en} onChange={(e) => set("title_en", e.target.value)} required />
      </div>
      <div>
        <label style={lbl}>{t.desc}</label>
        <textarea style={{ ...inp, minHeight: 92, resize: "vertical" }} value={f.description_en} onChange={(e) => set("description_en", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>{t.area}</label>
          <input style={inp} type="number" step="any" value={f.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>{t.price}</label>
          <input style={inp} type="number" step="any" value={f.price} onChange={(e) => set("price", e.target.value)} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>{t.phone}</label>
          <input style={inp} value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>{t.email}</label>
          <input style={inp} type="email" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </div>
      </div>
      <div>
        <label style={lbl}>{t.channels}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13 }}>
          {(["whatsapp", "call", "email", "message"] as const).map((k) => (
            <label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={!!ch[k]} onChange={(e) => setCh((p) => ({ ...p, [k]: e.target.checked }))} /> {t.chLabels[k]}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? t.saving : t.save}</button>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? "var(--green)" : "#C8412E" }}>{msg.text}</span>}
      </div>
    </form>
  );
}
