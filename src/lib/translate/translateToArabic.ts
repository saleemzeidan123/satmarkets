// src/lib/translate/translateToArabic.ts
//
// SAT Markets. Automatic English to professional Saudi MSA Arabic translation.
//
// Protect-and-restore uses ASCII sentinel tokens (e.g. [[KA]]) because real
// models reliably echo ASCII tokens but DROP private-use Unicode characters.
// Only things that must stay byte-exact are masked: the FAL number, Western
// numerals/units, URLs, emails. Proper nouns are NOT masked; Claude renders
// Saudi district names in natural Arabic (e.g. Al Olaya -> العليا).

import { createHash } from "crypto";
import { DNT_LITERALS, PROPER_NOUNS, RE_GLOSSARY } from "./glossary";
import { callModel, classifiedSlot, instruction, phrase, userWords, type ClassifiedMessage } from "@/lib/ai";

export type Tier = "fast" | "quality";

export interface TranslateOptions {
  tier?: Tier;
  cache?: TranslationCache;
  signal?: AbortSignal;
}

export interface TranslationResult {
  ok: true;
  arabic: string;
  srcHash: string;
  /** The provider model that produced this Arabic, reported by the gateway. */
  model: string;
  cached: boolean;
}

/**
 * ADV-3A.1. A CONTROLLED UNAVAILABLE STATE, NOT AN EXCEPTION.
 *
 * `callTranslator` used to throw on a boundary denial, on a missing key and on a
 * provider error alike. Two problems followed from that. The caller could not
 * tell a policy state from an outage, so a route had no way to answer "Arabic
 * translation is switched off until an agreement is recorded" rather than "500".
 * And a thrown boundary denial reads as a malfunction when it is the boundary
 * working: while `AI_AGREEMENT_IN_FORCE` is false, unpublished listing copy is
 * not to be sent anywhere, and refusing to send it is the correct outcome.
 *
 * `agreement_required` is therefore a first-class result. Nothing is translated,
 * nothing is written, and no status claims a translation happened.
 */
export interface TranslationUnavailable {
  ok: false;
  reason: "agreement_required" | "no_provider" | "provider_error";
  detail: string;
}

export type TranslationOutcome = TranslationResult | TranslationUnavailable;

export interface TranslationCache {
  get(key: string): Promise<string | undefined> | string | undefined;
  set(key: string, value: string): Promise<void> | void;
}

// ADV-3A.1. THERE IS NO MODEL TABLE HERE ANY MORE.
//
// This file used to hold `MODELS`, a tier-to-model map read from
// `SAT_TRANSLATE_MODEL_FAST` and `SAT_TRANSLATE_MODEL_QUALITY`. Those two ids
// were already the `claude-haiku` and `claude-sonnet` candidate defaults in
// `src/lib/ai/router.ts`, so the map was a second register of the same fact,
// settable from the environment, in a module that is not the gateway. Codex item
// 4 asks the structural guard to treat a model-related environment read outside
// the AI package as a provider integration, and it was right to: this was one.
//
// The tier now names a candidate and the answering model comes back from the
// gateway, so the recorded `ar_translation_model` is what actually replied
// rather than what an environment variable hoped would.

/** Stable hash of a source field. Any single-character edit flips it. */
export function hashSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// ASCII sentinels. Models preserve these reliably; the inner counter is letters
// only so the number-masking pass below never re-matches a token.
const L = "[[K";
const R = "]]";

interface Masked {
  text: string;
  map: Map<string, string>;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toAlpha(n: number): string {
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function protect(input: string): Masked {
  const map = new Map<string, string>();
  let counter = 0;
  let text = input;

  const stash = (match: string): string => {
    const token = L + toAlpha(counter++) + R;
    map.set(token, match);
    return token;
  };

  // 1. Literal must-not-change strings (FAL number, product URLs). Longest first.
  for (const lit of [...DNT_LITERALS].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(escapeRegExp(lit), "g");
    text = text.replace(re, (m) => stash(m));
  }

  // 2. Optional Latin-only proper nouns (kept Latin on purpose, e.g. KAFD).
  for (const noun of [...PROPER_NOUNS].sort((a, b) => b.length - a.length)) {
    const re = new RegExp("\\b" + escapeRegExp(noun) + "\\b", "g");
    text = text.replace(re, (m) => stash(m));
  }

  // 3. URLs and emails.
  text = text.replace(/\b(?:https?:\/\/|www\.)[^\s]+/gi, (m) => stash(m));
  text = text.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, (m) => stash(m));

  // 4. Numbers with optional units/currency/area, keeping them Western.
  text = text.replace(/\d[\d,.]*\s?(?:m²|m2|sqm|sq\.?m|sar|usd|%|﷼)?/gi, (m) => stash(m));

  return { text, map };
}

function restore(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [token, original] of map) {
    out = out.split(token).join(original);
  }
  return out;
}

function activeGlossary(text: string): string {
  const lower = text.toLowerCase();
  const lines: string[] = [];
  for (const [en, ar] of Object.entries(RE_GLOSSARY)) {
    if (lower.includes(en)) lines.push('- "' + en + '" -> ' + ar);
  }
  return lines.join("\n");
}

// ADV-3A.1. The house style is a tagged template, so the one runtime value in it
// declares itself. The glossary is drawn from `RE_GLOSSARY`, a table written in
// this repository, so it is our own instruction text and not the owner's copy;
// saying so explicitly is the point of the slot.
function buildInstruction(text: string): ClassifiedMessage {
  const glossary = activeGlossary(text);
  return instruction("arabic house style")`You are a professional Arabic localizer for a Saudi commercial real estate platform.
Translate the user's English text into formal, polished Modern Standard Arabic (MSA) suitable for Saudi business audiences (tenants, investors, brokers).

Hard rules:
- Output ONLY the Arabic translation. No preamble, no notes, no quotes around it.
- Use formal MSA. Natural, fluent, professional. Not literal or robotic.
- Some tokens look like [[KA]], [[KB]], etc. (double square brackets). Keep each one EXACTLY as written, including the brackets, in place. Never translate, alter, space out, or drop them.
- Render Saudi place and district names in their natural Arabic form.
- Do not add facts, prices, figures, or claims that are not in the source.
- Preserve meaning precisely. If the source is a short label, translate it as a short label.${
    glossary
      ? phrase`\n\nUse these preferred Arabic equivalents for domain terms where they fit naturally:\n${classifiedSlot(
          glossary,
          [{ label: "SAT Arabic glossary", dataClass: "own_instruction" }]
        )}`
      : phrase``
  }`;
}

class MemoryCache implements TranslationCache {
  private m = new Map<string, string>();
  get(key: string) { return this.m.get(key); }
  set(key: string, value: string) { this.m.set(key, value); }
}
const defaultCache = new MemoryCache();

// Keyed on the TIER, not on a model id. The tier is the caller's stated intent
// about quality; the model that serves it is the router's business and may change
// without the meaning of a cached translation changing with it.
function cacheKey(src: string, tier: Tier): string {
  return createHash("sha256").update(tier + "::ar::" + src, "utf8").digest("hex");
}

// ADV-3A. The translator no longer opens its own socket.
//
// It used to POST straight to the provider from here, with its own key read, its
// own error shapes and no boundary call at all. The material it sends is the
// signed-in listing owner's own copy, submitted by that same owner under their own
// row-level security, so it was always permitted. But "permitted" was never
// established: nothing asked. A second path around a boundary is a defect even
// when the material on it happens to be allowed, because what travels on a path
// changes and the absence of a check does not.
//
// The tier is a deliberate choice about output quality, so it is expressed as a
// named candidate with no failover. A quality translation quietly answered by the
// fast tier would be a worse outcome than a failed one: the caller writes
// `ar_translation_status = 'machine'` either way and nobody could tell afterwards
// which model produced the Arabic on the page.
//
// ADV-3A.1. The listing copy sent here is `user_own_words`, and that class no
// longer travels while no enterprise AI agreement is in force. The owner wrote
// the text, but a draft listing is unpublished third-party material: it names a
// building, a landlord, sometimes a departing tenant. So this path stops at the
// boundary, inside `callModel`, before a provider is selected or a socket opened.
async function callTranslator(
  text: string,
  masked: string,
  tier: Tier,
  signal?: AbortSignal
): Promise<{ ok: true; text: string; model: string } | TranslationUnavailable> {
  const r = await callModel({
    profile: "bilingual_translation",
    candidate: tier === "quality" ? "claude-sonnet" : "claude-haiku",
    messages: [
      buildInstruction(text),
      // The owner's own listing copy, sent for processing on their behalf. Not a
      // platform record about them: text they wrote and submitted themselves.
      userWords(masked, "listing copy the owner wrote"),
    ],
    maxTokens: 2048,
    temperature: 0.2,
    signal,
  });
  if (r.ok) return { ok: true, text: r.text, model: r.model };
  if (r.failure === "boundary") {
    return {
      ok: false,
      reason: "agreement_required",
      detail:
        "Automatic Arabic translation is switched off until the enterprise AI agreement is recorded. " +
        r.denials.join("; "),
    };
  }
  if (r.failure === "no_provider") {
    return { ok: false, reason: "no_provider", detail: "No configured provider serves the Arabic translation profile." };
  }
  return { ok: false, reason: "provider_error", detail: r.reasons.slice(-1).join("") };
}

/** Translate one English field to professional Saudi MSA Arabic. */
export async function translateToArabic(source: string, opts: TranslateOptions = {}): Promise<TranslationOutcome> {
  const tier: Tier = opts.tier || "fast";
  const cache = opts.cache || defaultCache;
  const srcHash = hashSource(source);

  if (!source || source.trim() === "") {
    return { ok: true, arabic: "", srcHash, model: "", cached: false };
  }

  const key = cacheKey(source, tier);
  const hit = await cache.get(key);
  if (hit !== undefined) {
    return { ok: true, arabic: hit, srcHash, model: "", cached: true };
  }

  const { text: masked, map } = protect(source);
  const r = await callTranslator(source, masked, tier, opts.signal);
  if (!r.ok) return r;
  const arabic = restore(r.text, map);

  await cache.set(key, arabic);
  return { ok: true, arabic, srcHash, model: r.model, cached: false };
}

/** Translate several fields at once; skips fields whose source hash is unchanged. */
export async function translateFields(
  fields: Record<string, string>,
  opts: TranslateOptions & { knownHashes?: Record<string, string> } = {},
): Promise<Record<string, TranslationOutcome>> {
  const known = opts.knownHashes || {};
  const out: Record<string, TranslationOutcome> = {};
  for (const [name, value] of Object.entries(fields)) {
    const h = hashSource(value);
    if (known[name] && known[name] === h) {
      out[name] = { ok: true, arabic: "", srcHash: h, model: "", cached: true };
      continue;
    }
    out[name] = await translateToArabic(value, opts);
  }
  return out;
}

export const __internal = { protect, restore, activeGlossary, cacheKey };
