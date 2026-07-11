"use client";
import { useEffect, useState } from "react";
import { addWatch } from "@/lib/watches";

export interface R { id: string; reference_code: string; asset_type: string; title_en: string | null; title_ar: string | null; area_sqm: number; asking_rent_sqm: number | null; sale_price: number | null; districts?: { name_en: string | null; name_ar: string | null; city: string | null } | null; }
export interface Msg { role: "u" | "a"; text: string; results?: R[]; note?: string; band?: { low: number; median: number; high: number; unit?: string }; quoted?: number | null; handoffDistrict?: string | null; handoffAsset?: string | null; handoffLabel?: string | null; }

/**
 * Shared advisor conversation state: /api/advisor first ({query, history}),
 * only true search mode falls through to /api/search. Used by the advisor
 * page and the floating advisor widget. Pass a storageKey to persist the
 * conversation in sessionStorage (the widget does; the page does not).
 */
export function useAdvisorChat(locale: "en" | "ar", storageKey?: string) {
 const ar = locale === "ar";
 const key = storageKey ? `${storageKey}:${locale}` : undefined;
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [busy, setBusy] = useState(false);
 const [hydrated, setHydrated] = useState(!key);

 useEffect(() => {
  if (!key) return;
  try {
   const s = JSON.parse(sessionStorage.getItem(key) || "[]");
   if (Array.isArray(s) && s.length) setMsgs(s);
  } catch {}
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
  try {
   const hist = msgs.slice(-6).map((mm) => ({ role: mm.role === "u" ? "user" : "assistant", text: mm.text })).filter((h) => h.text);
   const ar1 = await fetch("/api/advisor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q, history: hist }) });
   const aj = await ar1.json();
   if (aj?.mode && aj.mode !== "search" && aj.message) {
    if (aj.mode === "watch" && aj.band && aj.band.median != null) {
     addWatch({ districtLabel: aj.band.district_label, assetType: aj.band.asset_type, segment: aj.band.segment, thresholdPct: aj.threshold, median: Number(aj.band.median), period: aj.band.period });
    }
    const extra: Partial<Msg> = {};
    if (aj.mode === "value" && aj.band && aj.band.median != null && aj.band.band_low != null && aj.band.band_high != null) {
     const mnum = String(q).match(/\d[\d,]{2,}(?:\.\d+)?/);
     const qn = mnum ? parseFloat(mnum[0].replace(/,/g, "")) : NaN;
     extra.band = { low: Number(aj.band.band_low), median: Number(aj.band.median), high: Number(aj.band.band_high), unit: aj.band.unit };
     extra.quoted = isFinite(qn) && qn > 0 ? qn : null;
     if (aj.band.district_id) { extra.handoffDistrict = String(aj.band.district_id); extra.handoffAsset = aj.band.asset_type || null; extra.handoffLabel = aj.band.district_label || null; }
    }
    setMsgs((m) => [...m, { role: "a", text: aj.message, ...extra }]);
    setBusy(false);
    return;
   }
  } catch {}
  try {
   const r = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
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
    else if (results.length) note = `${results.length} verified ${results.length === 1 ? "match" : "matches"}, owner-verified, deduplicated, permit-backed.`;
    else note = "No verified matches yet for that. Try a different district, size, or budget and I'll search again.";
   }
   setMsgs((m) => [...m, { role: "a", text: note, results, note: ar ? "مؤشر الإيجارات للربع الأول 2026 · معايير منشورة منسوبة إلى مصادرها" : "Rent Index Q1 2026 · published benchmarks, attributed to source" }]);
  } catch {
   setMsgs((m) => [...m, { role: "a", text: ar ? "حدث ما قاطع البحث. حاول مرة أخرى." : "Something interrupted the search. Please try again." }]);
  }
  setBusy(false);
 }

 function reset() {
  setMsgs([]);
  if (key) try { sessionStorage.removeItem(key); } catch {}
 }

 return { msgs, setMsgs, busy, send, reset };
}
