import { getDictionary } from "@/i18n/getDictionary";

/**
 * RC10, findings 18 and 160. The names MapLibre gives its own controls.
 *
 * Every map on this platform is built by calling `new maplibregl.Map({...})`,
 * and MapLibre writes the accessible names of the things it constructs itself:
 * the canvas, the zoom buttons, the attribution toggle, the draggable marker,
 * the logo link and the popup close button. None of those strings come from
 * this codebase, so none of them were translated, and the Arabic build shipped
 * an Arabic page whose only map controls announced "Zoom in", "Zoom out" and
 * "Toggle attribution" in English. Four separate registers recorded this as a
 * defect of four separate components. It is one defect: nobody had ever passed
 * MapLibre a `locale`.
 *
 * The evidence for the table below is the installed bundle, read directly at
 * node_modules/maplibre-gl/dist/maplibre-gl-dev.js, version 4.7.1. Each key is
 * resolved through
 *
 *   _getUIString(key) { const str = this._locale[key]; if (str == null) throw ... }
 *
 * and reaches the DOM through a `setAttribute('aria-label', ...)` call that was
 * read at each site: the canvas takes `Map.Title`, `Marker` takes
 * `Marker.Title`, `LogoControl` takes `LogoControl.Title`, `NavigationControl`
 * sets both `title` and `aria-label` from `NavigationControl.<Name>`, and
 * `AttributionControl` does the same for its compact `<summary>` button. The
 * merge is
 *
 *   this._locale = Object.assign(Object.assign({}, defaultLocale), options.locale);
 *
 * which is why returning a partial object is safe: anything omitted keeps
 * MapLibre's own default rather than throwing at `_getUIString`.
 *
 * `NavigationControl.ResetBearing` is included even though every construction
 * site in this repository passes `showCompass: false`, so the compass button is
 * not currently drawn. A guard test asserts that is still true. The string is
 * here so that turning the compass on is a one-line change that cannot
 * reintroduce an English control, rather than a one-line change that silently
 * does.
 *
 * `ScaleControl`, `FullscreenControl`, `GeolocateControl`, `TerrainControl` and
 * the cooperative-gestures strings are deliberately absent: none of those
 * controls is constructed anywhere in `src`, so translating them would be
 * dictionary weight for markup that does not exist. If one is added, its key
 * belongs here, and the omission fails open to MapLibre's English rather than
 * to a crash.
 *
 * Evidence classification: source-level verification of the installed bundle
 * plus a guard test over the construction sites. Not verified in a browser, not
 * verified with a screen reader and not independently audited.
 */
export function mapLocale(locale: string): Record<string, string> {
  const t = getDictionary(locale === "ar" ? "ar" : "en").mapControls;
  return {
    "Map.Title": t.mapTitle,
    "Marker.Title": t.marker,
    "NavigationControl.ZoomIn": t.zoomIn,
    "NavigationControl.ZoomOut": t.zoomOut,
    "NavigationControl.ResetBearing": t.resetBearing,
    "AttributionControl.ToggleAttribution": t.toggleAttribution,
    "AttributionControl.MapFeedback": t.mapFeedback,
    "LogoControl.Title": t.logo,
    "Popup.Close": t.closePopup,
  };
}
