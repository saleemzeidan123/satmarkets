// ADV-3A.1, Codex item 3. Conversation history, and what may be treated as
// evidence.
//
// `/api/advisor` used to keep the last six turns of both roles, hand each one to
// `priorTurn(role, text)`, which classified all of them `user_own_words`, and
// concatenate all of them into `allowedSrc`, the string `unsourcedFigure` checks
// a new reply against.
//
// Two distinct faults sat in that, and only one of them is about classification.
//
// The first is provenance: an assistant reply is not the user's own words. It is
// model output, and it may restate a licensed figure, a platform record or
// something the model invented. Sending it to an external provider under a class
// it has no claim to is the laundering Codex named.
//
// The second is worse and is about evidence. `unsourcedFigure` exists to stop the
// advisor stating a rent that came from nowhere. If a previous assistant reply
// counts as an allowed source, then a rent the model invented on turn one is an
// allowed source on turn two, and the guard that exists to catch exactly that
// figure waves it through because the model said it before. A number has to come
// from the person or from a published band we retrieved. A previous reply is
// neither, and no amount of repetition makes it either.
//
// Until conversation history carries typed provenance per turn, the honest shape
// is the narrow one: assistant turns are dropped here and go nowhere.

export type RawTurn = { role?: unknown; text?: unknown };
export type UserTurn = { content: string };

const MAX_TURNS = 6;
const MAX_CHARS = 600;

/**
 * The person's own earlier turns, in order, trimmed. Assistant turns are dropped.
 *
 * The filter runs before the window, not after. The route used to take the last
 * six raw turns and then discard the assistant ones, which in an ordinary
 * alternating conversation left three: the window was spent on turns that were
 * never going to be sent. Six of the person's turns is what six was meant to be.
 */
export function userHistory(history: unknown, max = MAX_TURNS): UserTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h: RawTurn) => !!h && h.role === "user" && typeof h.text === "string" && h.text.length > 0)
    .slice(-max)
    .map((h: RawTurn) => ({ content: String(h.text).slice(0, MAX_CHARS) }));
}

/**
 * The text a figure in a reply may be supported by.
 *
 * Only the current question and the person's own earlier questions. A published
 * band, where one was retrieved, is appended by the caller that retrieved it.
 */
export function allowedSources(raw: string, hist: readonly UserTurn[]): string {
  return [raw, ...hist.map((h) => h.content)].join(" ");
}
