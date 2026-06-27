// src/lib/translate/translateToArabic.ts
//
// SAT Markets. Automatic English to professional Saudi MSA Arabic translation.
//
// Design (see work/plans/arabic-auto-translation-system.md):
//  1. A deterministic protect-and-restore layer masks anything that must never
//     change (FAL number 1200025510, SAT brand names, Western numerals, URLs,
//     proper nouns) BEFORE the model sees the text, and restores the exact
//     original strings afterward. The model literally cannot drift on them.
//  2. Claude does the actual translation. Haiku for routine fields, Sonnet for
//     hero / marketing copy. Only the glossary terms present in the text are
//     injected, with do-not-translate instructions as a second safety layer.
//  3. An injectable cache keyed by hash(source + lang + model) avoids paying
//     for identical strings twice. hashSource() drives staleness detection.
//
// No third-party SDK: calls the Anthropic Messages API over fetch (Node 18+).
// The API key is read from process.env and never leaves the server.

import { createHash } from "crypto";
import { DNT_LITERALS, PROPER_NOUNS, RE_GLOSSARY } from "./glossary";

export type Tier = "fast" | "quality";

export interface TranslateOptions {
  tier?: Tier;
  cache?: TranslationCache;
  model?: string;
  signal?: AbortSignal;
}

export interface TranslationResult {
  arabic: string;
  srcHash: string;
  model: string;
  cached: boolean;
}

export interface TranslationCache {
  get(key: string): Promise<string | undefined> | string | undefined;
  set(key: string, value: string): Promise<void> | void;
}

const MODELS: Record<Tier, string> = {
  fast: process.env.SAT_TRANSLATE_MODEL_FAST || "claude-haiku-4-5-20251001",
  quality: process.env.SAT_TRANSLATE_MODEL_QUALITY || "claude-sonnet-4-6",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/** Stable hash of a source field. Any single-character edit flips it. */
export function hashSource(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// Private-use sentinels so placeholders never collide with real text.
const L = "";
const R = "";

interface Masked {
  text: string;
  map: Map<string, string>;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Encode the counter with letters ONLY, so placeholder tokens contain no ASCII
// digits and cannot be re-matched by the number-masking pass below.
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

  // 1. Literal brand / licence strings (longest first).
  for (const lit of [...DNT_LITERALS].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(escapeRegExp(lit), "g");
    text = text.replace(re, (m) => stash(m));
  }

  // 2. Known proper nouns (district / city names) in their Latin form.
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

/** Put the exact original strings back (exact token match, order-independent). */
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

function buildSystem(text: string): string {
  const glossary = activeGlossary(text);
  return [
    "You are a professional Arabic localizer for a Saudi commercial real estate platform.",
    "Translate the user's English text into formal, polished Modern Standard Arabic (MSA) suitable for Saudi business audiences (tenants, investors, brokers).",
    "",
    "Hard rules:",
    "- Output ONLY the Arabic translation. No preamble, no notes, no quotes around it.",
    "- Use formal MSA. Natural, fluent, professional. Not literal or robotic.",
    "- Any token wrapped in the private-use characters U+E000 and U+E001 is a protected placeholder. Keep each one EXACTLY as-is and in place. Never alter, translate, reorder, or drop it.",
    "- Do not translate proper nouns, brand names, URLs, or numbers; those are already protected as placeholders.",
    "- Do not add facts, prices, figures, or claims that are not in the source.",
    "- Preserve the meaning precisely. If the source is a short label or fragment, translate it as a short label or fragment.",
    glossary ? "\nUse these preferred Arabic equivalents for domain terms where they fit naturally:\n" + glossary : "",
  ].filter(Boolean).join("\n");
}

class MemoryCache implements TranslationCache {
  private m = new Map<string, string>();
  get(key: string) { return this.m.get(key); }
  set(key: string, value: string) { this.m.set(key, value); }
}
const defaultCache = new MemoryCache();

function cacheKey(src: string, model: string): string {
  return createHash("sha256").update(model + "::ar::" + src, "utf8").digest("hex");
}

async function callClaude(system: string, userText: string, model: string, signal?: AbortSignal): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to the server environment (Vercel env, not NEXT_PUBLIC).");
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error("Anthropic API error " + res.status + ": " + detail.slice(0, 500));
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("").trim();
  if (!out) throw new Error("Anthropic API returned empty content.");
  return out;
}

/** Translate one English field to professional Saudi MSA Arabic. */
export async function translateToArabic(source: string, opts: TranslateOptions = {}): Promise<TranslationResult> {
  const tier: Tier = opts.tier || "fast";
  const model = opts.model || MODELS[tier];
  const cache = opts.cache || defaultCache;
  const srcHash = hashSource(source);

  if (!source || source.trim() === "") {
    return { arabic: "", srcHash, model, cached: false };
  }

  const key = cacheKey(source, model);
  const hit = await cache.get(key);
  if (hit !== undefined) {
    return { arabic: hit, srcHash, model, cached: true };
  }

  const { text: masked, map } = protect(source);
  const system = buildSystem(source);
  const raw = await callClaude(system, masked, model, opts.signal);
  const arabic = restore(raw, map);

  await cache.set(key, arabic);
  return { arabic, srcHash, model, cached: false };
}

/** Translate several fields at once; skips fields whose source hash is unchanged. */
export async function translateFields(
  fields: Record<string, string>,
  opts: TranslateOptions & { knownHashes?: Record<string, string> } = {},
): Promise<Record<string, TranslationResult>> {
  const known = opts.knownHashes || {};
  const out: Record<string, TranslationResult> = {};
  for (const [name, value] of Object.entries(fields)) {
    const h = hashSource(value);
    if (known[name] && known[name] === h) {
      out[name] = { arabic: "", srcHash: h, model: MODELS[opts.tier || "fast"], cached: true };
      continue;
    }
    out[name] = await translateToArabic(value, opts);
  }
  return out;
}

export const __internal = { protect, restore, activeGlossary, cacheKey };
