import { NextResponse } from "next/server";
import { allow } from "@/lib/ratelimit";
import { callGeoGeocode } from "@/lib/location/gateway";
import { getAllSourceRights } from "@/lib/queries/sourceRights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free-form location search that returns COORDINATES, for the listing location
// picker. The existing /api/places endpoint returns labels only (it optimizes for
// district autocomplete); this one returns lat/lng so the map pin can jump to a
// searched place.
//
// ADV-5A, finding 69. The Photon call that backed this route was made directly
// from here, with the visitor's typed query in the query string and no
// consultation of `source_registry`. It now runs through the location gateway.
// `photon_osm` has no row in the register, and the request carries user-typed
// text while no processing agreement is recorded, so the call is denied twice
// over and the endpoint returns an empty list.
//
// An empty list is the correct degraded state here rather than an error.
// `src/components/LocationPicker.tsx` already tolerates it, and the three ways a
// lister actually sets a location all still work: pasted coordinates, a pasted
// Maps link, and placing the pin by hand. What is lost is a convenience, not the
// task.
export async function GET(req: Request) {
  if (!allow("geocode", req, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  // Passed as undefined when empty so the denial is recorded as "the register was
  // not read" rather than "no source has a row".
  const register = await getAllSourceRights();
  const r = await callGeoGeocode(q, {
    audience: "public",
    rights: register.size ? register : undefined,
  });

  // The reasons are never returned: they quote internal licence reasoning, the
  // same rule `denialReason` follows.
  return NextResponse.json({
    items: r.ok ? r.value : [],
    ...(r.ok && r.attribution ? { attribution: r.attribution } : {}),
  });
}
