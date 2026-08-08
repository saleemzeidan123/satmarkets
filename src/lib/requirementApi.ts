// PKG-TRUTH-REQ-1. Split out of src/app/api/requirements/route.ts because Next
// 16's route typegen only tolerates the whitelisted handler and config exports
// from a route.ts module (GET, POST, runtime, and so on); anything else fails
// `tsc --noEmit` against the generated `.next/types` route shape. A test still
// needs to construct the exact object the route sends on a successful
// submission without a database, so the function lives here and the route
// imports it, rather than the route exporting it directly.
//
// This IS the response the route sends, called from the one place it is sent,
// rather than a copy a regex has to trust matches it. See the comment above
// the POST handler in route.ts for why `notified` and `match` are gone.
export function buildRequirementSuccessResponse(id: string, ref: string, candidateCount: number) {
 return { ok: true, id, ref, candidate_count: candidateCount, stored: true };
}
