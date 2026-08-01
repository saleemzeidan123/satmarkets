import { NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cityLabel } from "@/lib/labels";
import { callGeoSuggest } from "@/lib/location/gateway";
import { getAllSourceRights } from "@/lib/queries/sourceRights";
import type { GeoPlaceItem } from "@/lib/location/results";
import { placeName } from "@/lib/displayName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The indexed flag means one thing only: SAT Markets holds a record of this place. It is
// not a verification of the place, of anything in it, or of any listing at it, and
// the chip that renders it must not be green (D24).
//
// ADV-5A, finding 69. This route used to call Google Places, then Mapbox Search,
// then Photon, in module-scope code that read two API keys and consulted no
// permission at all. Each of those requests carried the visitor's typed query,
// which is not established to be public merely because a person typed it: a
// tenant search can name a brand, a budget or an unannounced expansion. External
// suggestion now runs through the location gateway, which reads the source
// register before it reaches a socket, and separately gates user-typed text on
// `PROCESSING_AGREEMENTS_IN_FORCE`.
//
// WHAT THAT MEANS TODAY: none of the three external providers is permitted, so
// this endpoint serves our own indexed districts alone. That is why
// `indexedPlaces` is no longer behind the `v=1` flag. Previously the flag was
// harmless because an external list always arrived; with the external list
// correctly denied, gating our own inventory would have left the box empty for
// every caller that did not happen to pass the flag, and an empty box invites
// the reader to conclude we have no coverage rather than that we hold no
// licence. The flag is still read, and still controls whether district ids are
// returned, because a `did` is only meaningful to the callers that asked for it.
type Item = GeoPlaceItem;

async function indexedPlaces(q: string, lang: "en" | "ar", withIds: boolean): Promise<Item[]> {
  try {
    const sb = getSupabaseServer();
    if (!sb) return [];
    const s = q.replace(/[(),\\%]/g, " ").trim();
    if (!s) return [];
    const { data } = await sb.from("districts").select("id,city,name_en,name_ar,kind").or(`name_en.ilike.%${s}%,name_ar.ilike.%${s}%,slug.ilike.${s}%,slug.ilike.%-${s}%`).limit(6);
    return (data ?? []).map((d: any) => ({
      label: placeName(d, lang),
      sub: cityLabel(d.city, lang),
      kind: d.kind === "development" ? "development" : d.kind === "area" ? "place" : "district",
      ...(withIds ? { did: d.id as string } : {}),
      indexed: true,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  if (!allow("places", req, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  const withIds = url.searchParams.get("v") === "1";

  const v = await indexedPlaces(q, lang, withIds);

  // An empty register denies. It is passed as undefined so the denial is
  // recorded as "the register was not read" rather than "no source has a row".
  const register = await getAllSourceRights();
  const ext = await callGeoSuggest(q, {
    audience: "public",
    rights: register.size ? register : undefined,
  });

  const items = ext.ok
    ? (() => {
        const seen = new Set(v.map((x) => x.label.toLowerCase()));
        return [...v, ...ext.value.filter((e) => !seen.has(e.label.toLowerCase()))].slice(0, 8);
      })()
    : v.slice(0, 8);

  // `src` names what actually answered. It never names a provider that was
  // declared but denied, and it never carries the denial reasons: those quote
  // internal licence reasoning and are not public.
  const src = [v.length ? "indexed" : null, ext.ok ? ext.provider : null].filter(Boolean).join("+");
  return NextResponse.json({
    items,
    src,
    ...(ext.ok && ext.attribution ? { attribution: ext.attribution } : {}),
  });
}
