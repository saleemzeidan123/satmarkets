import {
  mayAiRetrieve,
  mayDisplayDerived,
  mayExport,
  mayRedisplay,
  type Audience,
  type SourceRights,
} from "@/lib/sourceRights";
import { providersFor, type GeoCapability, type GeoProvider, type GeoUse } from "./registry";

// ADV-5A. The decision module for external location calls. Pure: no fetch, no
// React, no Supabase, no environment reads. It mirrors `src/lib/aiBoundary.ts`,
// and it exists so that the rule can be unit tested rather than merely observed
// in production.
//
// THE CHECK ORDER IS THE POINT OF THIS FILE.
//
// Rights are evaluated before the credential. That inversion is exactly what hid
// the `driveMinutes` defect: with the token absent the function returned null,
// the page degraded to straight-line distance, everything looked correct, and
// the only thing standing between a public page and an unlicensed value was an
// unset environment variable. A denial must be recorded as a rights denial,
// because a rights denial survives someone adding a token. A missing-credential
// denial does not survive anything.

/**
 * The second gate, and it is not the AI gate.
 *
 * `AI_AGREEMENT_IN_FORCE` governs sending material to a model provider. This one
 * governs sending the user's own typed text to a location provider. They are
 * separate agreements with separate parties, and neither implies the other: a
 * licence to display a place name says nothing about a licence to transmit the
 * words a tenant typed about an expansion they have not announced.
 *
 * Deliberately a compile-time constant and NOT read from the environment. An
 * environment variable is a deployment setting; this is a contractual fact, and
 * a contractual fact should not be flippable by anyone with access to a
 * dashboard. It flips when the owner records the processing agreement, the
 * cross-border basis and the user disclosure position in
 * `docs/regulatory-register.md` Part E, and the flip is a reviewable commit.
 */
export const PROCESSING_AGREEMENTS_IN_FORCE = false;

export type GeoDenialCode =
  | "no_provider"
  | "rights_unreadable"
  | "no_rights_row"
  | "use_denied"
  | "user_text_denied"
  | "no_endpoint"
  | "no_credential";

export type GeoAllowed = {
  allowed: true;
  provider: GeoProvider;
  reasons: string[];
};

export type GeoDenied = {
  allowed: false;
  code: GeoDenialCode;
  reasons: string[];
};

export type GeoDecision = GeoAllowed | GeoDenied;

export type GeoBoundaryContext = {
  capability: GeoCapability;
  audience: Audience;
  /**
   * The register, indexed by source id. UNDEFINED IS NOT AN EMPTY MAP. Undefined
   * means the register could not be read, and it denies everything with
   * `rights_unreadable`. An empty map would deny everything too, but for the
   * wrong stated reason: it would report that every source happens to have no
   * row, which is a different and less alarming fact than not having read the
   * register at all.
   */
  rights?: Map<string, SourceRights>;
  /** Credential key NAMES that are present. Never values. */
  credentials?: readonly string[];
  /** Test override only. Production reads the constant above. */
  agreementsInForce?: boolean;
};

/**
 * Which policy column governs this kind of use. The `default` branch denies,
 * because a `GeoUse` member added in a future build and not handled here must
 * fail closed rather than fall through to whichever branch happens to be last.
 */
function permitted(use: GeoUse, r: SourceRights, audience: Audience): boolean {
  switch (use) {
    case "redisplay":
      return mayRedisplay(r, audience);
    case "derived":
      return mayDisplayDerived(r, audience);
    case "export":
      return mayExport(r, audience);
    case "ai_retrieval":
      return mayAiRetrieve(r, audience);
    default:
      return false;
  }
}

/** Decide one declared provider. Never throws, never grants on absence. */
export function decideGeoProvider(
  p: GeoProvider,
  ctx: GeoBoundaryContext
): GeoDecision {
  const reasons: string[] = [];

  if (!ctx.rights) {
    reasons.push(
      `${p.id}: the source register was not read, so no permission can be relied on`
    );
    return { allowed: false, code: "rights_unreadable", reasons };
  }

  const row = ctx.rights.get(p.sourceId);
  if (!row) {
    reasons.push(
      `${p.id}: source '${p.sourceId}' has no row in source_registry, and an unknown source has no rights`
    );
    return { allowed: false, code: "no_rights_row", reasons };
  }

  if (!permitted(p.use, row, ctx.audience)) {
    reasons.push(
      `${p.id}: '${p.sourceId}' does not permit ${p.use} to the ${ctx.audience} audience`
    );
    return { allowed: false, code: "use_denied", reasons };
  }

  const agreements = ctx.agreementsInForce ?? PROCESSING_AGREEMENTS_IN_FORCE;
  if (p.carriesUserText && !agreements) {
    reasons.push(
      `${p.id}: the request would carry user-typed text and no processing agreement is recorded`
    );
    return { allowed: false, code: "user_text_denied", reasons };
  }

  if (!p.host) {
    reasons.push(`${p.id}: declared with no endpoint, so it cannot be called`);
    return { allowed: false, code: "no_endpoint", reasons };
  }

  if (p.envKeys.length > 0) {
    const present = ctx.credentials ?? [];
    if (!p.envKeys.some((k) => present.includes(k))) {
      reasons.push(`${p.id}: no credential is configured`);
      return { allowed: false, code: "no_credential", reasons };
    }
  }

  reasons.push(`${p.id}: permitted for ${p.use} to the ${ctx.audience} audience`);
  return { allowed: true, provider: p, reasons };
}

/**
 * Decide a capability: walk the declared candidates in order and take the first
 * the boundary permits.
 *
 * On total denial the returned `code` is the LAST candidate's code. Callers must
 * not read meaning into which code it is beyond deciding to degrade. The reasons
 * array carries every candidate's reason and is the thing worth logging
 * internally; it is never rendered publicly, for the same cause as
 * `denialReason` in the source-rights module: it quotes internal licence
 * reasoning.
 */
export function decideGeoCall(ctx: GeoBoundaryContext): GeoDecision {
  const candidates = providersFor(ctx.capability);
  if (candidates.length === 0) {
    return {
      allowed: false,
      code: "no_provider",
      reasons: [`no provider is declared for capability '${ctx.capability}'`],
    };
  }

  const reasons: string[] = [];
  let last: GeoDenialCode = "no_provider";
  for (const p of candidates) {
    const d = decideGeoProvider(p, ctx);
    reasons.push(...d.reasons);
    if (d.allowed) return { allowed: true, provider: d.provider, reasons };
    last = d.code;
  }
  return { allowed: false, code: last, reasons };
}
