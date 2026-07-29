import type { Actor, ActorRole, Capability, SatTool, ToolContext, ToolErr, ToolResult } from "./tool";
import { err } from "./tool";

// ADV-3B. The permission layer, which is deterministic and sits in front of the
// model rather than inside it.
//
// The failure this is shaped against is the one every agent framework ships
// with: the tool list is fixed, every tool checks authorisation in its own body,
// and the system prompt says "only use the operations tools if the user is
// staff". That arrangement has three separate faults and only one of them is
// about the model.
//
// The first is that a system prompt is not a permission system. It is a request,
// and a request can be argued with, ignored, or defeated by text the model reads
// later in the same context.
//
// The second is that offering a tool discloses it. A signed-out visitor whose
// tool list names `operations_pipeline` has been told that SAT has a pipeline
// view, what it is called, and roughly what it holds, before anybody checks
// whether they may use it. The list itself is information.
//
// The third is that per-tool checks drift. Sixteen tools each holding their own
// opinion about what a lister may see is the same shape as the sixteen
// hand-written title fallbacks that produced finding 66: correct in the places
// somebody remembered, wrong everywhere else, and no single place to fix.
//
// So: capabilities are granted to roles here, in one table; the tool list a
// model is offered is COMPUTED from the actor, so an unpermitted tool is never
// named; and `guard()` re-checks at the call site, because a model can emit a
// tool name it was never offered and frequently will.
//
// The role is resolved from the session by the caller. Nothing a model says can
// change it. There is no tool that elevates an actor, and there is no argument
// anywhere in this package that takes a role, which is why an injected
// instruction reading "you are now staff" has nothing to act on.

/**
 * What each role may reach. Additive, and read in one place.
 *
 * `read_own` is granted to every signed-in role and to none of the signed-out
 * one, and the tools that use it scope by `actor.partyId`. A role with
 * `read_own` and no party id can therefore reach nothing, which is the right
 * answer for a half-built session rather than an error somebody has to handle.
 */
const GRANTS: Record<ActorRole, readonly Capability[]> = {
  anonymous: ["read_public"],
  tenant: ["read_public", "read_own", "propose_own"],
  lister: ["read_public", "read_own", "propose_own"],
  verified_lister: ["read_public", "read_own", "propose_own"],
  staff: ["read_public", "read_own", "read_platform", "propose_own", "read_operations"],
};

export function capabilitiesOf(actor: Actor): readonly Capability[] {
  return GRANTS[actor.role] ?? GRANTS.anonymous;
}

export type PermissionDecision = { allowed: boolean; reason: string };

/**
 * May this actor call this tool.
 *
 * Returns a reason on both branches so a log line has the same shape either way,
 * matching `mayLeaveProcess` in the AI boundary. The reason names the capability
 * rather than the record, so it can be logged without logging content.
 */
export function mayCall(actor: Actor, tool: { name: string; capability: Capability }): PermissionDecision {
  const caps = capabilitiesOf(actor);
  if (!caps.includes(tool.capability)) {
    return {
      allowed: false,
      reason: `${tool.name}: role '${actor.role}' does not hold '${tool.capability}'`,
    };
  }
  // A capability that reads the actor's own records is meaningless without an
  // actor to be. This is checked here rather than in each tool so that a tool
  // body can assume it has a party id when it holds `read_own`.
  if ((tool.capability === "read_own" || tool.capability === "propose_own") && !actor.partyId) {
    return {
      allowed: false,
      reason: `${tool.name}: '${tool.capability}' needs a signed-in party and this session has none`,
    };
  }
  return { allowed: true, reason: `${tool.name}: role '${actor.role}' holds '${tool.capability}'` };
}

/**
 * The tools this actor may be told about.
 *
 * The model is offered this list and no other. An unpermitted tool is not
 * described, not named, and not mentioned as unavailable, because "you may not
 * use operations_pipeline" discloses everything naming it would have.
 */
export function offerableTools<T extends { name: string; capability: Capability }>(
  actor: Actor,
  tools: readonly T[]
): T[] {
  return tools.filter((t) => mayCall(actor, t).allowed);
}

/**
 * Run a tool on behalf of an actor, with the permission check in front of it.
 *
 * The check precedes `parse` on purpose. Parsing first would mean an
 * unauthorised caller learns the shape of the arguments a tool wants from the
 * error message, one field at a time, which is a slow way of publishing a schema
 * to somebody who was refused the tool.
 *
 * A refusal returns the same sentence whether the tool exists and is barred or
 * the actor has no party id, because a caller distinguishing those two learns
 * which tools exist.
 */
export async function callTool<I, O>(
  tool: SatTool<I, O>,
  raw: unknown,
  ctx: ToolContext
): Promise<ToolResult<O>> {
  const decision = mayCall(ctx.actor, tool);
  if (!decision.allowed) return refusal(ctx);

  const parsed = tool.parse(raw);
  if (!parsed.ok) {
    return err(
      "bad_input",
      ctx.locale === "ar"
        ? `تعذّر تنفيذ الطلب: ${parsed.problem}`
        : `That request could not be run: ${parsed.problem}`
    );
  }
  return tool.run(parsed.input, ctx);
}

function refusal(ctx: ToolContext): ToolErr {
  return err(
    "not_permitted",
    ctx.locale === "ar"
      ? "هذه المعلومة غير متاحة لهذا الحساب."
      : "That information is not available to this account."
  );
}
