// The source hash, on its own, so that reading one does not cost a model gateway.
//
// PKG-LS1. `hashSource` lived in `translateToArabic.ts`, which imports the AI
// gateway at module scope. That is right for the translator and wrong for
// everyone else: the lister's own edit screen needs to know whether the Arabic on
// their listing was written against the English that is on it now, and answering
// that question is a sha256, not a provider call. Importing the translator to ask
// it would pull the gateway into a page that never translates anything.
//
// So the hash moves here and `translateToArabic.ts` re-exports it, which keeps
// every existing importer working and leaves exactly one definition of what a
// source hash is.

import { createHash } from "crypto";

/** Stable hash of a source field. Any single-character edit flips it. */
export function hashSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
