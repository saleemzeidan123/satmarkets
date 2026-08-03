// PKG-NEXT16-SECURITY slice C. The right-to-left text plugin, and where it comes
// from.
//
// WHAT THIS IS. maplibre-gl cannot shape Arabic on its own. Without this plugin
// every Arabic label on the basemap renders as disconnected, reversed glyphs.
// That is not an Arabic-locale concern: Saudi street names are Arabic on the
// basemap in EVERY locale, so an English map needs it too. It is registered once
// per page, globally, and lazily, so a map that never meets Arabic text never
// downloads it.
//
// WHAT CHANGED. Until this slice all four map components passed
// `https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js`
// to `setRTLTextPlugin`, and `next.config.mjs` therefore had to name
// `https://unpkg.com` in both `script-src` and `connect-src`. That is a third
// party origin permitted to put executable code into the page, and it was the
// single widest hole in a policy whose whole design is that nothing loads from
// an origin the policy does not name.
//
// It also sat outside every check this repository runs. `npm audit` sees the npm
// dependency tree; a URL in a string literal is not in that tree, so no audit,
// no lockfile and no `npm ci` reproducibility ever applied to it. The version in
// the URL pins what unpkg is ASKED for, not what it returns, and there was no
// integrity attribute, because `setRTLTextPlugin` loads through `importScripts`
// in a worker and there is no element to hang an `integrity` attribute on.
// Subresource Integrity is not available for this load at all, which is the
// finding that decided this: an origin you cannot verify and cannot pin is not
// made safer by naming it in a CSP, it is only made permitted.
//
// SO IT IS SELF-HOSTED. The file under `public/vendor/` is byte-for-byte the
// `mapbox-gl-rtl-text.min.js` inside the npm registry tarball for
// `@mapbox/mapbox-gl-rtl-text@0.2.3`, whose published `dist.integrity` was
// verified against the downloaded tarball before extraction. Provenance, the
// hashes and the licence position are in `docs/vendored-third-party.md`; the
// BSD-2-Clause notice is served beside the file it covers.
//
// WHY THE ASM.JS BUILD AND NOT THE WASM ONE. The package also ships
// `mapbox-gl-rtl-text.wasm.min.js` at 25 kB plus a 101 kB `wrapper.wasm`, which
// is 80 kB smaller in total than the 207 kB used here. It was rejected on the
// policy, not the size: instantiating WebAssembly requires `'wasm-unsafe-eval'`
// in `script-src`, and this policy does not currently carry any eval permission
// of any kind. Widening `script-src` to save 80 kB on a lazily loaded asset, in
// the same slice whose purpose is to narrow `script-src`, would be the wrong
// trade. Revisit only if the policy acquires `'wasm-unsafe-eval'` for some other
// reason.
//
// THE VERSION IS IN THE PATH ON PURPOSE. `/vendor/mapbox-gl-rtl-text-0.2.3/`
// means an upgrade is a visible path change in the diff rather than a silent
// content change under a stable URL, and it makes the immutable cache header
// safe to apply later.

export const RTL_TEXT_PLUGIN_URL =
  "/vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js";

/**
 * Register the RTL shaping plugin on a maplibre-gl module object, once per page.
 *
 * maplibre throws if `setRTLTextPlugin` is called twice, and all four map
 * components can mount in the same document, so the guard flag lives on the
 * module object itself rather than in a module-scoped variable: the four callers
 * each `import("maplibre-gl")` separately and must share one answer.
 *
 * Every failure here is swallowed deliberately. A map that cannot shape Arabic
 * is degraded; a map that throws during initialisation is gone. The plugin is
 * lazy (third argument `true`), so this call only records the URL and the
 * download happens if and when the renderer meets right-to-left text.
 */
export function registerRTLTextPlugin(maplibregl: unknown): void {
  try {
    const M = maplibregl as {
      __rtl?: boolean;
      setRTLTextPlugin?: (url: string, cb: () => void, lazy: boolean) => void;
    };
    if (M.__rtl) return;
    M.__rtl = true;
    M.setRTLTextPlugin?.(RTL_TEXT_PLUGIN_URL, () => {}, true);
  } catch {
    /* see above: a degraded map beats a dead one */
  }
}
