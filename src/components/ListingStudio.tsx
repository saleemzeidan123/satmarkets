"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LocationPicker from "@/components/LocationPicker";
import { intakeFields, type AssetField } from "@/lib/assetFields";
import { assetLabel, dealLabel } from "@/lib/labels";
import { formatArea, formatMoney } from "@/lib/format";
import { DOCUMENT_KINDS, documentLabel, type DocumentKind } from "@/lib/documentKinds";
import { planTypesFor, defaultPlanType, planLabel, type PlanType } from "@/lib/planTypes";
import type { DistrictPoint } from "@/lib/nearestDistrict";
import {
  PHOTO_SET_MIN,
  PLATFORM_OWNED_FIELD_KEYS,
  assessListing,
  missingChecks,
  weightLabel,
  type ListingFacts,
  type QualityCheck,
} from "@/lib/listingQuality";
import {
  draftBlockers,
  resumeStepId,
  stepProgress,
  studioProgress,
  studioSteps,
  type StepState,
  type StudioStep,
} from "@/lib/listingStudio";

// The Listing Studio, the surface ADV-2 is built to produce.
//
// It renders the step model in src/lib/listingStudio.ts and nothing of its own:
// the order of the steps, which facts each one asks for, what each step still
// needs and where a returning lister resumes are all read from that model, which
// in turn reads completeness from src/lib/listingQuality.ts. So "what is missing"
// has exactly one definition here, on the listing page and in the score. The
// Studio never decides that a listing is complete.
//
// Two rules this file holds that are easy to lose:
//
// 1. Saving and publishing are different demands. The write path refuses seven
//    facts (listingStudio.DRAFT_REQUIRED_CHECK_KEYS); publication wants more. A
//    lister can therefore save a partial listing and come back to it, which is
//    the whole point of a resumable studio, and the save button names exactly
//    what it is waiting for rather than sitting greyed out with no reason.
// 2. Nothing here reads as verification (D24). The step states say what the
//    lister has supplied. Whether SAT confirmed it is a separate claim, made by
//    src/lib/listingVerification.ts, and no colour or word in this file may be
//    mistaken for it.

// Completeness is assessed against a fixed instant rather than the wall clock.
// The only reading in the model that consults `now` is the contradiction for a
// licence that expired while the listing is published, and it is gated on
// published_at, which a draft never has. A live clock here would make the server
// render and the first client render disagree for no gain.
const ASSESSED_AT = 0;

const ASSET_TYPES = [
  "office", "retail", "medical", "showroom", "warehouse", "serviced", "education",
  "land", "gas_station", "entertainment", "wedding_hall", "worker_housing",
  "self_storage", "hospitality", "mixed_use",
];

const inp = "w-full rounded border border-charcoal/20 px-3 py-2 min-h-[44px]";
const lbl = "block text-[12px] text-charcoal/60 mb-1";
const help = "text-[11px] text-charcoal/45 mt-1";

function stateLabel(state: StepState, ar: boolean): string {
  switch (state) {
    case "blocked": return ar ? "ينقصه أساسي" : "Needs an essential fact";
    case "complete": return ar ? "مكتملة" : "Done";
    case "partial": return ar ? "جزئية" : "Part done";
    case "empty": return ar ? "لم تبدأ" : "Not started";
  }
}

export default function ListingStudio({ locale, districts }: { locale: string; districts: DistrictPoint[] }) {
  const router = useRouter();
  const ar = locale === "ar";
  const loc: "en" | "ar" = ar ? "ar" : "en";
  const t = (en: string, arText: string) => (ar ? arText : en);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title_en: "", title_ar: "", asset_type: "office", deal_type: "lease",
    area_sqm: "", price: "", description_en: "", description_ar: "",
    contact_phone: "", contact_email: "",
    lister_type: "owner_direct", video_url: "", floorplan_url: "",
    ad_permit_no: "", ad_permit_expires_at: "",
  });
  const [rightToMarket, setRightToMarket] = useState(false);
  const [availableAt, setAvailableAt] = useState("");
  const [place, setPlace] = useState<{ lat: number | null; lng: number | null; districtId: string | null }>({ lat: null, lng: null, districtId: null });
  const [photos, setPhotos] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [floorFiles, setFloorFiles] = useState<File[]>([]);
  const [floorTypes, setFloorTypes] = useState<PlanType[]>([]);
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docKinds, setDocKinds] = useState<DocumentKind[]>([]);
  const [attrs, setAttrs] = useState<Record<string, unknown>>({});
  const [ch, setCh] = useState({ whatsapp: true, call: true, email: false, message: true });
  const [current, setCurrent] = useState("asset");

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setAttr = (k: string, v: unknown) => setAttrs((p) => ({ ...p, [k]: v }));
  const isBroker = f.lister_type === "broker_authorized";

  // The asset type decides which facts every later step asks for, so changing it
  // discards attribute values that no longer belong to any field.
  const onAssetChange = (v: string) => {
    setF((p) => ({ ...p, asset_type: v }));
    setAttrs({});
    setFloorTypes(floorFiles.map(() => defaultPlanType(v)));
  };

  const photoUrls = useMemo(() => photos.split(/\n+/).map((s) => s.trim()).filter(Boolean), [photos]);
  const steps = useMemo(() => studioSteps(f.asset_type), [f.asset_type]);

  // The facts as the model reads them. Registry values are entered under their
  // field key, so column-backed fields are also projected onto their column name,
  // which is where fieldValue() looks for them. The authoritative platform facts
  // are written last so a registry field can never displace one.
  const facts: ListingFacts = useMemo(() => {
    const columns: Record<string, unknown> = {};
    for (const field of intakeFields(f.asset_type)) {
      if (field.column && attrs[field.key] !== undefined && attrs[field.key] !== "") {
        columns[field.column] = attrs[field.key];
      }
    }
    const price = Number(f.price);
    const isSale = f.deal_type === "sale";
    return {
      ...columns,
      asset_type: f.asset_type,
      deal_type: f.deal_type,
      title_en: f.title_en,
      title_ar: f.title_ar,
      description_en: f.description_en,
      description_ar: f.description_ar,
      area_sqm: Number.isFinite(Number(f.area_sqm)) && f.area_sqm !== "" ? Number(f.area_sqm) : null,
      asking_rent_sqm: !isSale && Number.isFinite(price) && f.price !== "" ? price : null,
      sale_price: isSale && Number.isFinite(price) && f.price !== "" ? price : null,
      lat: place.lat,
      lng: place.lng,
      district_id: place.districtId,
      building_id: null,
      contact_phone: f.contact_phone,
      contact_email: f.contact_email,
      ad_permit_no: f.ad_permit_no,
      ad_permit_expires_at: f.ad_permit_expires_at || null,
      right_to_market_confirmed: rightToMarket,
      availability_confirmed_at: availableAt || null,
      published_at: null,
      // A selected plan file counts as a floor plan even before it is uploaded,
      // so the step does not report as missing something the lister just chose.
      // This value is local to the assessment and is never sent to the server.
      floorplan_url: f.floorplan_url || (floorFiles.length > 0 ? "selected-file" : null),
      video_url: f.video_url,
      attributes: attrs,
      photo_count: photoUrls.length + files.length,
      document_count: docFiles.length + (brochureFile ? 1 : 0),
    };
  }, [f, attrs, place, rightToMarket, availableAt, photoUrls, files, floorFiles, docFiles, brochureFile]);

  const quality = useMemo(() => assessListing(facts, ASSESSED_AT), [facts]);
  const progress = useMemo(() => studioProgress(steps, quality), [steps, quality]);
  const stateById = useMemo(() => new Map(progress.steps.map((p) => [p.stepId, p])), [progress]);

  const stepOfCheck = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of steps) for (const k of s.checkKeys) m.set(k, s.id);
    return m;
  }, [steps]);

  // What holds the save, as opposed to what holds publication. The registry's own
  // required fields join the platform list because the write path validates them
  // too, so the lister is told about them here rather than by a server rejection.
  const saveBlockers: QualityCheck[] = useMemo(() => [
    ...draftBlockers(quality),
    ...quality.checks.filter((c) => c.key.startsWith("field:") && c.weight === "essential" && c.state === "missing"),
  ], [quality]);

  const step = steps.find((s) => s.id === current) ?? steps[0];
  const at = steps.findIndex((s) => s.id === step.id);
  const here = stateById.get(step.id);
  const districtName = useMemo(() => {
    const d = districts.find((x) => x.id === place.districtId);
    if (!d) return null;
    return (ar ? d.name_ar || d.name_en : d.name_en) || null;
  }, [districts, place.districtId, ar]);

  const go = (id: string) => { setCurrent(id); setError(null); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" }); };

  function renderField(field: AssetField) {
    const label = (ar ? field.label_ar : field.label_en) + (field.unit ? ` (${field.unit})` : "") + (field.required ? " *" : "");
    const hint = ar ? field.help_ar : field.help_en;
    const val = attrs[field.key];
    const id = `attr-${field.key}`;
    if (field.type === "boolean") {
      return (
        <label key={field.key} className="flex items-center gap-2 text-[13px] py-1.5">
          <input type="checkbox" checked={val === true} onChange={(e) => setAttr(field.key, e.target.checked)} />
          <span>{ar ? field.label_ar : field.label_en}</span>
        </label>
      );
    }
    if (field.type === "tristate") {
      return (
        <div key={field.key}>
          <label className={lbl} htmlFor={id}>{label}</label>
          <select id={id} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)} className={inp}>
            <option value="">{t("Not specified", "غير محدّد")}</option>
            <option value="yes">{t("Yes", "نعم")}</option>
            <option value="no">{t("No", "لا")}</option>
          </select>
          {hint && <p className={help}>{hint}</p>}
        </div>
      );
    }
    if (field.type === "enum") {
      const opts = field.validation?.enum ?? [];
      return (
        <div key={field.key}>
          <label className={lbl} htmlFor={id}>{label}</label>
          <select id={id} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)} className={inp}>
            <option value="">{t("Select", "اختر")}</option>
            {opts.map((o) => <option key={o} value={o}>{field.options?.[o]?.[ar ? 1 : 0] ?? o.replace(/_/g, " ")}</option>)}
          </select>
          {hint && <p className={help}>{hint}</p>}
        </div>
      );
    }
    const numeric = field.type === "number" || field.type === "integer" || field.type === "money";
    return (
      <div key={field.key}>
        <label className={lbl} htmlFor={id}>{label}</label>
        <input
          id={id}
          type={numeric ? "number" : "text"}
          inputMode={numeric ? "numeric" : undefined}
          value={(val as string) ?? ""}
          onChange={(e) => setAttr(field.key, e.target.value)}
          className={inp}
        />
        {hint && <p className={help}>{hint}</p>}
      </div>
    );
  }

  function renderPlatform(key: string) {
    switch (key) {
      case "title_en":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="title_en">{t("English title", "العنوان بالإنجليزية")} *</label>
            <input id="title_en" dir="ltr" value={f.title_en} onChange={(e) => set("title_en", e.target.value)} className={inp} />
            <p className={help}>{t("What a searcher reads first in the results list.", "أول ما يقرأه الباحث في قائمة النتائج.")}</p>
          </div>
        );
      case "title_ar":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="title_ar">{t("Arabic title", "العنوان بالعربية")}</label>
            <input id="title_ar" dir="rtl" value={f.title_ar} onChange={(e) => set("title_ar", e.target.value)} className={inp} />
            <p className={help}>{t("Leave this empty and SAT drafts it from the English, marked as a translation.", "اتركه فارغاً لتصوغه سات من الإنجليزية، ويظهر بوصفه ترجمة.")}</p>
          </div>
        );
      case "description_en":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="description_en">{t("English description", "الوصف بالإنجليزية")}</label>
            <textarea id="description_en" dir="ltr" rows={4} value={f.description_en} onChange={(e) => set("description_en", e.target.value)} className={inp} />
            <p className={help}>{t("Access, condition and terms: what the field list cannot say.", "الوصول والحالة والشروط: ما لا تقوله قائمة الحقول.")}</p>
          </div>
        );
      case "description_ar":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="description_ar">{t("Arabic description", "الوصف بالعربية")}</label>
            <textarea id="description_ar" dir="rtl" rows={4} value={f.description_ar} onChange={(e) => set("description_ar", e.target.value)} className={inp} />
          </div>
        );
      case "area_sqm":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="area_sqm">{t("Area (sqm)", "المساحة (متر مربع)")} *</label>
            <input id="area_sqm" type="number" inputMode="numeric" value={f.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} className={inp} />
            <p className={help}>{t("Area sets the unit rate and every comparison this listing appears in.", "المساحة تحدد سعر المتر وكل مقارنة تظهر فيها هذه القائمة.")}</p>
          </div>
        );
      case "price":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="price">
              {f.deal_type === "sale" ? t("Sale price (SAR)", "سعر البيع (ريال)") : t("Asking rent (SAR per sqm per year)", "الإيجار المطلوب (ريال للمتر المربع سنوياً)")} *
            </label>
            <input id="price" type="number" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} className={inp} />
          </div>
        );
      case "availability_confirmed":
        return (
          <label key={key} className="flex items-start gap-2 text-[13px] py-1.5">
            <input
              type="checkbox"
              checked={availableAt !== ""}
              onChange={(e) => setAvailableAt(e.target.checked ? new Date().toISOString() : "")}
              className="mt-0.5"
            />
            <span>{t("This space is available today, and I am affirming that now.", "هذه المساحة متاحة اليوم، وأؤكد ذلك الآن.")}</span>
          </label>
        );
      case "ad_permit":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="ad_permit_no">{t("Advertising licence number (10 digits)", "رقم رخصة الإعلان (10 أرقام)")} *</label>
            <input
              id="ad_permit_no"
              inputMode="numeric"
              dir="ltr"
              value={f.ad_permit_no}
              onChange={(e) => set("ad_permit_no", e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={inp + " font-mono"}
            />
            <p className={help}>{t("The licence number is shown on the advertisement, as the real estate marketing rules require.", "يظهر رقم الرخصة على الإعلان، وفق ما تتطلبه أنظمة التسويق العقاري.")}</p>
          </div>
        );
      case "permit_expiry":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="ad_permit_expires_at">{t("Licence expiry date", "تاريخ انتهاء الرخصة")} *</label>
            <input id="ad_permit_expires_at" type="date" value={f.ad_permit_expires_at} onChange={(e) => set("ad_permit_expires_at", e.target.value)} className={inp} />
            <p className={help}>{t("The advertisement is withdrawn automatically on that date.", "يُسحب الإعلان تلقائياً في ذلك التاريخ.")}</p>
          </div>
        );
      case "right_to_market":
        return (
          <div key={key} className="space-y-2">
            <div>
              <label className={lbl} htmlFor="lister_type">{t("Who is listing", "صفة المُدرِج")}</label>
              <select id="lister_type" value={f.lister_type} onChange={(e) => set("lister_type", e.target.value)} className={inp}>
                <option value="owner_direct">{t("I am the owner", "أنا المالك")}</option>
                <option value="broker_authorized">{t("I am a broker authorized by the owner", "أنا وسيط مفوّض من المالك")}</option>
              </select>
            </div>
            <label className="flex items-start gap-2 text-[13px]">
              <input type="checkbox" checked={rightToMarket} onChange={(e) => setRightToMarket(e.target.checked)} className="mt-0.5" />
              <span>{t("I confirm I have the right to market this property.", "أقرّ بأن لدي حق تسويق هذا العقار.")} *</span>
            </label>
          </div>
        );
      case "documents":
        return (
          <div key={key} className="space-y-2">
            <label className={lbl} htmlFor="doc_files">{t("Supporting documents (private)", "المستندات الداعمة (خاصة)")}</label>
            <p className="text-[11px] text-charcoal/55">
              {t("For SAT review only. Never shown to viewers, and uploading one does not by itself confirm anything.", "لمراجعة سات فقط. لا تظهر للزوار، ورفعها لا يؤكد شيئاً بذاته.")}
            </p>
            {isBroker && (
              <p className="text-[11px] text-charcoal/60">
                {t("As a broker, include your authorization to market and set its type below.", "بصفتك وسيطاً، أرفق تفويض التسويق واختر نوعه أدناه.")}
              </p>
            )}
            <input
              id="doc_files"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => { const arr = Array.from(e.target.files ?? []); setDocFiles(arr); setDocKinds(arr.map(() => "deed" as DocumentKind)); }}
              className="text-[13px]"
            />
            {docFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-charcoal/55 truncate" style={{ maxWidth: 150 }}>{file.name}</span>
                <select
                  aria-label={t("Document type", "نوع المستند")}
                  value={docKinds[i] ?? "deed"}
                  onChange={(e) => setDocKinds((p) => { const c = [...p]; c[i] = e.target.value as DocumentKind; return c; })}
                  className="text-[12px] border border-charcoal/20 rounded px-1.5 py-1"
                >
                  {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{documentLabel(k, ar)}</option>)}
                </select>
              </div>
            ))}
            <p className={help}>{t("PDF or image, up to 25MB each.", "PDF أو صورة، حتى 25 ميغابايت لكل ملف.")}</p>
          </div>
        );
      case "photos":
        return (
          <div key={key} className="space-y-2">
            <div>
              <label className={lbl} htmlFor="photo_files">{t("Upload photographs", "ارفع الصور")} *</label>
              <input
                id="photo_files"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="text-[13px]"
              />
              <p className={help}>{t("JPEG, PNG or WebP, up to 4MB each. Images are processed and their metadata stripped.", "JPEG أو PNG أو WebP، حتى 4 ميغابايت لكل صورة. تُعالَج الصور وتُزال بياناتها الوصفية.")}</p>
            </div>
            <div>
              <label className={lbl} htmlFor="photo_urls">{t("Or paste photo links, one per line", "أو ألصق روابط الصور، رابط في كل سطر")}</label>
              <textarea id="photo_urls" dir="ltr" rows={3} value={photos} onChange={(e) => setPhotos(e.target.value)} className={inp} />
            </div>
          </div>
        );
      case "photo_set": {
        const n = photoUrls.length + files.length;
        return (
          <p key={key} className="text-[12px] text-charcoal/60">
            {n >= PHOTO_SET_MIN
              ? t(`${n} photographs, which reads as a set.`, `${n} صور، وهو ما يُقرأ كمجموعة.`)
              : t(`${n} of ${PHOTO_SET_MIN}. One photograph shows a wall. A set shows the space a viewer would walk.`, `${n} من ${PHOTO_SET_MIN}. الصورة الواحدة تُظهر جداراً. المجموعة تُظهر المساحة كما يراها الزائر.`)}
          </p>
        );
      }
      case "floorplan":
        return (
          <div key={key} className="space-y-2">
            <div>
              <label className={lbl} htmlFor="floor_files">{t("Floor plans (image or PDF)", "المخططات (صورة أو PDF)")}</label>
              <input
                id="floor_files"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(e) => { const arr = Array.from(e.target.files ?? []); setFloorFiles(arr); setFloorTypes(arr.map(() => defaultPlanType(f.asset_type))); }}
                className="text-[13px]"
              />
              {floorFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-charcoal/55 truncate" style={{ maxWidth: 150 }}>{file.name}</span>
                  <select
                    aria-label={t("Plan type", "نوع المخطط")}
                    value={floorTypes[i] ?? defaultPlanType(f.asset_type)}
                    onChange={(e) => setFloorTypes((p) => { const c = [...p]; c[i] = e.target.value as PlanType; return c; })}
                    className="text-[12px] border border-charcoal/20 rounded px-1.5 py-1"
                  >
                    {planTypesFor(f.asset_type).allowed.map((pt) => <option key={pt} value={pt}>{planLabel(pt, ar)}</option>)}
                  </select>
                </div>
              ))}
              <p className={help}>{t("A floor plan is how an occupier tests the space against a requirement.", "المخطط هو ما يقيس به المستأجر المساحة أمام متطلباته.")}</p>
            </div>
            <div>
              <label className={lbl} htmlFor="floorplan_url">{t("Or a floor plan link", "أو رابط للمخطط")}</label>
              <input id="floorplan_url" dir="ltr" value={f.floorplan_url} onChange={(e) => set("floorplan_url", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="brochure">
                {f.deal_type === "sale" ? t("Offering memorandum (PDF)", "مذكرة العرض (PDF)") : t("Marketing brochure (PDF)", "الكتيّب التسويقي (PDF)")}
              </label>
              <input id="brochure" type="file" accept="application/pdf" onChange={(e) => setBrochureFile(e.target.files?.[0] ?? null)} className="text-[13px]" />
              {brochureFile && <p className="text-[11px] text-charcoal/55 mt-1">{brochureFile.name.slice(0, 40)}</p>}
            </div>
          </div>
        );
      case "video":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="video_url">{t("Video tour link (YouTube or .mp4)", "رابط جولة بالفيديو (يوتيوب أو mp4.)")}</label>
            <input id="video_url" dir="ltr" value={f.video_url} onChange={(e) => set("video_url", e.target.value)} className={inp} />
            <p className={help}>{t("Video shortens the path to a viewing for a reader in another city.", "الفيديو يختصر الطريق إلى المعاينة لقارئ في مدينة أخرى.")}</p>
          </div>
        );
      case "coordinates":
        return (
          <div key={key}>
            <div className={lbl}>{t("Place the building on the map", "حدّد موقع المبنى على الخريطة")} *</div>
            <LocationPicker locale={loc} districts={districts} value={place} onChange={setPlace} />
          </div>
        );
      case "district":
        return (
          <p key={key} className="text-[12px] text-charcoal/60">
            {districtName
              ? t(`District derived from the pin: ${districtName}. You can move the pin to change it.`, `الحي المشتق من الدبوس: ${districtName}. يمكنك تحريك الدبوس لتغييره.`)
              : t("The district is derived from the pin once you place it.", "يُشتق الحي من الدبوس بعد وضعه.")}
          </p>
        );
      case "building":
        return (
          <p key={key} className="text-[12px] text-charcoal/60">
            {t("SAT links the building record after review, so building facts show as context rather than as facts about this space.", "تربط سات سجل المبنى بعد المراجعة، لتظهر حقائق المبنى كسياق لا كحقائق عن هذه المساحة.")}
          </p>
        );
      case "contact":
        return (
          <div key={key} className="space-y-2">
            <div>
              <label className={lbl} htmlFor="contact_phone">{t("Contact phone (WhatsApp and calls)", "هاتف التواصل (واتساب واتصال)")} *</label>
              <input id="contact_phone" dir="ltr" inputMode="tel" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="contact_email">{t("Contact email", "البريد الإلكتروني")}</label>
              <input id="contact_email" dir="ltr" inputMode="email" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} className={inp} />
            </div>
            <fieldset className="flex flex-wrap gap-3 text-[13px]">
              <legend className={lbl}>{t("How viewers may reach you", "كيف يصل إليك الزائر")}</legend>
              {(([["whatsapp", "WhatsApp", "واتساب"], ["call", "Call", "اتصال"], ["email", "Email", "بريد إلكتروني"], ["message", "Message on SAT", "رسالة عبر سات"]]) as [string, string, string][]).map(([k, en, arLab]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={(ch as Record<string, boolean>)[k]} onChange={(e) => setCh((p) => ({ ...p, [k]: e.target.checked }))} />
                  {t(en, arLab)}
                </label>
              ))}
            </fieldset>
            <p className={help}>{t("You choose the routes. The message on SAT keeps the enquiry tracked.", "أنت تختار الوسائل. الرسالة عبر سات تُبقي الاستفسار موثّق التتبّع.")}</p>
          </div>
        );
      default:
        return null;
    }
  }

  function preview(l: "en" | "ar") {
    const isAr = l === "ar";
    const title = isAr ? f.title_ar : f.title_en;
    const body = isAr ? f.description_ar : f.description_en;
    const area = Number(f.area_sqm);
    const price = Number(f.price);
    const d = districts.find((x) => x.id === place.districtId);
    const dName = d ? (isAr ? d.name_ar || d.name_en : d.name_en) : null;
    return (
      <div dir={isAr ? "rtl" : "ltr"} className="rounded border border-line p-3" lang={l}>
        <div className="text-[11px] uppercase tracking-wide text-charcoal/45 mb-1">{isAr ? "العربية" : "English"}</div>
        <div className="font-display text-lg text-charcoal">
          {title || (isAr ? "بلا عنوان بعد" : "No title yet")}
        </div>
        <div className="text-[13px] text-charcoal/70 mt-1">
          {assetLabel(f.asset_type, l)} · {dealLabel(f.deal_type, l)}
          {dName ? ` · ${dName}` : ""}
        </div>
        <div className="text-[13px] text-charcoal/70">
          {Number.isFinite(area) && f.area_sqm !== "" ? formatArea(area, l) : (isAr ? "بلا مساحة" : "No area")}
          {Number.isFinite(price) && f.price !== "" ? ` · ${formatMoney(price, l)}${f.deal_type === "sale" ? "" : (isAr ? " للمتر المربع سنوياً" : " per sqm per year")}` : ""}
        </div>
        {body && <p className="text-[13px] text-charcoal/60 mt-2 whitespace-pre-line">{body}</p>}
      </div>
    );
  }

  async function save() {
    setError(null);
    if (isBroker && !docFiles.some((_, i) => docKinds[i] === "authorization")) {
      setError(t(
        "As a broker, add your authorization to market on the licence step and set its type to authorization.",
        "بصفتك وسيطاً، أضف تفويض التسويق في خطوة الترخيص واختر نوعه: تفويض بالتسويق.",
      ));
      go("compliance");
      return;
    }
    if (saveBlockers.length > 0) {
      const names = saveBlockers.map((c) => (ar ? c.label_ar : c.label_en)).join(ar ? "، " : ", ");
      setError(t("Saving needs these first: ", "الحفظ يحتاج هذه أولاً: ") + names);
      const target = stepOfCheck.get(saveBlockers[0].key);
      if (target) go(target);
      return;
    }
    // Not a completeness reading: the model records that an expiry date was
    // supplied, and the write path separately refuses one already in the past.
    if (Date.parse(f.ad_permit_expires_at) <= Date.now()) {
      setError(t("That licence has already expired.", "انتهت صلاحية هذه الرخصة."));
      go("compliance");
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/listings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title_en: f.title_en, title_ar: f.title_ar,
        asset_type: f.asset_type, deal_type: f.deal_type,
        district_id: place.districtId, lat: place.lat, lng: place.lng,
        area_sqm: f.area_sqm, price: f.price,
        description_en: f.description_en, description_ar: f.description_ar,
        contact_phone: f.contact_phone, contact_email: f.contact_email,
        contact_channels: Object.entries(ch).filter(([, v]) => v).map(([k]) => k),
        lister_type: f.lister_type,
        video_url: f.video_url, floorplan_url: f.floorplan_url,
        ad_permit_no: f.ad_permit_no.trim(), ad_permit_expires_at: f.ad_permit_expires_at,
        right_to_market_confirmed: rightToMarket,
        availability_confirmed_at: availableAt || null,
        attributes: attrs,
        photos: photoUrls,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok) {
      setError(json.error || t("Could not save the listing.", "تعذّر حفظ العرض."));
      setBusy(false);
      return;
    }
    // Arabic the lister wrote is already stamped as current by the write path, so
    // this fills only what was left empty and never overwrites their words.
    try {
      if (json.id) fetch(`/api/listings/${json.id}/translate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: "fast" }) });
    } catch {}
    if (json.id) {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        try { await fetch(`/api/listings/${json.id}/media`, { method: "POST", body: fd }); } catch {}
      }
      for (let i = 0; i < floorFiles.length; i++) {
        const file = floorFiles[i];
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "floorplan");
        fd.append("plan_type", floorTypes[i] ?? defaultPlanType(f.asset_type));
        try { await fetch(`/api/listings/${json.id}/${isPdf ? "docs" : "media"}`, { method: "POST", body: fd }); } catch {}
      }
      if (brochureFile) {
        const fd = new FormData();
        fd.append("file", brochureFile);
        fd.append("kind", "brochure");
        try { await fetch(`/api/listings/${json.id}/docs`, { method: "POST", body: fd }); } catch {}
      }
      for (let i = 0; i < docFiles.length; i++) {
        const fd = new FormData();
        fd.append("file", docFiles[i]);
        fd.append("kind", docKinds[i] ?? "other");
        try { await fetch(`/api/listings/${json.id}/documents`, { method: "POST", body: fd }); } catch {}
      }
    }
    router.push(`/${locale}/dashboard`);
  }

  const missing = missingChecks(quality);
  const resumeId = resumeStepId(steps, quality);

  return (
    <div className="max-w-2xl">
      <div className="rounded-lg border border-line bg-ivory-2/40 p-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[12px] text-charcoal/70">
            {t(`Step ${step.index} of ${steps.length}`, `الخطوة ${step.index} من ${steps.length}`)}
          </div>
          <div className="text-[12px] text-charcoal/60">
            {t(`${progress.answered} of ${progress.askable} facts supplied`, `${progress.answered} من ${progress.askable} حقيقة مُدخلة`)}
          </div>
        </div>
        <div
          className="mt-2 h-1.5 w-full rounded bg-charcoal/10 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.askable}
          aria-valuenow={progress.answered}
          aria-label={t("Facts supplied", "الحقائق المُدخلة")}
        >
          <div
            className="h-full bg-signal"
            style={{ width: progress.askable > 0 ? `${Math.round((progress.answered / progress.askable) * 100)}%` : "0%" }}
          />
        </div>
        {resumeId !== step.id && (
          <button type="button" onClick={() => go(resumeId)} className="mt-2 text-[12px] text-signal underline min-h-[44px]">
            {t("Go to where you left off", "انتقل إلى موضع التوقف")}
          </button>
        )}
      </div>

      <nav aria-label={t("Listing steps", "خطوات العرض")} className="mt-3 -mx-1 overflow-x-auto">
        <ol className="flex gap-1 px-1 min-w-max">
          {steps.map((s) => {
            const p = stateById.get(s.id);
            const isHere = s.id === step.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={isHere ? "step" : undefined}
                  className={
                    "rounded border px-2.5 py-2 text-[12px] min-h-[44px] whitespace-nowrap " +
                    (isHere ? "border-signal text-signal font-medium" : "border-line text-charcoal/60")
                  }
                >
                  <span>{ar ? s.title_ar : s.title_en}</span>
                  {p && p.state === "blocked" && <span className="ms-1.5 text-red-600" aria-hidden="true">!</span>}
                  <span className="sr-only">{p ? ` ${stateLabel(p.state, ar)}` : ""}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className="mt-4 rounded-lg border border-line p-4" aria-labelledby="step-title">
        <h2 id="step-title" className="font-display text-lg text-charcoal">{ar ? step.title_ar : step.title_en}</h2>
        <p className="text-[12px] text-charcoal/55 mt-1">{ar ? step.purpose_ar : step.purpose_en}</p>

        <div className="mt-4 space-y-3">
          {step.kind === "asset" && (
            <>
              <div>
                <label className={lbl} htmlFor="asset_type">{t("Asset type", "نوع الأصل")}</label>
                <select id="asset_type" value={f.asset_type} onChange={(e) => onAssetChange(e.target.value)} className={inp}>
                  {ASSET_TYPES.map((a) => <option key={a} value={a}>{assetLabel(a, loc)}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl} htmlFor="deal_type">{t("Offer type", "نوع العرض")}</label>
                <select id="deal_type" value={f.deal_type} onChange={(e) => set("deal_type", e.target.value)} className={inp}>
                  <option value="lease">{dealLabel("lease", loc)}</option>
                  <option value="sale">{dealLabel("sale", loc)}</option>
                </select>
              </div>
            </>
          )}

          {step.platformKeys.map(renderPlatform)}
          {step.fields.filter((x) => !PLATFORM_OWNED_FIELD_KEYS.has(x.key)).map(renderField)}

          {step.kind === "review" && (
            <div className="space-y-4">
              {quality.contradictions.length > 0 && (
                <div className="rounded border border-red-600/40 p-3">
                  <div className="text-[12px] font-medium text-charcoal/80">{t("These cannot both be true", "لا يمكن أن يصحّ هذان معاً")}</div>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-charcoal/70">
                    {quality.contradictions.map((c) => <li key={c.kind + c.fields.join()}>{ar ? c.statement_ar : c.statement_en}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <div className="text-[12px] font-medium text-charcoal/80">{t("Still missing", "ما زال ناقصاً")}</div>
                {missing.length === 0 ? (
                  <p className="text-[12px] text-charcoal/60 mt-1">{t("Nothing. Every fact this listing can carry is here.", "لا شيء. كل حقيقة يمكن أن تحملها هذه القائمة موجودة.")}</p>
                ) : (
                  <ul className="mt-1.5 space-y-2">
                    {missing.map((c) => (
                      <li key={c.key} className="text-[12px]">
                        <button
                          type="button"
                          onClick={() => { const target = stepOfCheck.get(c.key); if (target) go(target); }}
                          className="text-start underline text-charcoal/80 min-h-[44px]"
                        >
                          {ar ? c.label_ar : c.label_en}
                        </button>
                        <span className="text-charcoal/45"> · {weightLabel(c.weight, ar)}</span>
                        <p className="text-[11px] text-charcoal/50">{ar ? c.why_ar : c.why_en}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-[12px] font-medium text-charcoal/80">{t("As a visitor will read it", "كما سيقرأه الزائر")}</div>
                <div className="mt-2 space-y-2">
                  {preview("en")}
                  {preview("ar")}
                </div>
              </div>
              <p className="text-[11px] text-charcoal/50">
                {t("Saved as a draft. SAT reviews a listing before it publishes, and nothing here is a confirmation by SAT.", "يُحفظ كمسودة. تراجع سات العرض قبل نشره، ولا شيء هنا تأكيد من سات.")}
              </p>
            </div>
          )}
        </div>

        {here && here.askable > 0 && step.kind !== "review" && (
          <p className="mt-4 text-[12px] text-charcoal/55">
            {t(`${here.answered} of ${here.askable} on this step. `, `${here.answered} من ${here.askable} في هذه الخطوة. `)}
            {stateLabel(here.state, ar)}
          </p>
        )}
      </section>

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={at === 0}
          onClick={() => go(steps[Math.max(0, at - 1)].id)}
          className="rounded border border-line px-4 py-2 min-h-[44px] text-[13px] disabled:opacity-40"
        >
          {t("Back", "السابق")}
        </button>
        {at < steps.length - 1 && (
          <button
            type="button"
            onClick={() => go(steps[at + 1].id)}
            className="rounded border border-line px-4 py-2 min-h-[44px] text-[13px]"
          >
            {t("Next", "التالي")}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded bg-signal px-4 py-2 min-h-[44px] text-[13px] text-white disabled:opacity-60"
        >
          {busy ? t("Saving...", "جارٍ الحفظ...") : t("Save draft", "حفظ المسودة")}
        </button>
        <span className="text-[11px] text-charcoal/50">
          {saveBlockers.length === 0
            ? t("You can save now and finish later.", "يمكنك الحفظ الآن وإكمال الباقي لاحقاً.")
            : t(`${saveBlockers.length} facts are needed before this can be saved.`, `${saveBlockers.length} حقائق مطلوبة قبل الحفظ.`)}
        </span>
      </div>
    </div>
  );
}
