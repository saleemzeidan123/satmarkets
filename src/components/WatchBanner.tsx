"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState } from "react";
import { getWatches, markSeen, removeWatch, watchKey, type Watch } from "@/lib/watches";

// Quiet, honest banner for device-local Rent Index watches. Fetches the same
// published rows the Rent Index renders and flags a watched segment only when
// its published median moved to a new period since this device last saw it.
// Every figure is a published median; nothing is computed or estimated.

type Seg = { district_label: string; district_label_ar: string | null; asset_type: string; segment: string; median: string | number | null; period: string; source: string | null };

const SEG_T: Record<string, [string, string]> = {
  grade_a: ["Grade A", "الفئة A"], grade_b: ["Grade B", "الفئة B"], grade_c: ["Grade C", "الفئة C"],
  serviced: ["Serviced", "مخدومة"], street: ["street", "شارع"], prime: ["prime", "مميّز"], clinic: ["Clinic", "عيادات"],
  street_front: ["Street front", "واجهة شارع"], mall_inline: ["Mall inline", "داخل مول"], modern: ["Modern", "حديثة"], older: ["Older", "أقدم"], blended: ["Blended", "مجمّع"],
};
const ASSET_T: Record<string, [string, string]> = {
  office: ["Office", "مكاتب"], retail: ["Retail", "تجزئة"], warehouse: ["Warehouse", "مستودعات"], serviced: ["Serviced", "مفروشة"], medical: ["Medical", "طبي"], showroom: ["Showroom", "معارض"], land: ["Land", "أراضٍ"],
};

interface Move { w: Watch; label: string; from: number; to: number; period: string; pct: number; beyond: boolean; }

export default function WatchBanner({ locale }: { locale: "en" | "ar" }) {
  const ar = locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").chrome;
  const wb = getDictionary(ar ? "ar" : "en").watchBanner;
  const [moves, setMoves] = useState<Move[]>([]);
  const [segs, setSegs] = useState<Seg[] | null>(null);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = () => setWatches(getWatches());
    load();
    window.addEventListener("sat-watches-changed", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("sat-watches-changed", load); window.removeEventListener("storage", load); };
  }, []);

  useEffect(() => {
    if (!watches.length) { setSegs([]); return; }
    let live = true;
    fetch("/api/index/segments").then((r) => r.json()).then((d) => { if (live) setSegs(Array.isArray(d.segments) ? d.segments : []); }).catch(() => { if (live) setSegs([]); });
    return () => { live = false; };
  }, [watches.length]);

  useEffect(() => {
    if (!segs || !watches.length) { setMoves([]); return; }
    const byKey = new Map<string, Seg>();
    for (const s of segs) byKey.set(watchKey(s.district_label, s.asset_type, s.segment), s);
    const out: Move[] = [];
    for (const w of watches) {
      const s = byKey.get(w.id);
      if (!s || s.median == null) continue;
      const cur = Number(s.median);
      if (!Number.isFinite(cur)) continue;
      // A move counts only when a NEW publication carries a different median.
      if (s.period === w.lastSeenPeriod || cur === w.lastSeenMedian) continue;
      const from = w.lastSeenMedian;
      const pct = from > 0 ? Math.round(((cur - from) / from) * 100) : 0;
      const dl = ar ? (s.district_label_ar || s.district_label) : s.district_label;
      const asset = (ASSET_T[s.asset_type]?.[ar ? 1 : 0]) || s.asset_type;
      const seg = s.segment ? " · " + ((SEG_T[s.segment]?.[ar ? 1 : 0]) || s.segment) : "";
      out.push({ w, label: `${dl} · ${asset}${seg}`, from, to: cur, period: s.period, pct, beyond: Math.abs(pct) >= w.thresholdPct });
    }
    setMoves(out);
  }, [segs, watches, ar]);

  if (dismissed || !moves.length) return null;
  const nf = (n: number) => n.toLocaleString("en-US");

  const dismissAll = () => { for (const m of moves) markSeen(m.w.id, m.to, m.period); setDismissed(true); setWatches(getWatches()); };
  const stop = (id: string) => { removeWatch(id); setWatches(getWatches()); };

  return (
    <div className="card" role="status" style={{ border: "1px solid var(--azure, #3A6EA5)", background: "var(--azure-wash, #EEF4FA)", padding: "14px 16px", marginBottom: 18, borderRadius: 12 }}>
      <div className="row gap8" style={{ alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div className="row gap8" style={{ alignItems: "center" }}>
          <span aria-hidden style={{ color: "var(--azure-d, #2C5578)", fontSize: 15 }}>◔</span>
          <strong style={{ fontSize: 14 }}>{t.segmentMoved}</strong>
        </div>
        <button type="button" onClick={dismissAll} className="chip" style={{ height: 30, padding: "0 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, border: "1px solid var(--silver-2, #D6DCE2)", background: "var(--paper, #fff)", color: "var(--ink)" }}>{t.gotIt}</button>
      </div>
      <div className="col gap8">
        {moves.map((m) => {
          const up = m.to > m.from;
          const arrow = up ? "▲" : "▼";
          const dir = up ? wb.upWord : wb.downWord;
          const line = ar
            ? `${m.label}: تحرّك المتوسط المنشور من ${nf(m.from)} إلى ${nf(m.to)} (${m.period})، ${dir} ${Math.abs(m.pct)}%.`
            : `${m.label}: published average moved from ${nf(m.from)} to ${nf(m.to)} (${m.period}), ${dir} ${Math.abs(m.pct)}%.`;
          return (
            <div key={m.w.id} className="row gap8" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ color: up ? "#1B7A50" : "#C0492F", marginInlineEnd: 6, fontSize: 11 }}>{arrow}</span>
                {line}
                {m.beyond ? <span style={{ marginInlineStart: 6, fontWeight: 600, color: "var(--azure-d, #2C5578)" }}>{`${wb.beyondPre}${m.w.thresholdPct}${wb.beyondSuf}`}</span> : null}
              </div>
              <button type="button" onClick={() => stop(m.w.id)} style={{ flex: "none", background: "transparent", border: "none", color: "var(--slate-2, #6B7480)", fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>{t.stop}</button>
            </div>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 8 }}>{t.watchDisclaimer}</div>
    </div>
  );
}
