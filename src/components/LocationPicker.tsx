"use client";
import { useEffect, useId, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { nearestLocation, locationById, type LocationPoint } from "@/lib/nearestLocation";
import { parseLatLng, isMapShareUrl } from "@/lib/parseLatLng";
import { placeName } from "@/lib/displayName";
import { cityLabel } from "@/lib/labels";
import { kindLabel } from "@/lib/locationKind";
import { assessLocationConsistency } from "@/lib/locationConsistency";

// Lets a lister place the exact building: search, click the map, drag the pin, or
// type coordinates. Coordinates are the source of truth.
//
// FINDING 137 CHANGED WHAT THIS COMPONENT IS ALLOWED TO DO WITH THEM.
//
// It used to derive the location from the pin on every move and overwrite
// whatever was on file, and it labelled the result "District" whatever it was.
// Both were wrong. The nearest row to a pin is frequently a development, and Law
// 7 says a development is never a district, so the label now comes from
// `locationKind.ts`. And a value already on file is a fact the lister or SAT
// recorded, so a later pin may OFFER to replace it but may never do so silently:
// the offer is a button the lister presses. Only an empty location is filled
// from the pin, which is a first answer, not a rewrite.
//
// SAT holds one point per location and no boundaries, so nothing here is ever
// presented as a confirmed match. `locationConsistency.ts` carries that rule and
// the words for it.

const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const RIYADH: [number, number] = [46.6753, 24.7136];

export interface LocationValue { lat: number | null; lng: number | null; districtId: string | null }

export default function LocationPicker({ locale, districts, value, onChange }: {
  locale: "en" | "ar";
  districts: LocationPoint[];
  value: LocationValue;
  onChange: (v: { lat: number; lng: number; districtId: string | null }) => void;
}) {
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const [lat, setLat] = useState<number | null>(value.lat);
  const [lng, setLng] = useState<number | null>(value.lng);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ label: string; sub: string; lat: number; lng: number }>>([]);
  const [resolving, setResolving] = useState(false);

  // Finding 153. The suggestion list is a combobox, so it needs stable ids to
  // point `aria-controls` and `aria-activedescendant` at, and an active index
  // that arrow keys move without moving focus off the input.
  const uid = useId();
  const listId = `${uid}-loc-list`;
  const optId = (i: number) => `${uid}-loc-opt-${i}`;
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  // Finding 196. Choosing a suggestion writes its label back into the box, which
  // is a change to `q` like any other, so the search effect fires again 350ms
  // later and reopens the list on the item just chosen. This holds the one query
  // string that must not be searched, so the reopen never happens.
  const chosen = useRef<string | null>(null);

  const recorded = locationById(value.districtId, districts);
  const nearest = lat != null && lng != null ? nearestLocation(lat, lng, districts) : null;
  const shown = recorded ?? nearest;
  const consistency = assessLocationConsistency({ lat, lng, recorded, nearest });
  const alternative = recorded && nearest && nearest.id !== recorded.id ? nearest : null;

  const named = (row: LocationPoint) => {
    const n = placeName(row, ar ? "ar" : "en");
    const k = kindLabel(row.kind, ar);
    return n ? `${n} (${k})` : k;
  };

  // Central update: set state, move the marker, bubble up. The recorded location
  // is carried through untouched; only an empty one is answered from the pin.
  const place = (la: number, ln: number, fly: boolean) => {
    setLat(la); setLng(ln);
    const keep = value.districtId ? value.districtId : nearestLocation(la, ln, districts)?.id ?? null;
    onChange({ lat: la, lng: ln, districtId: keep });
    const m = markerRef.current as { setLngLat: (c: [number, number]) => void } | null;
    if (m) m.setLngLat([ln, la]);
    const map = mapRef.current as { easeTo: (o: unknown) => void; getZoom: () => number } | null;
    if (map && fly) map.easeTo({ center: [ln, la], zoom: Math.max(map.getZoom(), 14) });
  };

  useEffect(() => {
    let cancelled = false;
    let map: { remove: () => void } | null = null;
    import("maplibre-gl").then((mod) => {
      if (cancelled || !mapEl.current) return;
      const maplibregl = ((mod as { default?: unknown }).default ?? mod) as any;
      // Arabic street labels on the Saudi basemap need the RTL shaping plugin in
      // every locale, or they render as disconnected, reversed glyphs. Lazy and
      // registered once globally.
      try { const M: any = maplibregl; if (!M.__rtl) { M.__rtl = true; M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", () => {}, true); } } catch {}
      const start: [number, number] = value.lng != null && value.lat != null ? [value.lng, value.lat] : RIYADH;
      const m = new maplibregl.Map({ container: mapEl.current, style: STYLE, center: start, zoom: value.lat != null ? 14 : 10, attributionControl: false });
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), ar ? "top-left" : "top-right");
      m.addControl(new maplibregl.AttributionControl({ compact: true }));
      mapRef.current = m;
      map = m;
      const marker = new maplibregl.Marker({ draggable: true, color: "#3A6EA5" }).setLngLat(start).addTo(m);
      markerRef.current = marker;
      marker.on("dragend", () => { const p = marker.getLngLat(); place(p.lat, p.lng, false); });
      m.on("click", (e: { lngLat: { lat: number; lng: number } }) => place(e.lngLat.lat, e.lngLat.lng, false));
    });
    return () => { cancelled = true; try { map?.remove(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The search box accepts three things: a place name (geocoded), a pasted Google
  // Maps link, or a bare "lat, lng" pair. A link or coordinates places the pin
  // directly; a shortened share link (maps.app.goo.gl) is resolved server-side.
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setResults([]); setResolving(false); return; }
    // Finding 196: this exact string is the one the lister just picked.
    if (chosen.current !== null && s === chosen.current) return;
    // Coordinates already present in the pasted text: place immediately.
    const direct = parseLatLng(s);
    if (direct) { setResults([]); setResolving(false); place(direct.lat, direct.lng, true); return; }
    const id = setTimeout(async () => {
      // A shortened map share link hides the coordinates behind a redirect.
      if (isMapShareUrl(s)) {
        setResolving(true);
        try {
          const r = await fetch(`/api/geo/resolve?url=${encodeURIComponent(s)}`);
          const j = await r.json();
          if (Number.isFinite(j.lat) && Number.isFinite(j.lng)) {
            setResults([]); setResolving(false); place(Number(j.lat), Number(j.lng), true); return;
          }
        } catch { /* fall through to place-name search */ }
        setResolving(false);
      }
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(s)}`);
        const j = await r.json();
        setResults(Array.isArray(j.items) ? j.items : []);
      } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Finding 153. A new set of suggestions has no active option. Without this the
  // index survives the fetch and points at a row that is now a different place,
  // or at no row at all, and `aria-activedescendant` names an id that has gone.
  useEffect(() => { setActive(-1); }, [results]);

  // Finding 153. The list scrolls at `max-h-56`, and the browser does not scroll
  // it for us: the active option is named rather than focused, and only focus
  // moves a scroll container on its own. Indexing `children` rather than a
  // selector is deliberate, because `useId` puts colons in its ids and those are
  // legal in HTML but not in a CSS selector.
  useEffect(() => {
    if (active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // ELITE-4 J2-19: the Studio's equivalent input class carries a 44px minimum
  // height; this local copy had dropped it, so the coordinate boxes and the
  // search box fell under the touch-target floor.
  const inp = "w-full rounded border border-charcoal/20 px-3 py-2 min-h-[44px]";

  const open = results.length > 0;

  // Finding 153. One place where a suggestion is taken, so the keyboard and the
  // pointer cannot drift apart.
  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    chosen.current = r.label.trim();
    setQ(r.label);
    setResults([]);
    setActive(-1);
    place(r.lat, r.lng, true);
  };

  // Finding 153. Down and Up are the right keys in both directions, because the
  // list is stacked vertically and vertical has no direction. Left and Right are
  // deliberately NOT intercepted: inside a text box they move the caret, they
  // already reverse themselves under `dir="rtl"`, and taking them would break
  // ordinary Arabic editing to serve a list the lister may not even be looking
  // at. That is what direction-aware means here. Focus never leaves the input;
  // `aria-activedescendant` is what moves.
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const last = results.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a >= last ? 0 : a + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? last : a - 1)); return; }
    if (e.key === "Home") { e.preventDefault(); setActive(0); return; }
    if (e.key === "End") { e.preventDefault(); setActive(last); return; }
    if (e.key === "Enter") { if (active >= 0) { e.preventDefault(); choose(active); } return; }
    if (e.key === "Escape") { e.preventDefault(); setResults([]); setActive(-1); return; }
    if (e.key === "Tab") { setResults([]); setActive(-1); }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* ELITE-4 J2-4: the box was named by its placeholder alone, which is not an
            accessible name once anything is typed into it.
            Finding 153: the box is now a combobox. Before this, results arrived in a
            plain <div> of <button> elements with no role, no ids and nothing
            announced, so the list opened and closed in silence and was reachable
            only by tabbing past the input into what read as an unrelated group of
            unnamed controls. */}
        <input
          className={inp}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
          autoComplete="off"
          aria-label={t("Search, or paste a Google Maps link or coordinates", "ابحث، أو الصق رابط خرائط جوجل أو الإحداثيات")}
          placeholder={t("Search, or paste a Google Maps link or coordinates", "ابحث، أو الصق رابط خرائط جوجل أو الإحداثيات")}
          value={q}
          onChange={(e) => { chosen.current = null; setActive(-1); setQ(e.target.value); }}
          onKeyDown={onKey}
        />
        {resolving && <p className="text-[0.6875rem] text-charcoal/65 mt-1">{t("Resolving the map link...", "جارٍ فتح رابط الخريطة...")}</p>}
        {/* Finding 153, SC 4.1.3. The list appearing is a status message: it is not
            what the lister is looking at, and nothing else says it happened. The
            region is always in the tree so that the first message is announced;
            a region added at the same moment as its text often is not. */}
        <p role="status" aria-live="polite" className="sronly">
          {open
            ? t(`Location suggestions: ${results.length}. Use the up and down arrows to review them and Enter to choose one.`,
                `عدد اقتراحات الموقع: ${results.length}. استخدم سهمي الأعلى والأسفل للتنقل بينها، ومفتاح الإدخال Enter للاختيار.`)
            : ""}
        </p>
        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t("Location suggestions", "اقتراحات الموقع")}
            className="absolute z-10 mt-1 w-full rounded border border-line bg-white shadow max-h-56 overflow-auto"
          >
            {results.map((r, i) => (
              /* The option is a <li>, not a <button>. In this pattern the input keeps
                 focus and the active option is named by `aria-activedescendant`, so an
                 option that were focusable would put the same choice in the tab order
                 twice and take the caret out of the box the lister is typing in.
                 onMouseDown, not onClick: mousedown fires before the input's blur, so
                 the pointer path and the keyboard path end in the same call. */
              <li
                key={i}
                id={optId(i)}
                role="option"
                aria-selected={i === active}
                className={"block w-full px-3 py-2 text-[0.8125rem] cursor-pointer " + (i === active ? "bg-ivory-2" : "hover:bg-ivory-2")}
                onMouseDown={(e) => { e.preventDefault(); choose(i); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="font-medium">{r.label}</span>{r.sub ? <span className="text-charcoal/65"> · {r.sub}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={mapEl} style={{ height: 260, borderRadius: 8, overflow: "hidden", border: "1px solid #dfe3e8" }} />
      <p className="text-[0.6875rem] text-charcoal/65">{t("Click the map or drag the pin to your building. If no location is on file yet, the closest one is offered from your pin. It is a best match, not a confirmed boundary.", "انقر على الخريطة أو اسحب العلامة إلى المبنى. إذا لم يكن هناك موقع مسجّل بعد، يُقترح أقرب موقع من علامتك، وهو أقرب تطابق وليس حدوداً مؤكدة.")}</p>
      <div className="flex gap-3">
        {/* ELITE-4 J2-4: both coordinate boxes were named by placeholder only. */}
        <input className={inp + " flex-1"} type="number" step="any" aria-label={t("Latitude", "خط العرض")} placeholder={t("Latitude", "خط العرض")} value={lat ?? ""}
          onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setLat(v); if (v != null && Number.isFinite(v) && lng != null) place(v, lng, true); }} />
        <input className={inp + " flex-1"} type="number" step="any" aria-label={t("Longitude", "خط الطول")} placeholder={t("Longitude", "خط الطول")} value={lng ?? ""}
          onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setLng(v); if (v != null && Number.isFinite(v) && lat != null) place(lat, v, true); }} />
      </div>
      <div className="text-[0.75rem] text-charcoal/70">
        {shown
          ? <>{kindLabel(shown.kind, ar)}: <span className="font-medium">{placeName(shown, ar ? "ar" : "en")}</span>{shown.city ? <span className="text-charcoal/65">, {cityLabel(shown.city, ar ? "ar" : "en")}</span> : null} <span className="text-charcoal/65">({recorded ? t("on file", "المسجّل") : t("from your pin", "من موقع العلامة")})</span></>
          : <span className="text-charcoal/65">{t("Place a pin to set the location.", "ضع علامة لتحديد الموقع.")}</span>}
      </div>

      {consistency.verdict === "contradicted" && (
        <p role="status" className="text-[0.75rem] rounded border border-charcoal/25 px-3 py-2 leading-relaxed">
          {ar ? consistency.statement_ar : consistency.statement_en}{" "}
          {t("Move the pin, choose the right location, or leave it for SAT to review.", "حرّك العلامة، أو اختر الموقع الصحيح، أو اتركه لمراجعة سات.")}
        </p>
      )}

      {alternative && recorded && (
        <div className="text-[0.75rem] rounded border border-charcoal/15 px-3 py-2 leading-relaxed">
          <p className="text-charcoal/70">
            {ar
              ? `أقرب موقع إلى علامتك هو ${named(alternative)}. هذا العرض يسجّل ${named(recorded)}، ولم يُغيَّر.`
              : `Your pin is closest to ${named(alternative)}. This listing records ${named(recorded)}, and that has not been changed.`}
          </p>
          <button
            type="button"
            className="mt-2 min-h-[44px] rounded border border-harbor px-3 text-harbor hover:bg-harbor/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-harbor focus-visible:ring-offset-2"
            onClick={() => { if (lat != null && lng != null) onChange({ lat, lng, districtId: alternative.id }); }}
          >
            {ar ? `استخدم ${placeName(alternative, "ar")} بدلاً منه` : `Use ${placeName(alternative, "en")} instead`}
          </button>
        </div>
      )}
    </div>
  );
}
