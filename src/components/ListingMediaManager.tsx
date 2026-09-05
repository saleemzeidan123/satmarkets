"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/satkit";
import { apiErrorMessage } from "@/lib/apiErrors";
import { mediaStandardFor } from "@/lib/mediaStandard";

// The owner's photo manager for a listing. Add photos (uploaded, sniffed and
// re-encoded server-side), remove them, choose the cover (the first photo, the
// one the search card and the gallery hero use), and categorize each one: which
// named shot (mediaStandard.ts, asset-type specific) it answers, and whether it
// shows the building or the unit, current condition or an illustrative example.
// It talks to the same owner-scoped media routes the create flow uses, and
// refreshes after each change so the grid and the public listing agree.
// Verification is never touched here: a photo is a photo.
//
// PKG-LISTING-CREATION-1B outcome B. shot_key, media_scope and media_condition
// are the only three of the migration's new listing_media columns this pass
// builds UI for (plus the read-only visibility badge below). This component
// already has a working "cover photo" concept (sort_order 0, the t.cover
// badge and makeCover below); an earlier draft of the migration also added
// an is_cover boolean, and Codex's own review ruled it out entirely (not
// deferred: removed from the migration) rather than ship a second,
// unused source of truth for the same fact. rights_acknowledged_by/at and
// moderation_state remain out of scope for this pass: no control sets
// either yet, and building UI for a state nothing can produce would be a
// half-finished feature, so they wait for a separate, later decision.
type Photo = {
  id: string;
  url: string | null;
  shot_key: string | null;
  media_scope: string | null;
  media_condition: string | null;
  visibility: string;
};

type CategoryPatch = {
  shot_key?: string | null;
  media_scope?: string | null;
  media_condition?: string | null;
};

const sel = {
  width: "100%",
  borderRadius: 6,
  border: "1px solid var(--silver)",
  padding: "4px 6px",
  fontSize: "0.71875rem",
  color: "var(--ink)",
  background: "var(--paper)",
  fontFamily: "var(--sans)",
};

export default function ListingMediaManager({
  id,
  locale,
  photos,
  assetType,
}: {
  id: string;
  locale: string;
  photos: Photo[];
  assetType: string;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // The visually hidden file input cannot show its own focus ring, so the label
  // that stands in for it draws one. See ELITE-4 J2-1 below.
  const [focused, setFocused] = useState(false);

  // The shot taxonomy is asset-type specific (mediaStandard.ts), so the list of
  // choices this component offers has to be too. Recomputed from the prop on
  // every render, deliberately not memoized: mediaStandardFor is pure and cheap
  // (a handful of array literals), and this file does not use memoization
  // anywhere else.
  const shots = mediaStandardFor(assetType).shots;

  const t = ar ? {
    title: "الصور", cover: "الغلاف", makeCover: "اجعلها الغلاف", remove: "حذف", add: "إضافة صور",
    uploading: "جارٍ الرفع...", none: "لا توجد صور بعد. أضف صوراً ليراها المهتمّون.",
    hint: "JPEG أو PNG أو WebP، حتى 4 ميغابايت. أول صورة هي الغلاف.",
    errUp: "تعذّر رفع الصورة.", errRm: "تعذّر الحذف.", errReorder: "تعذّر تعيين الغلاف.", added: "تمت الإضافة", removed: "تم الحذف", coverSet: "تم تعيين الغلاف",
    // ELITE-4 J2-9: one accessible name per tile, not N identical ones.
    photoAt: (n: number) => `صورة ${n}`,
    makeCoverAt: (n: number) => `اجعل الصورة ${n} صورة الغلاف`,
    removeAt: (n: number) => `احذف الصورة ${n}`,
    // PKG-LISTING-CREATION-1B outcome B. Per-shot categorization.
    shotLabel: "اللقطة", shotNone: "غير مصنّفة بعد",
    scopeLabel: "النطاق", scopeNone: "غير محدّد", scopeBuilding: "المبنى", scopeUnit: "الوحدة",
    // Fable review: "الحالة" reads to a Saudi lister as the property's physical
    // condition (the field this same word names elsewhere), not "is this a
    // current photo or an illustrative one". Renamed to avoid that collision;
    // the underlying values (current/illustrative) are unchanged.
    conditionLabel: "نوع الصورة", conditionNone: "غير محدّد", conditionCurrent: "صورة حالية", conditionIllustrative: "توضيحية",
    errCategorize: "تعذّر حفظ التصنيف.", categorized: "تم الحفظ",
    shotAt: (n: number) => `لقطة الصورة ${n}`,
    scopeAt: (n: number) => `نطاق الصورة ${n}`,
    conditionAt: (n: number) => `نوع الصورة ${n}`,
    // Codex finding: visibility is enforced on every public read now (see
    // mediaVisibility.ts), but nothing in this pass gives a lister a control
    // to actually set it to private (that is its own product decision, the
    // same "no control exists yet" class as rights_acknowledged_by/at
    // above). This badge is the honest, forward-compatible half: if a
    // photo's visibility is ever recorded as private by any means, its
    // owner sees that plainly here, rather than the Studio silently
    // disagreeing with what the public page shows.
    privateBadge: "خاصة",
  } : {
    title: "Photos", cover: "Cover", makeCover: "Make cover", remove: "Remove", add: "Add photos",
    uploading: "Uploading...", none: "No photos yet. Add some so viewers can see the space.",
    hint: "JPEG, PNG, or WebP, up to 4MB each. The first photo is the cover.",
    errUp: "Could not upload the photo.", errRm: "Could not remove.", errReorder: "Could not set the cover.", added: "Added", removed: "Removed", coverSet: "Cover set",
    // ELITE-4 J2-9: one accessible name per tile, not N identical ones.
    photoAt: (n: number) => `Photo ${n}`,
    makeCoverAt: (n: number) => `Make photo ${n} the cover`,
    removeAt: (n: number) => `Remove photo ${n}`,
    // PKG-LISTING-CREATION-1B outcome B. Per-shot categorization.
    shotLabel: "Shot", shotNone: "Not yet categorised",
    scopeLabel: "Scope", scopeNone: "Not set", scopeBuilding: "Building", scopeUnit: "Unit",
    // Fable review: renamed from "Condition", which reads as the property's
    // physical condition rather than "current photo vs. illustrative". The
    // underlying values (current/illustrative) are unchanged.
    conditionLabel: "Photo type", conditionNone: "Not set", conditionCurrent: "Current photo", conditionIllustrative: "Illustrative",
    errCategorize: "Could not save the category.", categorized: "Saved",
    shotAt: (n: number) => `Shot for photo ${n}`,
    scopeAt: (n: number) => `Scope for photo ${n}`,
    conditionAt: (n: number) => `Photo type for photo ${n}`,
    privateBadge: "Private",
  };

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    // ELITE-4 J2-6: nothing here is ever given the `disabled` attribute, so no
    // control is blurred mid-request. These guards are what `aria-disabled` states.
    if (busy) return;
    const list = Array.from(e.target.files ?? []);
    if (!list.length) return;
    setBusy(true); setErr(null); setNote(null);
    let ok = 0;
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch(`/api/listings/${id}/media`, { method: "POST", body: fd });
        if (res.ok) ok++;
        // Finding 203: the route names the reason as a code and this names the
        // code in the reader's language. The English sentence the route composed
        // stays on the wire for the log and is not rendered.
        else { const j = await res.json().catch(() => ({})); setErr(apiErrorMessage(j.code, ar, t.errUp)); }
      } catch { setErr(t.errUp); }
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
    if (ok) { setNote(t.added); router.refresh(); }
  }

  async function remove(mediaId: string) {
    if (busy) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch(`/api/listings/${id}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(apiErrorMessage(j.code, ar, t.errRm)); setBusy(false); return; }
      setNote(t.removed); setBusy(false); router.refresh();
    } catch { setErr(t.errRm); setBusy(false); }
  }

  async function makeCover(mediaId: string) {
    if (busy) return;
    const order = [mediaId, ...photos.map((p) => p.id).filter((x) => x !== mediaId)];
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch(`/api/listings/${id}/media`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(apiErrorMessage(j.code, ar, t.errReorder)); setBusy(false); return; }
      setNote(t.coverSet); setBusy(false); router.refresh();
    } catch { setErr(t.errRm); setBusy(false); }
  }

  // PKG-LISTING-CREATION-1B outcome B. One PATCH per changed field, on the
  // per-row route (media/[mediaId]/route.ts), which validates shot_key against
  // this listing's real asset_type server-side rather than trusting the
  // selection just rendered from the same taxonomy on the client.
  async function setCategory(mediaId: string, patch: CategoryPatch) {
    if (busy) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await fetch(`/api/listings/${id}/media/${mediaId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(apiErrorMessage(j.code, ar, t.errCategorize)); setBusy(false); return; }
      setNote(t.categorized); setBusy(false); router.refresh();
    } catch { setErr(t.errCategorize); setBusy(false); }
  }

  return (
    <div aria-busy={busy || undefined}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "0.90625rem", fontWeight: 700 }}>{t.title} <span className="muted" style={{ fontWeight: 400, fontSize: "0.8125rem" }}>· {photos.length}</span></div>
        {/* ELITE-4 J2-1: the input was `display:none`, which takes it out of the tab
            order and out of the accessibility tree, and a <label> is not focusable,
            so photographs could not be attached by keyboard at all. It is now
            visually hidden but focusable, tied to the label by id, and the label
            paints the focus ring on its behalf so the ring is not clipped away. */}
        <label
          className="btn secondary"
          htmlFor="lmm-add-photos"
          style={{ cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, position: "relative", outline: focused ? "2px solid var(--harbor)" : undefined, outlineOffset: 2 }}
        >
          <Icon.plus size={15} /> {busy ? t.uploading : t.add}
          <input
            id="lmm-add-photos"
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onUpload}
            aria-disabled={busy || undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.8125rem" }}>{t.none}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%, 160px), 1fr))", gap: 12 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ border: "1px solid var(--silver)", borderRadius: 10, overflow: "hidden", background: "var(--paper)" }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--cool)" }}>
                {p.url ? <img src={p.url} alt={t.photoAt(i + 1)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                {i === 0 && (
                  <span style={{ position: "absolute", top: 8, insetInlineStart: 8, fontSize: "0.65625rem", fontWeight: 700, letterSpacing: ".03em", color: "var(--on-brand)", background: "var(--harbor)", padding: "3px 8px", borderRadius: 6 }}>{t.cover}</span>
                )}
                {p.visibility !== "public" && (
                  <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, fontSize: "0.65625rem", fontWeight: 700, letterSpacing: ".03em", color: "var(--on-brand)", background: "var(--ink)", padding: "3px 8px", borderRadius: 6 }}>{t.privateBadge}</span>
                )}
              </div>

              {/* PKG-LISTING-CREATION-1B outcome B. Which shot this photo answers,
                  from THIS listing's own asset-type taxonomy, plus scope and
                  condition. A generic "not yet categorised" / "not set" option
                  always clears the field back to null, an honest state and not
                  an error (the migration's own header comment). */}
              <div style={{ padding: "8px 10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ display: "block" }}>
                  <span className="muted" style={{ fontSize: "0.625rem", display: "block", marginBottom: 2 }}>{t.shotLabel}</span>
                  <select
                    value={p.shot_key ?? ""}
                    onChange={(e) => setCategory(p.id, { shot_key: e.target.value || null })}
                    aria-disabled={busy || undefined}
                    aria-label={t.shotAt(i + 1)}
                    style={sel}
                  >
                    <option value="">{t.shotNone}</option>
                    {shots.map((s) => (
                      <option key={s.key} value={s.key}>{ar ? s.label_ar : s.label_en}</option>
                    ))}
                  </select>
                </label>
                <div className="row gap6">
                  <label style={{ display: "block", flex: 1 }}>
                    <span className="muted" style={{ fontSize: "0.625rem", display: "block", marginBottom: 2 }}>{t.scopeLabel}</span>
                    <select
                      value={p.media_scope ?? ""}
                      onChange={(e) => setCategory(p.id, { media_scope: (e.target.value || null) as "building" | "unit" | null })}
                      aria-disabled={busy || undefined}
                      aria-label={t.scopeAt(i + 1)}
                      style={sel}
                    >
                      <option value="">{t.scopeNone}</option>
                      <option value="building">{t.scopeBuilding}</option>
                      <option value="unit">{t.scopeUnit}</option>
                    </select>
                  </label>
                  <label style={{ display: "block", flex: 1 }}>
                    <span className="muted" style={{ fontSize: "0.625rem", display: "block", marginBottom: 2 }}>{t.conditionLabel}</span>
                    <select
                      value={p.media_condition ?? ""}
                      onChange={(e) => setCategory(p.id, { media_condition: (e.target.value || null) as "current" | "illustrative" | null })}
                      aria-disabled={busy || undefined}
                      aria-label={t.conditionAt(i + 1)}
                      style={sel}
                    >
                      <option value="">{t.conditionNone}</option>
                      <option value="current">{t.conditionCurrent}</option>
                      <option value="illustrative">{t.conditionIllustrative}</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="row gap8" style={{ padding: "8px 10px", justifyContent: "space-between" }}>
                {/* ELITE-4 J2-9: every tile used to repeat the same two names, so a
                    screen reader read N identical "Remove" buttons with nothing to
                    tell them apart. The position is now part of each name and of
                    the image's own alternative text. */}
                {i !== 0 ? (
                  <button type="button" onClick={() => makeCover(p.id)} aria-disabled={busy || undefined} aria-label={t.makeCoverAt(i + 1)} className="chip" style={{ cursor: "pointer", fontSize: "0.71875rem", opacity: busy ? 0.6 : 1 }}>{t.makeCover}</button>
                ) : <span />}
                <button type="button" onClick={() => remove(p.id)} aria-disabled={busy || undefined} aria-label={t.removeAt(i + 1)} className="chip" style={{ cursor: "pointer", fontSize: "0.71875rem", color: "var(--red)", borderColor: "var(--silver)", opacity: busy ? 0.6 : 1 }}>
                  <Icon.trash size={13} /> {t.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row gap10" style={{ marginTop: 10, alignItems: "center" }}>
        <p className="muted" style={{ fontSize: "0.71875rem", margin: 0 }}>{t.hint}</p>
        {note && <span style={{ fontSize: "0.78125rem", color: "var(--harbor-d)" }}>{note}</span>}
        {err && <span style={{ fontSize: "0.78125rem", color: "var(--red)" }}>{err}</span>}
      </div>
    </div>
  );
}
