"use client";
import { useEffect, useState } from "react";
import { addWatch } from "@/lib/watches";
import { formatPeriod } from "@/lib/market/period";

export interface R { id: string; reference_code: string; asset_type: string; title_en: string | null; title_ar: string | null; area_sqm: number; asking_rent_sqm: number | null; sale_price: number | null; districts?: { name_en: string | null; name_ar: string | null; city: string | null } | null; }
export interface Msg { role: "u" | "a"; text: string; results?: R[]; note?: string; band?: { low: number; average: number; high: number; unit?: string }; quoted?: number | null; handoffDistrict?: string | null; handoffAsset?: string | null; handoffLabel?: string | null; retry?: string; }

/**
 * Every advisor request is bounded. An AI provider stall or a network hang used
 * to leave the composer in the searching state indefinitely (observed live at
 * over 30 seconds), with no way out except a page reload: the two fetches had no
 * timeout and no abort. The request is now abandoned at this deadline and the
 * failure message carries the original question back as a retry action, so the
 * user is never trapped waiting. Applied per call, so a slow /api/advisor cannot
 * spend the /api/search budget as well.
 */
export const REQUEST_TIMEOUT_MS = 20000;

const isAbort = (e: unknown) => !!e && typeof e === "object" && (e as { name?: string }).name === "AbortError";

async function fetchBounded(url: string, body: unknown, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Bump when the persisted Msg shape changes so old prototype conversations are
// dropped rather than deserialised into the new renderer. v1 stored band.median;
// the renderer now reads band.average, and a stale v1 blob would feed undefined
// into number formatting. The version is part of the storage key, so bumping it
// simply orphans the old blob (no migration needed for throwaway test state).
const STATE_VERSION = "v2";

/**
 * Shared advisor conversation state: /api/advisor first ({query, history}),
 * only true search mode falls through to /api/search. Used by the advisor
 * page and the floating advisor widget. Pass a storageKey to persist the
 * conversation in sessionStorage. BOTH callers pass one today (the page uses
 * "sat_advisor_page", the widget "sat_advisor"), so both persist per locale.
 */
export function useAdvisorChat(locale: "en" | "ar", storageKey?: string) {
 const ar = locale === "ar";
 const key = storageKey ? `${storageKey}:${STATE_VERSION}:${locale}` : undefined;
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [busy, setBusy] = useState(false);
 const [hydrated, setHydrated] = useState(!key);

 useEffect(() => {
  if (!key) return;
  try {
   const s = JSON.parse(sessionStorage.getItem(key) || "[]");
   // Authoritative for the current key. The key is locale-scoped, so on a
   // language switch this loads that locale's thread, and crucially resets to
   // empty when it has none, instead of leaving the previous language's
   // messages on screen (advisor UX advisory 2026-07-11).
   setMsgs(Array.isArray(s) ? s : []);
  } catch { setMsgs([]); }
  setHydrated(true);
 }, [key]);

 useEffect(() => {
  if (!key || !hydrated) return;
  try { sessionStorage.setItem(key, JSON.stringify(msgs.slice(-30))); } catch {}
 }, [msgs, key, hydrated]);

 async function send(text: string) {
  const q = text.trim();
  if (!q || busy) return;
  setMsgs((m) => [...m, { role: "u", text: q }]);
  setBusy(true);
  // One failure surface for both calls. `retry` carries the exact question, so
  // the renderer can offer a single-tap retry instead of asking the user to
  // retype it (and instead of leaving them watching a spinner that never ends).
  const failed = (timedOut: boolean) => {
   setMsgs((m) => [...m, {
    role: "a",
    text: timedOut
     ? (ar ? "استغرق هذا وقتاً أطول من المتوقع، فأوقفت الانتظار. يمكنك المحاولة مرة أخرى." : "That took longer than expected, so I stopped waiting. You can try again.")
     : (ar ? "حدث ما قاطع البحث. حاول مرة أخرى." : "Something interrupted the search. Please try again."),
    retry: q,
   }]);
   setBusy(false);
  };
  try {
   const hist = msgs.slice(-6).map((mm) => ({ role: mm.role === "u" ? "user" : "assistant", text: mm.text })).filter((h) => h.text);
   const ar1 = await fetchBounded("/api/advisor", { query: q, history: hist }, REQUEST_TIMEOUT_MS);
   const aj = await ar1.json();
   if (aj?.mode && aj.mode !== "search" && aj.message) {
    if (aj.mode === "watch" && aj.band && aj.band.average != null) {
     addWatch({ districtLabel: aj.band.district_label, assetType: aj.band.asset_type, segment: aj.band.segment, thresholdPct: aj.threshold, median: Number(aj.band.average), period: aj.band.period });
    }
    const extra: Partial<Msg> = {};
    if (aj.mode === "value" && aj.band && aj.band.average != null && aj.band.band_low != null && aj.band.band_high != null) {
     // The user's comparison figure is decided ONCE, on the server, by
     // readNumericIntent (PKG-1B.2, Codex items 1 and 2). This used to re-parse the
     // question here with a first-number regex, so asking "what was the office band
     // in Al Olaya in 2026" drew a "your rate" marker at 2,026 on the chart even
     // when the prose was correct. The client now trusts the server or shows nothing.
     const qn = typeof aj.quoted === "number" ? aj.quoted : NaN;
     extra.band = { low: Number(aj.band.band_low), average: Number(aj.band.average), high: Number(aj.band.band_high), unit: aj.band.unit };
     extra.quoted = isFinite(qn) && qn > 0 ? qn : null;
     if (aj.band.district_id) { extra.handoffDistrict = String(aj.band.district_id); extra.handoffAsset = aj.band.asset_type || null; extra.handoffLabel = (ar ? (aj.band.district_label_ar || aj.band.district_label) : aj.band.district_label) || null; }
    }
    setMsgs((m) => [...m, { role: "a", text: aj.message, ...extra }]);
    setBusy(false);
    return;
   }
  } catch (e) {
   // A timed-out advisor call must NOT fall through to the search call: that
   // would double the wait the deadline exists to bound. Any other advisor
   // failure still falls through, exactly as before.
   if (isAbort(e)) { failed(true); return; }
  }
  try {
   const r = await fetchBounded("/api/search", { query: q }, REQUEST_TIMEOUT_MS);
   const j = await r.json();
   const results: R[] = j.results || [];
   let note = "";
   if (ar) {
    if (j.clarify) note = "أخبرني بالمزيد، نوع المساحة أو المدينة أو الميزانية، وسأضيّق النطاق.";
    else if (j.relaxed && results.length) note = `لا توجد مطابقات تامة، فإليك أقرب ${results.length}، بعضها ${j.relaxedReason || "خارج عوامل التصفية"}. عدّل الميزانية أو المساحة أو الحي للتضييق.`;
    else if (results.length) note = `${results.length} مطابقة موثّقة، من المالك مباشرة، خالية من التكرار، مدعومة بالتراخيص.`;
    else note = "لا توجد مطابقات موثّقة لذلك بعد. جرّب حياً أو مساحة أو ميزانية مختلفة وسأبحث مجدداً.";
   } else {
    if (j.clarify) note = "Tell me a bit more, a space type, a city, or a budget, and I'll narrow it down.";
    else if (j.relaxed && results.length) note = `No exact matches, so here are the closest ${results.length}, some are ${j.relaxedReason || "outside your filters"}. Adjust the budget, size, or district to tighten it.`;
    else if (results.length) note = `${results.length} verified ${results.length === 1 ? "match" : "matches"}, owner-verified and deduplicated.`;
    else note = "No verified matches yet for that. Try a different district, size, or budget and I'll search again.";
   }
   setMsgs((m) => [...m, { role: "a", text: note, results, note: ar ? `مؤشر الإيجارات ${formatPeriod("2026-Q2", true)} · معايير منشورة منسوبة إلى مصادرها` : `Rent Index ${formatPeriod("2026-Q2", false)} · published benchmarks, attributed to source` }]);
  } catch (e) {
   failed(isAbort(e));
   return;
  }
  setBusy(false);
 }

 function reset() {
  setMsgs([]);
  if (key) try { sessionStorage.removeItem(key); } catch {}
 }

 return { msgs, setMsgs, busy, send, reset };
}
