"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MediaBrief from "@/components/MediaBrief";
import LocationPicker from "@/components/LocationPicker";
import { intakeFields, type AssetField } from "@/lib/assetFields";
import { areaFieldLabel, fieldLabel, priceFieldLabel } from "@/lib/fieldLabel";
import { intakeErrorMessage } from "@/lib/listingIntakeErrors";
import { assetLabel, dealLabel } from "@/lib/labels";
import { DOCUMENT_KINDS, documentLabel, type DocumentKind } from "@/lib/documentKinds";
import { planTypesFor, defaultPlanType, planLabel, type PlanType } from "@/lib/planTypes";
import type { LocationPoint } from "@/lib/nearestLocation";
import { placeName } from "@/lib/displayName";
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
import { evidenceMission, evidenceSummary, evidenceStateLabel, type EvidenceItem } from "@/lib/guidedEvidence";
import { buildListingPresentation, type DraftListingInput } from "@/lib/listingPresentation";
import { displayProvenanceLabel } from "@/lib/provenanceDisplay";
import { checkFileType, checkFileSize, findDuplicates } from "@/lib/uploadQuality";

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
const lbl = "block text-[0.75rem] text-charcoal/70 mb-1";
const help = "text-[0.6875rem] text-charcoal/65 mt-1";

function stateLabel(state: StepState, ar: boolean): string {
  switch (state) {
    case "blocked": return ar ? "ينقصه أساسي" : "Needs an essential fact";
    case "complete": return ar ? "مكتملة" : "Done";
    case "partial": return ar ? "جزئية" : "Part done";
    case "empty": return ar ? "لم تبدأ" : "Not started";
  }
}

/**
 * A draft as the server read it, which is what resuming actually means: the
 * Studio starts from this instead of from empty, and every later save patches
 * this row rather than creating another one.
 */
export type StudioInitial = {
  id: string;
  title_en: string;
  title_ar: string;
  asset_type: string;
  deal_type: string;
  area_sqm: string;
  price: string;
  description_en: string;
  description_ar: string;
  contact_phone: string;
  contact_email: string;
  contact_channels: string[] | null;
  lister_type: string;
  video_url: string;
  floorplan_url: string;
  ad_permit_no: string;
  ad_permit_expires_at: string;
  right_to_market_confirmed: boolean;
  availability_confirmed_at: string;
  lat: number | null;
  lng: number | null;
  district_id: string | null;
  attributes: Record<string, unknown>;
  photo_count: number;
  floorplan_count: number;
  // The plan_type recorded against each plan already attached. Counted alone, a plan
  // is a plan; the media standard also asks whether it is a plan of the kind this
  // asset is shown by, and that question needs the recorded type, not the count.
  floorplan_types: (string | null)[];
  document_count: number;
};

type FormFields = {
  title_en: string; title_ar: string; asset_type: string; deal_type: string;
  area_sqm: string; price: string; description_en: string; description_ar: string;
  contact_phone: string; contact_email: string;
  lister_type: string; video_url: string; floorplan_url: string;
  ad_permit_no: string; ad_permit_expires_at: string;
};

type Place = { lat: number | null; lng: number | null; districtId: string | null };
type Channels = { whatsapp: boolean; call: boolean; email: boolean; message: boolean };

const DEFAULT_CHANNELS: Channels = { whatsapp: true, call: true, email: false, message: true };

/** Every piece of starting state in one place, so a blank Studio and a resumed one are built by the same code. */
function seedFrom(initial: StudioInitial | null | undefined) {
  const ch: Channels = initial?.contact_channels
    ? {
        whatsapp: initial.contact_channels.includes("whatsapp"),
        call: initial.contact_channels.includes("call"),
        email: initial.contact_channels.includes("email"),
        message: initial.contact_channels.includes("message"),
      }
    : DEFAULT_CHANNELS;
  const f: FormFields = {
    title_en: initial?.title_en ?? "",
    title_ar: initial?.title_ar ?? "",
    asset_type: initial?.asset_type ?? "office",
    deal_type: initial?.deal_type ?? "lease",
    area_sqm: initial?.area_sqm ?? "",
    price: initial?.price ?? "",
    description_en: initial?.description_en ?? "",
    description_ar: initial?.description_ar ?? "",
    contact_phone: initial?.contact_phone ?? "",
    contact_email: initial?.contact_email ?? "",
    lister_type: initial?.lister_type ?? "owner_direct",
    video_url: initial?.video_url ?? "",
    floorplan_url: initial?.floorplan_url ?? "",
    ad_permit_no: initial?.ad_permit_no ?? "",
    ad_permit_expires_at: initial?.ad_permit_expires_at ?? "",
  };
  return {
    f,
    ch,
    attrs: initial?.attributes ?? {},
    place: { lat: initial?.lat ?? null, lng: initial?.lng ?? null, districtId: initial?.district_id ?? null } as Place,
    rightToMarket: initial?.right_to_market_confirmed ?? false,
    availableAt: initial?.availability_confirmed_at ?? "",
    stored: {
      photos: initial?.photo_count ?? 0,
      floorplans: initial?.floorplan_count ?? 0,
      planTypes: (initial?.floorplan_types ?? []) as (string | null)[],
      documents: initial?.document_count ?? 0,
    },
  };
}

/**
 * The facts as the completeness model reads them, built from Studio state alone.
 *
 * It is a free function rather than a hook body because the first render already
 * needs an assessment: a resumed draft must land on the step still waiting, and
 * that step is derived from the assessment before any state exists.
 *
 * Registry values are entered under their field key, so column-backed fields are
 * also projected onto their column name, which is where fieldValue() looks for
 * them. The authoritative platform facts are written last so a registry field can
 * never displace one.
 */
function factsFrom(s: {
  f: FormFields;
  attrs: Record<string, unknown>;
  place: Place;
  rightToMarket: boolean;
  availableAt: string;
  photoCount: number;
  documentCount: number;
  hasFloorplanFile: boolean;
}): ListingFacts {
  const { f, attrs, place } = s;
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
    right_to_market_confirmed: s.rightToMarket,
    availability_confirmed_at: s.availableAt || null,
    published_at: null,
    // A selected plan file counts as a floor plan even before it is uploaded, and
    // a plan already uploaded on an earlier visit counts too, so the step does not
    // report as missing something the lister has already supplied. This value is
    // local to the assessment and is never sent to the server.
    floorplan_url: f.floorplan_url || (s.hasFloorplanFile ? "selected-file" : null),
    video_url: f.video_url,
    attributes: attrs,
    photo_count: s.photoCount,
    document_count: s.documentCount,
  };
}

export default function ListingStudio({
  locale,
  districts,
  initial,
}: {
  locale: string;
  districts: LocationPoint[];
  initial?: StudioInitial | null;
}) {
  const router = useRouter();
  const ar = locale === "ar";
  const loc: "en" | "ar" = ar ? "ar" : "en";
  const t = (en: string, arText: string) => (ar ? arText : en);

  const seed = seedFrom(initial);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<FormFields>(seed.f);
  const [rightToMarket, setRightToMarket] = useState(seed.rightToMarket);
  const [availableAt, setAvailableAt] = useState(seed.availableAt);
  const [place, setPlace] = useState<Place>(seed.place);
  const [photos, setPhotos] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [floorFiles, setFloorFiles] = useState<File[]>([]);
  const [floorTypes, setFloorTypes] = useState<PlanType[]>([]);
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docKinds, setDocKinds] = useState<DocumentKind[]>([]);
  const [attrs, setAttrs] = useState<Record<string, unknown>>(seed.attrs);
  const [ch, setCh] = useState<Channels>(seed.ch);
  // Session-only. See guidedEvidence.ts's own header: no column exists to hold a
  // per-item "unavailable, here is why" answer, so it lives here for the length
  // of this visit and is never sent to the server. Key is the evidence item's
  // key (a photo shot key or a registry field key); value is the reason, which
  // may be empty.
  const [unavailableItems, setUnavailableItems] = useState<Map<string, string>>(new Map());
  const [arabicConfirmedThisSession, setArabicConfirmedThisSession] = useState(false);
  // PKG-LISTING-CREATION-1A. Deterministic, explainable, decided in the
  // browser before a byte reaches the network. Never blocks by itself (a
  // rejected file is simply not added to the queue, with a stated reason);
  // never silently drops a file the lister selected without saying so.
  const [photoWarnings, setPhotoWarnings] = useState<string[]>([]);
  // What the server already holds for this listing. Uploads add to it after they
  // succeed, so a file counts as supplied once, whether it went up on this visit
  // or a previous one.
  const [stored, setStored] = useState(seed.stored);
  // The row this Studio is editing. Null until the first save creates it, and
  // from then on every save is a patch of that row rather than a second listing.
  const [listingId, setListingId] = useState<string | null>(initial?.id ?? null);
  const [saved, setSaved] = useState(false);
  // Bumped after a successful upload so the file inputs drop the names of files
  // that are now on the server and would otherwise be sent a second time.
  const [uploadRound, setUploadRound] = useState(0);
  // A resumed draft opens where it was left, which is the step still waiting
  // rather than the first one. Computed once, from the same model the rest of
  // this component reads, so the server and the first client render agree.
  const [current, setCurrent] = useState<string>(() => {
    if (!initial) return "asset";
    const facts0 = factsFrom({
      f: seed.f,
      attrs: seed.attrs,
      place: seed.place,
      rightToMarket: seed.rightToMarket,
      availableAt: seed.availableAt,
      photoCount: seed.stored.photos,
      documentCount: seed.stored.documents,
      hasFloorplanFile: seed.stored.floorplans > 0,
    });
    return resumeStepId(studioSteps(seed.f.asset_type), assessListing(facts0, ASSESSED_AT));
  });

  // Any change after a save makes the "saved" note stale, so the note is retired
  // the moment the listing stops matching what the server holds.
  const touch = () => setSaved(false);
  const set = (k: string, v: string) => { touch(); setF((p) => ({ ...p, [k]: v })); };
  const setAttr = (k: string, v: unknown) => { touch(); setAttrs((p) => ({ ...p, [k]: v })); };
  const isBroker = f.lister_type === "broker_authorized";

  // The asset type decides which facts every later step asks for, so changing it
  // discards attribute values that no longer belong to any field.
  const onAssetChange = (v: string) => {
    setF((p) => ({ ...p, asset_type: v }));
    setAttrs({});
    setFloorTypes(floorFiles.map(() => defaultPlanType(v)));
  };

  // PKG-LISTING-CREATION-1A. Every selected photo is checked before it joins
  // the upload queue: content-sniffed type (not filename), size, and content
  // fingerprint against the rest of THIS selection. A rejected file is named,
  // with the specific reason, and is never queued; a file that duplicates
  // another one already in this selection is queued once with a warning
  // rather than silently dropped or silently uploaded twice. Nothing here
  // touches files already on the server: cross-session duplicate detection
  // needs a persisted content hash the schema does not have today (see
  // docs/pkg-listing-creation-1a-deferred-contracts.md).
  async function onPhotoFilesSelected(selected: File[]) {
    touch();
    const warnings: string[] = [];
    const accepted: File[] = [];
    for (const file of selected) {
      const sizeCheck = checkFileSize(file);
      if (!sizeCheck.ok) {
        warnings.push(t(
          `${file.name}: too large (limit 4MB).`,
          `${file.name}: كبير جداً (الحد 4 ميغابايت).`,
        ));
        continue;
      }
      const typeCheck = await checkFileType(file);
      if (!typeCheck.ok) {
        warnings.push(t(
          `${file.name}: not a JPEG, PNG or WebP image.`,
          `${file.name}: ليست صورة JPEG أو PNG أو WebP.`,
        ));
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) {
      const dupes = await findDuplicates(accepted);
      for (const group of dupes) {
        const names = group.fileIndexes.map((i) => accepted[i].name).join(", ");
        warnings.push(t(
          `These files are identical: ${names}. Only one copy is needed.`,
          `هذه الملفات متطابقة: ${names}. تكفي نسخة واحدة.`,
        ));
      }
    }
    setPhotoWarnings(warnings);
    setFiles(accepted);
  }

  const photoUrls = useMemo(() => photos.split(/\n+/).map((s) => s.trim()).filter(Boolean), [photos]);
  const steps = useMemo(() => studioSteps(f.asset_type), [f.asset_type]);

  // The guided evidence mission (PKG-LISTING-CREATION-1A). This Studio has no
  // per-shot record of which photo covers which category, only a count, so
  // photo-kind items resolve on whether ANY photo is attached rather than
  // per-category coverage; the server-side preview route degrades the same way,
  // for the same reason, honestly, rather than claiming it can see something it
  // cannot (see docs/pkg-listing-creation-1a-deferred-contracts.md).
  const evidenceItems: EvidenceItem[] = useMemo(() => evidenceMission({
    assetType: f.asset_type,
    hasAnyPhoto: (stored.photos + photoUrls.length + files.length) > 0,
    attributes: attrs,
    unavailable: unavailableItems,
  }), [f.asset_type, stored.photos, photoUrls.length, files.length, attrs, unavailableItems]);
  const evidenceSum = useMemo(() => evidenceSummary(evidenceItems), [evidenceItems]);

  function setItemUnavailable(key: string, unavailable: boolean, reason: string) {
    touch();
    setUnavailableItems((prev) => {
      const next = new Map(prev);
      if (unavailable) next.set(key, reason);
      else next.delete(key);
      return next;
    });
  }

  // The facts as the model reads them: what is already on the server plus what
  // has been chosen on this visit and not uploaded yet.
  const facts: ListingFacts = useMemo(() => factsFrom({
    f,
    attrs,
    place,
    rightToMarket,
    availableAt,
    photoCount: stored.photos + photoUrls.length + files.length,
    documentCount: stored.documents + docFiles.length + (brochureFile ? 1 : 0),
    hasFloorplanFile: floorFiles.length > 0 || stored.floorplans > 0,
  }), [f, attrs, place, rightToMarket, availableAt, stored, photoUrls, files, floorFiles, docFiles, brochureFile]);

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
    return placeName(d, ar ? "ar" : "en") || null;
  }, [districts, place.districtId, ar]);

  // ELITE-4 J2-7. A step change replaces the whole panel and unmounts the control
  // that was pressed, so focus fell to document.body and nothing announced the new
  // step. Focus is moved to the step heading, which carries tabIndex={-1}.
  //
  // ELITE-4 J2-11. `keepError` exists because `save()` sets an error and then calls
  // `go()` to carry the lister to the step that holds it; the unconditional
  // setError(null) here landed in the same batch and threw the sentence away
  // before it could be read.
  const go = (id: string, keepError = false) => {
    setCurrent(id);
    if (!keepError) setError(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
      window.requestAnimationFrame(() => { document.getElementById("step-title")?.focus(); });
    }
  };

  // ELITE-4 J2-11: which facts are holding the save, by check key, so the controls
  // that hold it can say so themselves rather than leaving one comma-joined
  // sentence to carry all of them.
  const blockedKeys = useMemo(() => new Set(saveBlockers.map((c) => c.key)), [saveBlockers]);
  const flagFor = (checkKey: string, required?: boolean) => {
    const bad = error !== null && blockedKeys.has(checkKey);
    return {
      "aria-invalid": bad || undefined,
      "aria-describedby": bad ? "studio-error" : undefined,
      "aria-required": required || undefined,
    };
  };

  function renderField(field: AssetField) {
    const label = fieldLabel(field, loc) + (field.required ? " *" : "");
    const hint = ar ? field.help_ar : field.help_en;
    const val = attrs[field.key];
    const id = `attr-${field.key}`;
    /* ELITE-4 J2-11: a registry field that is holding the save says so on itself. */
    const flag = flagFor(`field:${field.key}`, field.required);
    if (field.type === "boolean") {
      return (
        <label key={field.key} className="flex items-center gap-2 text-[0.8125rem] py-1.5">
          <input type="checkbox" checked={val === true} onChange={(e) => setAttr(field.key, e.target.checked)} />
          <span>{ar ? field.label_ar : field.label_en}</span>
        </label>
      );
    }
    if (field.type === "tristate") {
      return (
        <div key={field.key}>
          <label className={lbl} htmlFor={id}>{label}</label>
          <select id={id} {...flag} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)} className={inp}>
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
          <select id={id} {...flag} value={(val as string) ?? ""} onChange={(e) => setAttr(field.key, e.target.value)} className={inp}>
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
          {...flag}
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
            <input id="title_en" {...flagFor("title_en", true)} dir="ltr" value={f.title_en} onChange={(e) => set("title_en", e.target.value)} className={inp} />
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
            <label className={lbl} htmlFor="area_sqm">{areaFieldLabel(loc)} *</label>
            <input id="area_sqm" {...flagFor("area_sqm", true)} type="number" inputMode="numeric" value={f.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} className={inp} />
            <p className={help}>{t("Area sets the unit rate and every comparison this listing appears in.", "المساحة تحدد سعر المتر وكل مقارنة تظهر فيها هذه القائمة.")}</p>
          </div>
        );
      case "price":
        return (
          <div key={key}>
            <label className={lbl} htmlFor="price">
              {priceFieldLabel(f.deal_type, loc)} *
            </label>
            <input id="price" {...flagFor("price", true)} type="number" inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} className={inp} />
          </div>
        );
      case "availability_confirmed":
        return (
          <label key={key} className="flex items-start gap-2 text-[0.8125rem] py-1.5">
            <input
              type="checkbox"
              checked={availableAt !== ""}
              onChange={(e) => { touch(); setAvailableAt(e.target.checked ? new Date().toISOString() : ""); }}
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
              {...flagFor("ad_permit", true)}
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
            <input id="ad_permit_expires_at" {...flagFor("permit_expiry", true)} type="date" value={f.ad_permit_expires_at} onChange={(e) => set("ad_permit_expires_at", e.target.value)} className={inp} />
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
            <label className="flex items-start gap-2 text-[0.8125rem]">
              <input type="checkbox" {...flagFor("right_to_market", true)} checked={rightToMarket} onChange={(e) => { touch(); setRightToMarket(e.target.checked); }} className="mt-0.5" />
              <span>{t("I confirm I have the right to market this property.", "أقرّ بأن لدي حق تسويق هذا العقار.")} *</span>
            </label>
          </div>
        );
      case "documents":
        return (
          <div key={key} className="space-y-2">
            <label className={lbl} htmlFor="doc_files">{t("Supporting documents (private)", "المستندات الداعمة (خاصة)")}</label>
            <p className="text-[0.6875rem] text-charcoal/65">
              {t("For SAT review only. Never shown to viewers, and uploading one does not by itself confirm anything.", "لمراجعة سات فقط. لا تظهر للزوار، ورفعها لا يؤكد شيئاً بذاته.")}
            </p>
            {isBroker && (
              <p className="text-[0.6875rem] text-charcoal/70">
                {t("As a broker, include your authorization to market and set its type below.", "بصفتك وسيطاً، أرفق تفويض التسويق واختر نوعه أدناه.")}
              </p>
            )}
            {stored.documents > 0 && (
              <p className="text-[0.6875rem] text-charcoal/70">
                {t(`${stored.documents} already attached. Anything you add here is added to those.`, `${stored.documents} مرفقة بالفعل. ما تضيفه هنا يُضاف إليها.`)}
              </p>
            )}
            <input
              key={`doc-${uploadRound}`}
              id="doc_files"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => { touch(); const arr = Array.from(e.target.files ?? []); setDocFiles(arr); setDocKinds(arr.map(() => "deed" as DocumentKind)); }}
              className="text-[0.8125rem]"
            />
            {/* Finding 157. Every row's select carried the same accessible name, so a
                lister uploading four documents met four controls all called "Document
                type" with no way to tell which file each one classifies: the file name
                is beside it on screen and reaches no reader. The name now carries the
                row number and the file name. The number is what guarantees uniqueness,
                because two uploads may legitimately share a name, and it also carries
                the case where the name is empty. Western numerals in both languages. */}
            {docFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[0.6875rem] text-charcoal/65 truncate" style={{ maxWidth: 150 }}>{file.name}</span>
                <select
                  aria-label={`${t("Document type", "نوع المستند")} ${i + 1}: ${file.name || t("unnamed file", "ملف بلا اسم")}`}
                  value={docKinds[i] ?? "deed"}
                  onChange={(e) => setDocKinds((p) => { const c = [...p]; c[i] = e.target.value as DocumentKind; return c; })}
                  className="text-[0.75rem] border border-charcoal/20 rounded px-1.5 py-1"
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
              {stored.photos > 0 && (
                <p className="text-[0.6875rem] text-charcoal/70 mb-1">
                  {t(`${stored.photos} photographs are already saved to this listing.`, `${stored.photos} صور محفوظة بالفعل في هذا العرض.`)}
                </p>
              )}
              <input
                key={`photo-${uploadRound}`}
                id="photo_files"
                aria-required="true"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => { void onPhotoFilesSelected(Array.from(e.target.files ?? [])); }}
                className="text-[0.8125rem]"
              />
              <p className={help}>{t("JPEG, PNG or WebP, up to 4MB each. Images are processed and their metadata stripped.", "JPEG أو PNG أو WebP، حتى 4 ميغابايت لكل صورة. تُعالَج الصور وتُزال بياناتها الوصفية.")}</p>
              {files.length > 0 && (
                <p className="text-[0.6875rem] text-charcoal/70 mt-1">
                  {t(`${files.length} file(s) ready to upload.`, `${files.length} ملفاً جاهزاً للرفع.`)}
                </p>
              )}
              {photoWarnings.length > 0 && (
                <ul role="status" className="mt-1 space-y-0.5">
                  {photoWarnings.map((w, i) => (
                    <li key={i} className="text-[0.6875rem] text-red">{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className={lbl} htmlFor="photo_urls">{t("Or paste photo links, one per line", "أو ألصق روابط الصور، رابط في كل سطر")}</label>
              <textarea id="photo_urls" dir="ltr" rows={3} value={photos} onChange={(e) => { touch(); setPhotos(e.target.value); }} className={inp} />
            </div>
          </div>
        );
      case "photo_set": {
        const n = stored.photos + photoUrls.length + files.length;
        return (
          <p key={key} className="text-[0.75rem] text-charcoal/70">
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
              {stored.floorplans > 0 && (
                <p className="text-[0.6875rem] text-charcoal/70 mb-1">
                  {t(`${stored.floorplans} plans are already saved to this listing.`, `${stored.floorplans} مخططات محفوظة بالفعل في هذا العرض.`)}
                </p>
              )}
              <input
                key={`floor-${uploadRound}`}
                id="floor_files"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(e) => { touch(); const arr = Array.from(e.target.files ?? []); setFloorFiles(arr); setFloorTypes(arr.map(() => defaultPlanType(f.asset_type))); }}
                className="text-[0.8125rem]"
              />
              {/* Finding 157, the same defect on the plan rows. */}
              {floorFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <span className="text-[0.6875rem] text-charcoal/65 truncate" style={{ maxWidth: 150 }}>{file.name}</span>
                  <select
                    aria-label={`${t("Plan type", "نوع المخطط")} ${i + 1}: ${file.name || t("unnamed file", "ملف بلا اسم")}`}
                    value={floorTypes[i] ?? defaultPlanType(f.asset_type)}
                    onChange={(e) => setFloorTypes((p) => { const c = [...p]; c[i] = e.target.value as PlanType; return c; })}
                    className="text-[0.75rem] border border-charcoal/20 rounded px-1.5 py-1"
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
              <input key={`brochure-${uploadRound}`} id="brochure" type="file" accept="application/pdf" onChange={(e) => { touch(); setBrochureFile(e.target.files?.[0] ?? null); }} className="text-[0.8125rem]" />
              {brochureFile && <p className="text-[0.6875rem] text-charcoal/65 mt-1">{brochureFile.name.slice(0, 40)}</p>}
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
          /* ELITE-4 J2-11: LocationPicker owns several controls, so the group
             carries the state rather than any one box inside it. That was the right
             reading and the wrong element. Finding 153, slice H: a <div> carrying a
             label class is styled text, so the caption named nothing and the several
             controls were not a group, they were a run of unrelated boxes. It is now
             the element that means a group. Only `aria-describedby` is carried over
             from `flagFor`, because `aria-invalid` is not supported on `group` and
             was inert on the <div> too, so nothing is lost; the invalid state lives
             on the controls, and the group now points at the error that named it. */
          <fieldset key={key} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }} aria-describedby={flagFor("coordinates")["aria-describedby"]}>
            <legend className={lbl}>{t("Place the building on the map", "حدّد موقع المبنى على الخريطة")} *</legend>
            <LocationPicker locale={loc} districts={districts} value={place} onChange={(v) => { touch(); setPlace(v); }} />
          </fieldset>
        );
      case "district":
        return (
          <p key={key} className="text-[0.75rem] text-charcoal/70">
            {districtName
              ? t(`District derived from the pin: ${districtName}. You can move the pin to change it.`, `الحي المشتق من الدبوس: ${districtName}. يمكنك تحريك الدبوس لتغييره.`)
              : t("The district is derived from the pin once you place it.", "يُشتق الحي من الدبوس بعد وضعه.")}
          </p>
        );
      case "building":
        return (
          <p key={key} className="text-[0.75rem] text-charcoal/70">
            {t("SAT links the building record after review, so building facts show as context rather than as facts about this space.", "تربط سات سجل المبنى بعد المراجعة، لتظهر حقائق المبنى كسياق لا كحقائق عن هذه المساحة.")}
          </p>
        );
      case "contact":
        return (
          <div key={key} className="space-y-2">
            <div>
              <label className={lbl} htmlFor="contact_phone">{t("Contact phone (WhatsApp and calls)", "هاتف التواصل (واتساب واتصال)")} *</label>
              <input id="contact_phone" aria-required="true" dir="ltr" inputMode="tel" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl} htmlFor="contact_email">{t("Contact email", "البريد الإلكتروني")}</label>
              <input id="contact_email" dir="ltr" inputMode="email" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} className={inp} />
            </div>
            <fieldset className="flex flex-wrap gap-3 text-[0.8125rem]">
              <legend className={lbl}>{t("How viewers may reach you", "كيف يصل إليك الزائر")}</legend>
              {(([["whatsapp", "WhatsApp", "واتساب"], ["call", "Call", "اتصال"], ["email", "Email", "بريد إلكتروني"], ["message", "Message on SAT", "رسالة عبر سات"]]) as [string, string, string][]).map(([k, en, arLab]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={(ch as Record<string, boolean>)[k]} onChange={(e) => { touch(); setCh((p) => ({ ...p, [k]: e.target.checked })); }} />
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

  // PKG-LISTING-CREATION-1A. This adapter is the ONLY place Studio state turns
  // into a DraftListingInput, so the review step's preview and the real preview
  // route both compute figures, labels and attribute rows through the exact
  // same function (buildListingPresentation), never a second, hand-derived
  // copy. What it cannot supply from client state alone: uploaded photos as
  // resolved URLs (nothing here has signed them), and any SAT-side verification
  // column (a draft has none to show regardless). Both are honestly absent
  // here rather than faked, and the "View the full preview" link below reaches
  // the server route where photos and verification state are real.
  function draftInputFromState(): DraftListingInput {
    const d = districts.find((x) => x.id === place.districtId);
    return {
      asset_type: f.asset_type,
      deal_type: f.deal_type,
      area_sqm: f.area_sqm === "" ? null : Number(f.area_sqm),
      price: f.price === "" ? null : Number(f.price),
      title_en: f.title_en, title_ar: f.title_ar,
      description_en: f.description_en, description_ar: f.description_ar,
      reference_code: null,
      district: d ? { name_en: d.name_en, name_ar: d.name_ar, city: d.city ?? null } : null,
      contact_phone: f.contact_phone, contact_email: f.contact_email,
      contact_channels: Object.entries(ch).filter(([, v]) => v).map(([k]) => k),
      video_url: f.video_url,
      building_grade: (attrs.building_grade as string) ?? null,
      fitout_condition: (attrs.fitout_condition as string) ?? null,
      attributes: attrs,
      ad_permit_no: f.ad_permit_no, ad_permit_expires_at: f.ad_permit_expires_at,
      right_to_market_confirmed: rightToMarket,
      is_demo: true, // a draft has never been checked; never implied verified
    };
  }

  function preview(l: "en" | "ar") {
    const isAr = l === "ar";
    const p = buildListingPresentation(draftInputFromState(), l, { arabicConfirmedThisSession });
    return (
      <div dir={isAr ? "rtl" : "ltr"} className="rounded border border-line p-3" lang={l}>
        <div className="text-[0.6875rem] uppercase tracking-wide text-charcoal/65 mb-1">{isAr ? "العربية" : "English"}</div>
        <div className="font-display text-lg text-charcoal">
          {p.title || (isAr ? "بلا عنوان بعد" : "No title yet")}
        </div>
        <div className="text-[0.8125rem] text-charcoal/70 mt-1">
          {p.assetTypeLabel} · {p.dealLabel}{p.place ? ` · ${p.place}` : ""}
        </div>
        {(p.figures.areaText || p.figures.priceText) && (
          <div className="text-[0.8125rem] text-charcoal/70">
            {p.figures.areaText ?? ""}{p.figures.areaText && p.figures.priceText ? " · " : ""}{p.figures.priceText ?? ""}
          </div>
        )}
        {p.descriptionText && <p className="text-[0.8125rem] text-charcoal/70 mt-2 whitespace-pre-line">{p.descriptionText}</p>}
        {isAr && p.descriptionText && (
          <p className="text-[0.6875rem] text-charcoal/70 mt-1">
            {displayProvenanceLabel(p.arabicWording.description.provenance, true)}
          </p>
        )}
      </div>
    );
  }

  async function save() {
    // ELITE-4 J2-6: the no-op `aria-disabled` promises.
    if (busy) return;
    setError(null);
    if (isBroker && !docFiles.some((_, i) => docKinds[i] === "authorization")) {
      setError(t(
        "As a broker, add your authorization to market on the licence step and set its type to authorization.",
        "بصفتك وسيطاً، أضف تفويض التسويق في خطوة الترخيص واختر نوعه: تفويض بالتسويق.",
      ));
      go("compliance", true);
      return;
    }
    if (saveBlockers.length > 0) {
      const names = saveBlockers.map((c) => (ar ? c.label_ar : c.label_en)).join(ar ? "، " : ", ");
      setError(t("Saving needs these first: ", "الحفظ يحتاج هذه أولاً: ") + names);
      const target = stepOfCheck.get(saveBlockers[0].key);
      if (target) go(target, true);
      return;
    }
    // Not a completeness reading: the model records that an expiry date was
    // supplied, and the write path separately refuses one already in the past.
    if (Date.parse(f.ad_permit_expires_at) <= Date.now()) {
      setError(t("That licence has already expired.", "انتهت صلاحية هذه الرخصة."));
      go("compliance", true);
      return;
    }

    setBusy(true);
    // Create once, patch after. The fields differ because they must: creation
    // states the asset type and affirms the right to market, and neither of those
    // is something a lister may change afterwards (src/lib/listingEdit.ts), so a
    // patch does not carry them and the server would refuse them if it did.
    const shared = {
      deal_type: f.deal_type,
      district_id: place.districtId, lat: place.lat, lng: place.lng,
      area_sqm: f.area_sqm, price: f.price,
      title_en: f.title_en, title_ar: f.title_ar,
      description_en: f.description_en, description_ar: f.description_ar,
      contact_phone: f.contact_phone, contact_email: f.contact_email,
      contact_channels: Object.entries(ch).filter(([, v]) => v).map(([k]) => k),
      lister_type: f.lister_type,
      video_url: f.video_url, floorplan_url: f.floorplan_url,
      ad_permit_no: f.ad_permit_no.trim(), ad_permit_expires_at: f.ad_permit_expires_at,
      // An empty string, not null: on a patch that is how the lister withdraws a
      // confirmation they made earlier, and on a create it reads the same as absent.
      availability_confirmed_at: availableAt,
      attributes: attrs,
      // Only the links typed on this visit. The box is cleared after a save, so a
      // link that is already a media row is never sent twice.
      photos: photoUrls,
    };
    const existing = listingId;
    const res = await fetch(existing ? `/api/listings/${existing}` : `/api/listings`, {
      method: existing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        existing
          ? shared
          : { ...shared, asset_type: f.asset_type, right_to_market_confirmed: rightToMarket },
      ),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
      error_ar?: string;
      code?: string;
      field?: string;
    };
    if (!res.ok) {
      /* RC10, finding 22. `json.error` used to be rendered here, and it is an
         English sentence composed in the route, so every refusal on this form
         was delivered to an Arabic lister in English: the wrong area, the
         expired licence, the missing permit, the pin outside the Kingdom, and
         on a failed write PostgREST's own internal message. The route now
         states a stable code and `listingIntakeErrors.ts` names it in the
         language this page is already rendering, so the English sentence stays
         on the wire for logs and API consumers and reaches nobody.

         Two refinements. The edit route answers a location contradiction with
         a record-specific bilingual pair rather than a generic reason, and that
         pair is better than anything a table can hold, so it is preferred when
         it is there. And a rejected registry attribute names its own field:
         the route sends the field key, and the label comes from `fieldLabel`,
         the same function that drew the box the lister typed into, rather than
         from the route's `label_en`. */
      const specific = ar ? json.error_ar : undefined;
      const named = intakeErrorMessage(json.code, ar);
      const fld = json.field ? intakeFields(f.asset_type).find((x) => x.key === json.field) : undefined;
      const prefix = fld ? fieldLabel(fld, loc) + ": " : "";
      setError(specific || prefix + named);
      setBusy(false);
      return;
    }
    const id = existing ?? json.id ?? null;
    if (!id) {
      setError(t("The listing saved but its reference came back empty.", "حُفظ العرض لكن مرجعه عاد فارغاً."));
      setBusy(false);
      return;
    }
    // Arabic the lister wrote is already stamped as current by the write path, so
    // this fills only what was left empty and never overwrites their words.
    try {
      fetch(`/api/listings/${id}/translate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: "fast" }) });
    } catch {}

    // PKG-LISTING-CREATION-1A. Files chosen on this visit, uploaded one at a
    // time. This used to clear every file array unconditionally once the
    // round finished, which meant a single failed upload, a dropped
    // connection on file 4 of 6, silently discarded that photograph: the
    // lister was told the draft saved (which was true) with no sign that one
    // of their photos was not actually attached. Failed files now stay in
    // their input's state so a second "Save changes" press retries exactly
    // and only what did not make it, without re-selecting anything or losing
    // whatever did succeed in the same round.
    let addedPhotos = 0;
    let addedPlans = 0;
    let addedDocs = 0;
    const failedPhotoLabels: string[] = [];
    const failedPlanLabels: string[] = [];
    const remainingFiles: File[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      let ok = false;
      try {
        const r = await fetch(`/api/listings/${id}/media`, { method: "POST", body: fd });
        ok = r.ok;
      } catch {}
      if (ok) addedPhotos++;
      else { remainingFiles.push(file); failedPhotoLabels.push(file.name); }
    }
    const addedPlanTypes: (string | null)[] = [];
    const remainingFloorFiles: File[] = [];
    const remainingFloorTypes: PlanType[] = [];
    for (let i = 0; i < floorFiles.length; i++) {
      const file = floorFiles[i];
      const type = floorTypes[i] ?? defaultPlanType(f.asset_type);
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "floorplan");
      fd.append("plan_type", type);
      let ok = false;
      try {
        const r = await fetch(`/api/listings/${id}/${isPdf ? "docs" : "media"}`, { method: "POST", body: fd });
        ok = r.ok;
      } catch {}
      if (ok) { addedPlans++; addedPlanTypes.push(type); }
      else { remainingFloorFiles.push(file); remainingFloorTypes.push(type); failedPlanLabels.push(file.name); }
    }
    let remainingBrochure: File | null = null;
    let brochureFailed = false;
    if (brochureFile) {
      const fd = new FormData();
      fd.append("file", brochureFile);
      fd.append("kind", "brochure");
      let ok = false;
      try {
        const r = await fetch(`/api/listings/${id}/docs`, { method: "POST", body: fd });
        ok = r.ok;
      } catch {}
      if (ok) addedDocs++;
      else { remainingBrochure = brochureFile; brochureFailed = true; }
    }
    const remainingDocFiles: File[] = [];
    const remainingDocKinds: DocumentKind[] = [];
    for (let i = 0; i < docFiles.length; i++) {
      const fd = new FormData();
      fd.append("file", docFiles[i]);
      fd.append("kind", docKinds[i] ?? "other");
      let ok = false;
      try {
        const r = await fetch(`/api/listings/${id}/documents`, { method: "POST", body: fd });
        ok = r.ok;
      } catch {}
      if (ok) addedDocs++;
      else { remainingDocFiles.push(docFiles[i]); remainingDocKinds.push(docKinds[i]); }
    }

    setStored((p) => ({
      photos: p.photos + addedPhotos + photoUrls.length,
      floorplans: p.floorplans + addedPlans,
      planTypes: [...p.planTypes, ...addedPlanTypes],
      documents: p.documents + addedDocs,
    }));
    // Only the files that actually made it are cleared from their inputs.
    // Whatever failed stays exactly where it was, ready to retry.
    setFiles(remainingFiles);
    setFloorFiles(remainingFloorFiles);
    setFloorTypes(remainingFloorTypes);
    setBrochureFile(remainingBrochure);
    setDocFiles(remainingDocFiles);
    setDocKinds(remainingDocKinds);
    setPhotos("");
    setUploadRound((n) => n + 1);
    setListingId(id);
    setSaved(true);
    setBusy(false);

    const failedUploads = [...failedPhotoLabels, ...failedPlanLabels, ...(brochureFailed && brochureFile ? [brochureFile.name] : [])];
    if (failedUploads.length > 0) {
      setError(t(
        `The listing saved, but ${failedUploads.length} file(s) did not upload: ${failedUploads.join(", ")}. They are still selected below; press Save again to retry them.`,
        `حُفظ العرض، لكن ${failedUploads.length} ملفاً لم يُرفع: ${failedUploads.join("، ")}. لا تزال محددة أدناه؛ اضغط حفظ مجدداً لإعادة المحاولة.`,
      ));
    }
    // The lister stays in the Studio rather than being thrown out to the
    // dashboard: saving is a checkpoint, not an exit. replace() rather than
    // push() so the address becomes the resumable one without leaving a blank
    // new listing behind in the history.
    if (!existing) router.replace(`/${locale}/dashboard/new?draft=${id}`);
  }

  const missing = missingChecks(quality);
  const resumeId = resumeStepId(steps, quality);

  return (
    <div className="max-w-2xl" aria-busy={busy || undefined}>
      <div className="rounded-lg border border-line bg-ivory-2/40 p-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[0.75rem] text-charcoal/70">
            {t(`Step ${step.index} of ${steps.length}`, `الخطوة ${step.index} من ${steps.length}`)}
          </div>
          <div className="text-[0.75rem] text-charcoal/70">
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
          <button type="button" onClick={() => go(resumeId)} className="mt-2 text-[0.75rem] text-signal underline min-h-[44px]">
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
                    "rounded border px-2.5 py-2 text-[0.75rem] min-h-[44px] whitespace-nowrap " +
                    (isHere ? "border-signal text-signal font-medium" : "border-line text-charcoal/70")
                  }
                >
                  <span>{ar ? s.title_ar : s.title_en}</span>
                  {/* text-red, not text-red. tailwind.config.ts sets colors.red to a
                      single hex string, which replaces Tailwind's default red scale
                      object wholesale, so every numeric shade of it stops existing and
                      the class compiles to nothing. This marker was invisible. */}
                  {p && p.state === "blocked" && <span className="ms-1.5 text-red" aria-hidden="true">!</span>}
                  {/* RC9b, finding 156: the four step states were carried on screen by
                      border and text colour alone. Only "blocked" had a non-colour
                      marker, and it was the invisible one above, so in practice a
                      person who cannot separate signal from charcoal saw twelve
                      identical chips. The count is the non-colour carrier: 0 of 5
                      reads as not started, 5 of 5 as done, anything between as part
                      done. It is the phrasing this component already uses twice, at
                      :955 for the whole listing and again on the current step, so it
                      introduces no new vocabulary and needs no legend. The blocked "!"
                      stays because a blocked step can be 4 of 5 and so is not
                      separable by the count alone. Western numerals in both languages,
                      which this platform requires anyway. It costs about 28 pixels of
                      width on a rail that already scrolls horizontally, so it buys the
                      distinction with scrolling rather than with layout. */}
                  {p && p.askable > 0 && <span className="ms-1.5 fig" aria-hidden="true">{p.answered}/{p.askable}</span>}
                  <span className="sr-only">
                    {p ? ` ${stateLabel(p.state, ar)}` : ""}
                    {p && p.askable > 0 ? t(`, ${p.answered} of ${p.askable} facts supplied`, `، ${p.answered} من ${p.askable} حقيقة مُدخلة`) : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ELITE-4 J2-11: the alert used to sit BELOW the step it was about, while
          `go()` scrolled the window to the top, so the lister was carried to a step
          whose explanation was off the bottom of the screen. */}
      {error && <p id="studio-error" role="alert" className="mt-3 text-sm text-red">{error}</p>}

      <section className="mt-4 rounded-lg border border-line p-4" aria-labelledby="step-title">
        {/* ELITE-4 J2-7: the heading takes focus after every step change. */}
        <h2 id="step-title" tabIndex={-1} className="font-display text-lg text-charcoal">{ar ? step.title_ar : step.title_en}</h2>
        <p className="text-[0.75rem] text-charcoal/65 mt-1">{ar ? step.purpose_ar : step.purpose_en}</p>
        {/* ELITE-4 J2-11: the asterisk had no key anywhere on the screen. */}
        {step.kind !== "review" && (
          <p className="text-[0.6875rem] text-charcoal/65 mt-1">{t("* marks a fact this listing cannot be saved without.", "* يشير إلى حقيقة لا يمكن حفظ العرض بدونها.")}</p>
        )}

        <div className="mt-4 space-y-3">
          {step.kind === "asset" && (
            <>
              <div>
                <label className={lbl} htmlFor="asset_type">{t("Asset type", "نوع الأصل")}</label>
                <select
                  id="asset_type"
                  value={f.asset_type}
                  disabled={listingId !== null}
                  onChange={(e) => onAssetChange(e.target.value)}
                  className={inp + (listingId !== null ? " bg-charcoal/5 text-charcoal/70" : "")}
                >
                  {ASSET_TYPES.map((a) => <option key={a} value={a}>{assetLabel(a, loc)}</option>)}
                </select>
                {listingId !== null && (
                  <p className={help}>
                    {t(
                      "The asset type decides which facts this listing carries, so it is fixed once the listing is saved. A different asset type is a different listing.",
                      "نوع الأصل يحدد الحقائق التي يحملها هذا العرض، ولذلك يثبت بعد حفظ العرض. نوع أصل مختلف يعني عرضاً مختلفاً.",
                    )}
                  </p>
                )}
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

          {step.kind === "media" && (
            <>
              <MediaBrief
                assetType={f.asset_type}
                held={{
                  photos: stored.photos + photoUrls.length + files.length,
                  planTypes: [...stored.planTypes, ...floorTypes.slice(0, floorFiles.length)],
                  video: f.video_url.trim().length > 0,
                }}
                ar={ar}
              />
              {/* PKG-LISTING-CREATION-1A. Each photo view this asset type asks for,
                  with the six-state vocabulary and a real, session-only way to say
                  a view genuinely does not exist rather than leaving it silently
                  missing. This does not replace MediaBrief above; MediaBrief is the
                  bilingual "why" for each view, this is the state and the
                  mark-unavailable control. */}
              <div className="mt-4 rounded border border-line p-3">
                <div className="text-[0.75rem] font-medium text-charcoal/80">
                  {t("Each view, and its state", "كل لقطة، وحالتها")}
                </div>
                <ul className="mt-2 space-y-2">
                  {evidenceItems.filter((i) => i.kind === "photo").map((item) => (
                    <li key={item.key} className="text-[0.75rem]">
                      <div className="flex items-center justify-between gap-2">
                        <span>{ar ? item.label_ar : item.label_en}</span>
                        <span className="text-charcoal/65">{evidenceStateLabel(item.state, ar)}</span>
                      </div>
                      {(item.state === "awaiting_evidence" || item.state === "unavailable") && item.weight !== "optional" && (
                        <div className="mt-1">
                          <label className="flex items-center gap-1.5 text-[0.6875rem] text-charcoal/70">
                            <input
                              type="checkbox"
                              checked={item.state === "unavailable"}
                              onChange={(e) => setItemUnavailable(item.key, e.target.checked, unavailableItems.get(item.key) ?? "")}
                            />
                            {t("This view does not exist for this space", "هذه اللقطة غير موجودة لهذه المساحة")}
                          </label>
                          {item.state === "unavailable" && (
                            <input
                              type="text"
                              value={unavailableItems.get(item.key) ?? ""}
                              onChange={(e) => setItemUnavailable(item.key, true, e.target.value)}
                              placeholder={t("Why, briefly (optional)", "السبب، باختصار (اختياري)")}
                              className="mt-1 w-full rounded border border-charcoal/20 px-2 py-1 text-[0.6875rem] min-h-[44px]"
                            />
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-[0.6875rem] text-charcoal/70 mt-2">
                  {t(
                    "These answers are kept for this visit only and are not saved to the listing. They help you track what is left, and disappear if you leave this page.",
                    "هذه الإجابات محفوظة لهذه الزيارة فقط ولا تُحفظ في العرض. تساعدك على معرفة ما تبقّى، وتختفي إن غادرت الصفحة.",
                  )}
                </p>
              </div>
            </>
          )}

          {step.platformKeys.map(renderPlatform)}
          {step.fields.filter((x) => !PLATFORM_OWNED_FIELD_KEYS.has(x.key)).map(renderField)}

          {step.kind === "review" && (
            <div className="space-y-4">
              {quality.contradictions.length > 0 && (
                <div className="rounded border border-red/40 p-3">
                  <div className="text-[0.75rem] font-medium text-charcoal/80">{t("These cannot both be true", "لا يمكن أن يصحّ هذان معاً")}</div>
                  <ul className="mt-1.5 space-y-1 text-[0.75rem] text-charcoal/70">
                    {quality.contradictions.map((c) => <li key={c.kind + c.fields.join()}>{ar ? c.statement_ar : c.statement_en}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <div className="text-[0.75rem] font-medium text-charcoal/80">{t("Still missing", "ما زال ناقصاً")}</div>
                {missing.length === 0 ? (
                  <p className="text-[0.75rem] text-charcoal/70 mt-1">{t("Nothing. Every fact this listing can carry is here.", "لا شيء. كل حقيقة يمكن أن تحملها هذه القائمة موجودة.")}</p>
                ) : (
                  <ul className="mt-1.5 space-y-2">
                    {missing.map((c) => (
                      <li key={c.key} className="text-[0.75rem]">
                        <button
                          type="button"
                          onClick={() => { const target = stepOfCheck.get(c.key); if (target) go(target); }}
                          className="text-start underline text-charcoal/80 min-h-[44px]"
                        >
                          {ar ? c.label_ar : c.label_en}
                        </button>
                        <span className="text-charcoal/65"> · {weightLabel(c.weight, ar)}</span>
                        <p className="text-[0.6875rem] text-charcoal/65">{ar ? c.why_ar : c.why_en}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* PKG-LISTING-CREATION-1A. The evidence mission's own completeness
                  summary, counted by the six-state vocabulary, never a single
                  fabricated score (see guidedEvidence.ts). Distinct from "Still
                  missing" above, which reads listingQuality.ts's essential facts;
                  this reads the fuller mission, photos included. */}
              <div>
                <div className="text-[0.75rem] font-medium text-charcoal/80">{t("Evidence mission", "مهمة الأدلة")}</div>
                <p className="text-[0.75rem] text-charcoal/70 mt-1">
                  {t(
                    `${evidenceSum.requiredOutstanding} required item(s) still missing, ${evidenceSum.recommendedOutstanding} recommended item(s) still missing, ${evidenceSum.unavailable} marked unavailable.`,
                    `${evidenceSum.requiredOutstanding} عنصراً مطلوباً لا يزال ناقصاً، ${evidenceSum.recommendedOutstanding} موصى به لا يزال ناقصاً، ${evidenceSum.unavailable} مُحدَّد كغير متاح.`,
                  )}
                </p>
              </div>
              <div>
                <div className="text-[0.75rem] font-medium text-charcoal/80">{t("As a visitor will read it", "كما سيقرأه الزائر")}</div>
                <div className="mt-2 space-y-2">
                  {preview("en")}
                  {preview("ar")}
                </div>
                {ar && (f.title_ar || f.description_ar) && !arabicConfirmedThisSession && (
                  <button
                    type="button"
                    onClick={() => setArabicConfirmedThisSession(true)}
                    className="mt-2 text-[0.75rem] text-signal underline min-h-[44px]"
                  >
                    {t("Confirm the Arabic above reads correctly", "أؤكد أن النص العربي أعلاه صحيح")}
                  </button>
                )}
                {/* The real preview: the same server route, the same rendering the
                    public page uses, with real uploaded photos and real
                    verification state. Only reachable once a row exists to render. */}
                {listingId !== null && (
                  <Link
                    href={`/${locale}/dashboard/listings/${listingId}/preview`}
                    className="mt-2 inline-block text-[0.75rem] text-signal underline min-h-[44px]"
                  >
                    {t("View the full preview, with your uploaded photos", "عرض المعاينة الكاملة، بالصور التي رفعتها")}
                  </Link>
                )}
              </div>
              <p className="text-[0.6875rem] text-charcoal/65">
                {t("Saved as a draft. SAT reviews a listing before it publishes, and nothing here is a confirmation by SAT.", "يُحفظ كمسودة. تراجع سات العرض قبل نشره، ولا شيء هنا تأكيد من سات.")}
              </p>
            </div>
          )}
        </div>

        {here && here.askable > 0 && step.kind !== "review" && (
          <p className="mt-4 text-[0.75rem] text-charcoal/65">
            {t(`${here.answered} of ${here.askable} on this step. `, `${here.answered} من ${here.askable} في هذه الخطوة. `)}
            {stateLabel(here.state, ar)}
          </p>
        )}
      </section>

      {/* Saving keeps the lister here. The note says what was saved and where it
          can be picked up again, which is the address in the browser bar, and it
          disappears the moment anything changes, because from then on the server
          no longer holds what is on the screen. Nothing here reads as a
          confirmation by SAT (D24): it is a draft, and it says so. */}
      {saved && (
        <div role="status" className="mt-3 rounded border border-line bg-ivory-2/40 p-3 text-[0.75rem] text-charcoal/70">
          <p>{t("Saved as a draft. You can close this page and come back to this address to continue.", "حُفظ كمسودة. يمكنك إغلاق الصفحة والعودة إلى هذا العنوان للمتابعة.")}</p>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="mt-1.5 text-signal underline min-h-[44px]"
          >
            {t("Go to your listings", "انتقل إلى عروضك")}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-busy={busy || undefined}>
        <button
          type="button"
          disabled={at === 0}
          onClick={() => go(steps[Math.max(0, at - 1)].id)}
          className="rounded border border-line px-4 py-2 min-h-[44px] text-[0.8125rem] disabled:opacity-40"
        >
          {t("Back", "السابق")}
        </button>
        {at < steps.length - 1 && (
          <button
            type="button"
            onClick={() => go(steps[at + 1].id)}
            className="rounded border border-line px-4 py-2 min-h-[44px] text-[0.8125rem]"
          >
            {t("Next", "التالي")}
          </button>
        )}
        {/* ELITE-4 J2-6: `disabled` would blur this button the instant it is
            pressed, which is the one moment the lister needs to stay on it. */}
        <button
          type="button"
          aria-disabled={busy || undefined}
          onClick={save}
          className={"rounded bg-signal px-4 py-2 min-h-[44px] text-[0.8125rem] text-white" + (busy ? " opacity-60" : "")}
        >
          {busy
            ? t("Saving...", "جارٍ الحفظ...")
            : listingId !== null
              ? t("Save changes", "حفظ التغييرات")
              : t("Save draft", "حفظ المسودة")}
        </button>
        <span className="text-[0.6875rem] text-charcoal/65">
          {saveBlockers.length === 0
            ? t("You can save now and finish later.", "يمكنك الحفظ الآن وإكمال الباقي لاحقاً.")
            : t(`${saveBlockers.length} facts are needed before this can be saved.`, `${saveBlockers.length} حقائق مطلوبة قبل الحفظ.`)}
        </span>
      </div>
    </div>
  );
}
