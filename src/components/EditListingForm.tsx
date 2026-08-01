"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { intakeFields, hasRegistry, type AssetField, type DisplaySection } from "@/lib/assetFields";
import { changedArabic } from "@/lib/listingArabic";

// The owner's self-serve editor for a listing. It covers the fields an owner may
// safely change: the headline, description, size, price, contact routing, AND the
// full per-asset registry of property details (grade, fit-out, clear height,
// compliance flags, and so on), rendered from the same registry the create form
// uses and validated server-side by the same pipeline. The licence and verification
// live elsewhere and are read-only. On save it PATCHes and refreshes.
//
// The registry renderer here is a deliberate sibling of the Listing Studio's:
// same registry, same field types, dashboard styling instead of the Studio's.
//
// PKG-LS1. Both languages, in both title and description. Until this package the
// form had one title box and one description box, both writing the English
// columns, under labels that were translated into whatever language the lister
// was reading. An Arabic-reading lister was therefore shown a box labelled
// "العنوان" and their Arabic sentence was stored as the English title. The same
// screen had just been given a PKG-NM1 notice telling them an Arabic reader sees
// a generic description of their space, with no field on the page able to answer
// it. `PATCH /api/listings/[id]` had accepted `title_ar` and `description_ar`
// behind the same permission check the whole time, so nothing but the form was
// missing. Labels now name their language, and the inputs carry the `dir` and
// `lang` of the text they hold rather than of the interface around them.
type Init = {
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  area_sqm: string;
  price: string;
  deal_type: string;
  video_url: string;
  contact_phone: string;
  contact_email: string;
  contact_channels: string[];
};

// These are captured by the base fields (Size / Asking or Sale price) so the
// per-asset registry section never shows them a second time.
const BASE_OWNED = new Set(["asking_rent_sqm", "sale_price"]);
const SECTION_ORDER: DisplaySection[] = ["space", "commercial", "compliance"];
const sectionLabel = (s: DisplaySection, ar: boolean): string => {
  if (s === "commercial") return ar ? "الشروط التجارية" : "Commercial terms";
  if (s === "compliance") return ar ? "الامتثال والتصاريح" : "Compliance and permits";
  return ar ? "المساحة" : "The space";
};

export default function EditListingForm({
  id, locale, assetType, init, initAttrs, titleArBehind = false, descArBehind = false,
}: {
  id: string; locale: string; assetType: string; init: Init; initAttrs: Record<string, unknown>;
  /** The stored Arabic was written against English that has since changed. Decided on the server by `arabicIsBehind`, which is silent when the record cannot answer. */
  titleArBehind?: boolean;
  descArBehind?: boolean;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [f, setF] = useState<Init>(init);
  const [attrs, setAttrs] = useState<Record<string, unknown>>(initAttrs);
  const [ch, setCh] = useState<Record<string, boolean>>({
    whatsapp: init.contact_channels.includes("whatsapp"),
    call: init.contact_channels.includes("call"),
    email: init.contact_channels.includes("email"),
    message: init.contact_channels.includes("message"),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Init, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setAttr = (k: string, v: unknown) => setAttrs((p) => ({ ...p, [k]: v }));

  const inp: React.CSSProperties = { width: "100%", borderRadius: 8, border: "1px solid var(--silver-2)", padding: "9px 11px", fontSize: 13.5, color: "var(--ink)", background: "var(--paper)", fontFamily: "var(--sans)" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--slate)", marginBottom: 5, fontWeight: 600 };
  const hint: React.CSSProperties = { fontSize: 11, color: "var(--slate)", marginTop: 4, opacity: 0.8 };

  const t = ar ? {
    titleEn: "العنوان بالإنجليزية", titleAr: "العنوان بالعربية",
    descEn: "الوصف بالإنجليزية", descAr: "الوصف بالعربية",
    arTitleHint: "إذا تركته فارغاً، يرى القارئ بالعربية وصفاً موجزاً للمساحة بدل عنوان كتبته أنت.",
    behind: "كُتب هذا النص استناداً إلى نسخة إنجليزية سابقة، وقد لا يطابق ما هو منشور الآن.",
    area: "المساحة (م²)",
    price: init.deal_type === "lease" ? "الإيجار المطلوب (ريال/م²·سنة)" : "سعر البيع (ريال)",
    phone: "هاتف التواصل", email: "البريد الإلكتروني", channels: "كيف يصل إليك المهتمّون", video: "رابط جولة الفيديو (اختياري)",
    save: "حفظ التعديلات", saving: "جارٍ الحفظ...", saved: "تم حفظ التعديلات", err: "تعذّر الحفظ",
    details: "تفاصيل العقار", notSpec: "غير محدّد", yes: "نعم", no: "لا", choose: "اختر", more: "المزيد من التفاصيل",
    statedNote: "كل ما تُدخله يظهر كأنه من ذكر المُعلن حتى تتحقق منه سات.",
    missing: "أكمل الحقول المطلوبة: ",
    chLabels: { whatsapp: "واتساب", call: "اتصال", email: "بريد", message: "رسالة عبر سات" } as Record<string, string>,
  } : {
    titleEn: "English title", titleAr: "Arabic title",
    descEn: "English description", descAr: "Arabic description",
    arTitleHint: "Left empty, an Arabic reader is shown a short description of the space instead of a title you wrote.",
    behind: "This was written against an earlier English version, so it may no longer match what is published.",
    area: "Size (m²)",
    price: init.deal_type === "lease" ? "Asking rent (SAR/m²·yr)" : "Sale price (SAR)",
    phone: "Contact phone", email: "Contact email", channels: "How people reach you", video: "Video tour URL (optional)",
    save: "Save changes", saving: "Saving...", saved: "Changes saved", err: "Could not save",
    details: "Property details", notSpec: "Not specified", yes: "Yes", no: "No", choose: "Select", more: "Add more detail",
    statedNote: "Everything you enter shows as stated by the lister until SAT verifies it.",
    missing: "Please complete the required fields: ",
    chLabels: { whatsapp: "WhatsApp", call: "Call", email: "Email", message: "Message on SAT" } as Record<string, string>,
  };

  function renderField(field: AssetField) {
    const label = (ar ? field.label_ar : field.label_en) + (field.unit ? ` (${field.unit})` : "") + (field.required ? " *" : "");
    const help = ar ? field.help_ar : field.help_en;
    const val = attrs[field.key];
    if (field.type === "boolean") {
      return (
        <label key={field.key} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={val === true} onChange={(e) => setAttr(field.key, e.target.checked)} />
          <span>{ar ? field.label_ar : field.label_en}</span>
        </label>
      );
    }
    if (field.type === "tristate") {
      return (
        <div key={field.key}>
          <label style={lbl}>{label}</label>
          <select style={inp} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)}>
            <option value="">{t.notSpec}</option>
            <option value="yes">{t.yes}</option>
            <option value="no">{t.no}</option>
          </select>
          {help && <p style={hint}>{help}</p>}
        </div>
      );
    }
    if (field.type === "enum") {
      const opts = field.validation?.enum ?? [];
      return (
        <div key={field.key}>
          <label style={lbl}>{label}</label>
          <select style={inp} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)}>
            <option value="">{t.choose}</option>
            {opts.map((o) => <option key={o} value={o}>{field.options?.[o]?.[ar ? 1 : 0] ?? o.replace(/_/g, " ")}</option>)}
          </select>
          {help && <p style={hint}>{help}</p>}
        </div>
      );
    }
    const numeric = field.type === "number" || field.type === "integer" || field.type === "money";
    return (
      <div key={field.key}>
        <label style={lbl}>{label}</label>
        <input style={inp} type={numeric ? "number" : "text"} step={numeric ? "any" : undefined} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)} placeholder={ar ? field.label_ar : field.label_en} />
        {help && <p style={hint}>{help}</p>}
      </div>
    );
  }

  const perAsset = intakeFields(assetType).filter((x) => !BASE_OWNED.has(x.key));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    // Pre-flight the required per-asset fields so the owner sees which are missing
    // rather than a generic server rejection. The server remains authoritative.
    const missing = perAsset.filter(
      (x) => x.required && (attrs[x.key] === undefined || attrs[x.key] === "" || attrs[x.key] === null),
    );
    if (missing.length) {
      setMsg({ ok: false, text: t.missing + missing.map((x) => (ar ? x.label_ar : x.label_en)).join(ar ? "، " : ", ") });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title_en: f.title_en,
          description_en: f.description_en,
          // Only when the lister actually changed them: the API stamps
          // `title_ar_src_hash` against the English of the same save whenever the
          // body carries the Arabic, and stamping that on a save the lister spent
          // entirely in the English box would record a fact nobody performed. See
          // `changedArabic`.
          ...changedArabic(f, init),
          area_sqm: f.area_sqm,
          price: f.price,
          video_url: f.video_url,
          contact_phone: f.contact_phone,
          contact_email: f.contact_email,
          contact_channels: Object.entries(ch).filter(([, v]) => v).map(([k]) => k),
          attributes: attrs,
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
        <label style={lbl} htmlFor="title_en">{t.titleEn}</label>
        <input id="title_en" dir="ltr" lang="en" style={inp} value={f.title_en} onChange={(e) => set("title_en", e.target.value)} required />
      </div>
      <div>
        <label style={lbl} htmlFor="title_ar">{t.titleAr}</label>
        <input id="title_ar" dir="rtl" lang="ar" style={inp} value={f.title_ar} onChange={(e) => set("title_ar", e.target.value)} />
        {/* Not the Studio's "SAT drafts it from the English" line: only the Studio
            calls the translate route, so on this screen that would be a promise
            nothing keeps. What is true here is what an Arabic reader actually
            gets when the field is empty. */}
        <p style={hint}>{titleArBehind ? t.behind : t.arTitleHint}</p>
      </div>
      <div>
        <label style={lbl} htmlFor="description_en">{t.descEn}</label>
        <textarea id="description_en" dir="ltr" lang="en" style={{ ...inp, minHeight: 92, resize: "vertical" }} value={f.description_en} onChange={(e) => set("description_en", e.target.value)} />
      </div>
      <div>
        <label style={lbl} htmlFor="description_ar">{t.descAr}</label>
        <textarea id="description_ar" dir="rtl" lang="ar" style={{ ...inp, minHeight: 92, resize: "vertical" }} value={f.description_ar} onChange={(e) => set("description_ar", e.target.value)} />
        {descArBehind && <p style={hint}>{t.behind}</p>}
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

      {hasRegistry(assetType) && perAsset.length > 0 && (
        <div style={{ border: "1px solid var(--silver)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 16, background: "var(--paper)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--slate)" }}>{t.details}</div>
          {SECTION_ORDER.map((sec) => {
            const fields = perAsset.filter((x) => x.section === sec);
            if (fields.length === 0) return null;
            const lead = fields.filter((x) => x.show_rule === "always" || x.required);
            const more = fields.filter((x) => x.show_rule !== "always" && !x.required);
            return (
              <div key={sec} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--slate)", opacity: 0.8 }}>{sectionLabel(sec, ar)}</div>
                {lead.map(renderField)}
                {more.length > 0 && (
                  <details style={{ border: "1px solid var(--silver)", borderRadius: 8, padding: "8px 11px" }}>
                    <summary style={{ fontSize: 12.5, color: "var(--slate)", cursor: "pointer" }}>{t.more}</summary>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>{more.map(renderField)}</div>
                  </details>
                )}
              </div>
            );
          })}
          <p style={hint}>{t.statedNote}</p>
        </div>
      )}

      <div>
        <label style={lbl}>{t.video}</label>
        <input style={inp} value={f.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
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
        {msg && <span style={{ fontSize: 13, color: msg.ok ? "var(--harbor-d)" : "var(--red)" }}>{msg.text}</span>}
      </div>
    </form>
  );
}
