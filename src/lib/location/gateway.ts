import type { Audience, SourceRights } from "@/lib/sourceRights";
import {
  decideGeoProvider,
  type GeoBoundaryContext,
  type GeoDenialCode,
} from "./boundary";
import { providersFor, type GeoCapability, type GeoProvider, type GeoProviderId } from "./registry";
import type { GeoPlaceItem, GeoPointItem } from "./results";
import {
  fetchGeocode,
  fetchPlaceSuggestions,
  fetchTravelSeconds,
  presentCredentialKeys,
  type TravelRequest,
} from "./transport";

// ADV-5A. The only route to `transport.ts`.
//
// The boundary runs FIRST, per candidate, on the declared provider itself, and a
// denial returns without a socket being opened. A denied candidate is skipped
// silently in the sense that no request is made; it is not silent in the record,
// because its reason is accumulated and returned.

export type GeoFailure = "boundary" | "provider_error";

export type GeoCallResult<T> =
  | {
      ok: true;
      value: T;
      provider: GeoProviderId;
      attribution: string | null;
      reasons: string[];
    }
  | {
      ok: false;
      failure: GeoFailure;
      /** Present only when nothing was ever permitted. Null after a real attempt. */
      code: GeoDenialCode | null;
      reasons: string[];
    };

export type GeoCallContext = {
  audience: Audience;
  /** Undefined denies. See `GeoBoundaryContext.rights`. */
  rights?: Map<string, SourceRights>;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  signal?: AbortSignal;
  agreementsInForce?: boolean;
};

function boundaryContext(
  capability: GeoCapability,
  ctx: GeoCallContext
): GeoBoundaryContext {
  const env = ctx.env ?? process.env;
  return {
    capability,
    audience: ctx.audience,
    rights: ctx.rights,
    credentials: providersFor(capability).flatMap((p) =>
      presentCredentialKeys(p, env)
    ),
    agreementsInForce: ctx.agreementsInForce,
  };
}

async function walk<T>(
  capability: GeoCapability,
  ctx: GeoCallContext,
  run: (p: GeoProvider) => Promise<{ ok: true; value: T } | { ok: false; detail: string }>,
  isEmpty: (v: T) => boolean
): Promise<GeoCallResult<T>> {
  const bctx = boundaryContext(capability, ctx);
  const reasons: string[] = [];
  let sawProvider = false;
  let lastCode: GeoDenialCode | null = "no_provider";

  for (const p of providersFor(capability)) {
    const decision = decideGeoProvider(p, bctx);
    reasons.push(...decision.reasons);
    if (!decision.allowed) {
      lastCode = decision.code;
      continue;
    }
    sawProvider = true;
    const out = await run(p);
    if (!out.ok) {
      reasons.push(out.detail);
      continue;
    }
    // An empty answer is not a failure of the provider, but it is a reason to
    // ask the next permitted one before giving up.
    if (isEmpty(out.value)) {
      reasons.push(`${p.id} returned nothing`);
      continue;
    }
    return {
      ok: true,
      value: out.value,
      provider: p.id,
      attribution: p.attribution,
      reasons,
    };
  }

  return {
    ok: false,
    failure: sawProvider ? "provider_error" : "boundary",
    code: sawProvider ? null : lastCode,
    reasons,
  };
}

export function callGeoTravel(
  r: TravelRequest,
  ctx: GeoCallContext
): Promise<GeoCallResult<number>> {
  const env = ctx.env ?? process.env;
  return walk<number>(
    "travel_time",
    ctx,
    (p) =>
      fetchTravelSeconds(p, r, env, { timeoutMs: ctx.timeoutMs, signal: ctx.signal }),
    () => false
  );
}

export function callGeoSuggest(
  q: string,
  ctx: GeoCallContext
): Promise<GeoCallResult<GeoPlaceItem[]>> {
  const env = ctx.env ?? process.env;
  return walk<GeoPlaceItem[]>(
    "place_suggest",
    ctx,
    (p) =>
      fetchPlaceSuggestions(p, q, env, {
        timeoutMs: ctx.timeoutMs,
        signal: ctx.signal,
      }),
    (v) => v.length === 0
  );
}

export function callGeoGeocode(
  q: string,
  ctx: GeoCallContext
): Promise<GeoCallResult<GeoPointItem[]>> {
  return walk<GeoPointItem[]>(
    "place_geocode",
    ctx,
    (p) => fetchGeocode(p, q, { timeoutMs: ctx.timeoutMs, signal: ctx.signal }),
    (v) => v.length === 0
  );
}

export type { TravelRequest };
