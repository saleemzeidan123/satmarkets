// ADV-3A. The public face of the AI package.
//
// `transport.ts` is deliberately absent from this file. It is the only module
// that opens a socket to a provider, and it is reachable only from `gateway.ts`.
// Re-exporting it here would turn the boundary back into advice, so the omission
// is the design and `gateway.test.ts` enforces it by reading the repository.

export {
  callModel,
  callModelText,
  sanitizeModelText,
  type GatewayRequest,
  type GatewayResult,
  type GatewayFailure,
} from "./gateway";

export {
  instruction,
  userWords,
  priorTurn,
  classified,
  partsOf,
  UnclassifiedMessageError,
  type ClassifiedMessage,
  type Role,
  type Slot,
} from "./message";

export {
  CANDIDATES,
  PROVIDERS,
  selectChain,
  type Capability,
  type EvaluationState,
  type ModelCandidate,
  type Provider,
  type ProviderId,
  type Selection,
  type SelectionBasis,
  type TaskProfile,
} from "./router";
