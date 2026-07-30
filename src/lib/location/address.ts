import { callGeoAddress, type GeoCallContext } from "./gateway";
import type { AddressFieldId, AddressFields } from "./results";
import { assessProcessingAgreement, type ClauseId } from "./sufficiency";
import { providersFor } from "./registry";

// ADV-5B. The SPL National Address interface.
//
// THE PERMITTED FIELD SET IS EMPTY, AND THAT IS THE INTERFACE.
//
// The obvious way to build this is to write the request first and decide the
// display rules later. That order is wrong, and it is wrong in a way this
// product cannot afford, because the request is the moment the data crosses.
// Asking SPL for a building number, an additional number and a postal code and
// then rendering only the district does not make the other three unrequested:
// it makes them received, held in a log, and outside whatever we later tell a
// reader we collect. Part E records the required step as "signup, then read and
// record the written redisplay terms", in that order.
//
// So a request here is built from `PERMITTED_ADDRESS_FIELDS`, that list is
// empty, and an empty list builds no request. `transport.ts` has no address
// branch for the same reason, and `lookupNationalAddress` never reaches it in
// any case, because `spl_address` is `asserted_unverified` and the status
// ceiling holds it at the internal audience.
//
// The two refusals stack on purpose, and both are recorded when they fire. A
// reader of this file should be able to see that removing any one of them does
// not open a request.

/** Every field the service can return. Declared, not requested. */
export const ADDRESS_FIELDS: readonly AddressFieldId[] = [
  "short_code",
  "building_number",
  "street",
  "district",
  "city",
  "postal_code",
  "additional_number",
];

/**
 * The fields we are permitted to receive and display.
 *
 * EMPTY UNTIL THE WRITTEN TERMS ARE RECORDED. Owner ruling 7: no vendor is
 * contacted and nothing is signed, so no entry here can represent a right. When
 * the terms are read, each permitted field is added with the clause of the terms
 * that permits it, and the addition is a reviewable commit rather than a
 * configuration change.
 */
export const PERMITTED_ADDRESS_FIELDS: readonly AddressFieldId[] = [];

export type AddressQuery =
  | { kind: "short_code"; value: string }
  | { kind: "coordinates"; lat: number; lng: number };

export type AddressRequest = {
  query: AddressQuery;
  /** Always the permitted set, never a superset, never a caller's choice. */
  fields: readonly AddressFieldId[];
};

/**
 * Build the request, or return null because there is nothing we may ask for.
 *
 * Null is not an error state to be handled away. It is the correct answer while
 * the permitted set is empty, and the only way to change it is to record the
 * terms.
 */
export function buildAddressRequest(query: AddressQuery): AddressRequest | null {
  if (PERMITTED_ADDRESS_FIELDS.length === 0) return null;
  return { query, fields: PERMITTED_ADDRESS_FIELDS };
}

export type AddressResult =
  | {
      status: "resolved";
      fields: AddressFields;
      attribution: string | null;
      sourceId: string;
    }
  | {
      status: "unavailable";
      /** Which refusal fired first. */
      stage: "permitted_fields" | "sufficiency" | "rights" | "transport";
      /** Unanswered processing clauses, when `stage` is `sufficiency`. */
      unanswered: ClauseId[];
      /**
       * Internal only, on the `denialReason` rule: quotes licence and contract
       * reasoning and is never rendered to a caller.
       */
      reasons: string[];
    };

// Read from the registry rather than written out, so the source id lives in one
// file. An empty string when nothing is declared denies, since no row matches it.
const SOURCE = providersFor("address_lookup")[0]?.sourceId ?? "";

const queryString = (q: AddressQuery): string =>
  q.kind === "short_code" ? q.value : `${q.lat},${q.lng}`;

/**
 * Look up a Saudi national address, or state why there is none.
 *
 * Never throws, never grants on absence, and today never opens a socket.
 */
export async function lookupNationalAddress(
  query: AddressQuery,
  ctx: GeoCallContext
): Promise<AddressResult> {
  const req = buildAddressRequest(query);
  if (!req) {
    return {
      status: "unavailable",
      stage: "permitted_fields",
      unanswered: [],
      reasons: [
        `${SOURCE}: no address field is permitted for receipt or display, so there is no request to build. Part E requires the written redisplay terms to be read and recorded first.`,
      ],
    };
  }

  // A national address lookup carries text or coordinates the user supplied, so
  // the processing clauses govern it and not only the redisplay ones. Checked
  // here rather than left to the boundary's single `user_text_denied` code,
  // because the boundary answers whether the switch is on and this answers
  // whether the agreement behind the switch says enough.
  const suff = assessProcessingAgreement(SOURCE);
  if (!suff.sufficient) {
    return {
      status: "unavailable",
      stage: "sufficiency",
      unanswered: suff.unanswered,
      reasons: suff.reasons,
    };
  }

  const out = await callGeoAddress(queryString(query), ctx);
  if (!out.ok) {
    return {
      status: "unavailable",
      stage: out.failure === "boundary" ? "rights" : "transport",
      unanswered: [],
      reasons: out.reasons,
    };
  }

  const first = out.value[0] ?? {};
  // Belt and braces: even a permitted answer is filtered to the permitted set,
  // so a provider returning more than we asked for cannot widen what we hold.
  const fields: AddressFields = {};
  for (const f of PERMITTED_ADDRESS_FIELDS) {
    const v = first[f];
    if (typeof v === "string" && v.trim() !== "") fields[f] = v;
  }

  return {
    status: "resolved",
    fields,
    attribution: out.attribution,
    sourceId: SOURCE,
  };
}
