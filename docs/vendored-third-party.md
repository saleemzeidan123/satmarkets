# Vendored third-party assets

PKG-NEXT16-SECURITY slice C. One place to read what non-npm third-party code
this repository serves from its own origin, where each file came from, how that
was verified, and what licence obligation travels with it.

**Why this file exists separately from the lockfile.** `package-lock.json` is the
record for anything installed from the npm registry, and `npm ci` reproduces it
exactly. A file copied into `public/` has none of that: no version resolution, no
integrity check on install, and no `npm audit` visibility. If the provenance is
not written down at the moment of copying, it is not recoverable afterwards from
the file alone. Anything added under `public/vendor/` is recorded here in the
same commit that adds it, or it does not go in.

**The directory convention.** `public/vendor/<package>-<version>/`. The version
is in the path rather than in a sidecar, so an upgrade appears in the diff as a
path change at every call site instead of as a silent content change under a
stable URL. It also makes an immutable cache header safe to apply to the
directory later, because a given path can never serve different bytes.

---

## `@mapbox/mapbox-gl-rtl-text` 0.2.3

| | |
| --- | --- |
| Served at | `/vendor/mapbox-gl-rtl-text-0.2.3/mapbox-gl-rtl-text.min.js` |
| Size | 206,897 bytes |
| Licence | BSD-2-Clause, plus the ICU notice it derives from |
| Notice served at | `/vendor/mapbox-gl-rtl-text-0.2.3/LICENSE.md` |
| Loaded by | `src/lib/rtlTextPlugin.ts`, via maplibre's `setRTLTextPlugin`, lazily |
| Replaced | `https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js` |
| Gated by | `src/lib/rtlTextPlugin.test.ts` |

### What it does and why it cannot simply be dropped

maplibre-gl does not shape Arabic. Without this plugin every Arabic label on the
basemap renders as disconnected, reversed glyphs. That is not an Arabic-locale
concern: Saudi street names are Arabic on the basemap in every locale, so an
English map needs it too. It was gated to `ar` once and English maps rendered
broken Arabic street names, which is the reason all four map components register
it unconditionally.

### Provenance, and how it was verified

The file was taken from the npm registry tarball, not from a CDN and not from
GitHub:

```
npm pack @mapbox/mapbox-gl-rtl-text@0.2.3
```

| Check | Value |
| --- | --- |
| Registry tarball | `https://registry.npmjs.org/@mapbox/mapbox-gl-rtl-text/-/mapbox-gl-rtl-text-0.2.3.tgz` |
| Published `dist.integrity` | `sha512-RaCYfnxULUUUxNwcUimV9C/o2295ktTyLEUzD/+VWkqXqvaVfFcZ5slytGzb2Sd/Jj4MlbxD0DCZbfa6CzcmMw==` |
| Downloaded tarball, recomputed | identical to the line above |
| `mapbox-gl-rtl-text.min.js` sha256 | `142f4fc31b4911887bacfea4df1813df67be28dfcb4c56e3f8f576f2e6fdf5d2` |
| sha384, base64, for an SRI attribute if one ever becomes possible | `I3WtIlwH0n6Kkm84+GyC2qO1D3VHr0ELYnhw54/FX8uh4JjTrKMsU6gq8mgDWa02` |

The tarball hash was verified **before** extraction, so the sha256 in the table
is a hash of a file whose chain back to the publisher is established, rather than
a hash of whatever happened to be on disk. `src/lib/rtlTextPlugin.test.ts`
re-checks that sha256 on every test run, so the served file cannot drift from
this record without failing the suite.

**Not verified against unpkg.** The old URL was not fetched and diffed against
the tarball. That would have compared the vendored copy to the very thing being
removed for being unverifiable, which proves nothing the registry check does not
already prove better. The registry is where unpkg gets its bytes.

### Why the asm.js build and not the wasm one

The package also ships `mapbox-gl-rtl-text.wasm.min.js` at 25,269 bytes plus a
101,637-byte `wrapper.wasm`, together about 80 kB smaller than the 206,897-byte
file used here. It was rejected on the policy rather than the size:
instantiating WebAssembly requires `'wasm-unsafe-eval'` in `script-src`, and this
policy carries no eval permission of any kind. Widening `script-src` to save
80 kB on a lazily loaded asset, inside the slice whose purpose is to narrow
`script-src`, is the wrong direction. Revisit only if the policy acquires
`'wasm-unsafe-eval'` for an unrelated reason.

### The licence obligation, stated so it is not lost

BSD-2-Clause requires that redistribution in binary form reproduce the copyright
notice, the conditions and the disclaimer "in the documentation and/or other
materials provided with the distribution". Serving `LICENSE.md` from the same
directory as the file it covers is how that is met here, and the test asserts
the file is present and carries both the Mapbox and the ICU notices. Deleting it
to tidy `public/` is a licence violation, not a cleanup.

### Upgrade procedure

1. `npm pack @mapbox/mapbox-gl-rtl-text@<new>` and compare the tarball hash to
   `npm view @mapbox/mapbox-gl-rtl-text@<new> dist.integrity` before extracting.
2. Copy `mapbox-gl-rtl-text.min.js` and `LICENSE.md` into a new
   `public/vendor/mapbox-gl-rtl-text-<new>/`.
3. Update `RTL_TEXT_PLUGIN_URL` and the pinned sha256 in the test.
4. Delete the old directory in the same commit, so two versions are never served
   at once.
5. Verify Arabic label shaping on a live Arabic map, not only that the file 200s.
   A plugin that downloads and fails to parse is silent: maplibre swallows it and
   the labels are simply wrong.
