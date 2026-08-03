"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// PKG-NEXT16-SECURITY slice A.
//
// WHY THIS FILE EXISTS. `/listings` is a Server Component and it deferred the
// map with `next/dynamic` and `ssr: false`. Next.js 16 refuses that combination
// outright: "`ssr: false` is not allowed with `next/dynamic` in Server
// Components." The reason is that the option is not a build hint, it is an
// instruction to skip a render that has already happened by the time a Server
// Component's output exists, so on the server it never meant anything and now
// says so instead of being quietly ignored.
//
// WHAT IT DOES NOT CHANGE. maplibre-gl is around 800 KB and the map sits below
// the fold on mobile. Importing it statically put the library and its stylesheet
// in the initial bundle for /listings and blocked hydration, which is the whole
// reason the deferral was written. That deferral is preserved exactly: the same
// dynamic import, the same `ssr: false`, the same skeleton behind the same
// `mapskel` class, moved one file down into a Client Component boundary where
// the option is meaningful. The page passes its props straight through.
//
// The props are read from the component itself rather than restated here, so a
// prop added to ListingsMap cannot silently stop being forwarded. The import in
// the type position is erased at compile time and creates no runtime edge, so
// the bundle split this file exists to protect still holds.

type MapModule = typeof import("./ListingsMap");
type Props = ComponentProps<MapModule["default"]>;

const ListingsMap = dynamic(() => import("./ListingsMap"), {
  ssr: false,
  loading: () => <div className="mapskel" aria-hidden />,
});

export default function ListingsMapDeferred(props: Props) {
  return <ListingsMap {...props} />;
}
