"use client";
import { useEffect, useState } from "react";

// Device-local saved searches (localStorage). Works signed-out; moves to the
// saved_searches table when accounts go live. Bilingual, no backend calls.

type Saved = { name: string; qs: string };
const KEY = "sat_saved_searches";

function read(): Saved[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export default function SaveSearch({ locale, qs, label }: { locale: "en" | "ar"; qs: string; label: string }) {
  const ar = locale === "ar";
  const [saved, setSaved] = useState<Saved[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setSaved(read()); setMounted(true); }, []);
  if (!mounted) return null;
  const exists = saved.some((s) => s.qs === qs);
  const save = () => {
    if (exists) return;
    const next = [...saved, { name: label, qs }].slice(-8);
    localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(next);
  };
  const remove = (q: string) => {
    const next = saved.filter((s) => s.qs !== q);
    localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(next);
  };
  return (
    <div className="row gap8 wrap" style={{ marginTop: 10, alignItems: "center" }}>
      <button type="button" className={exists ? "chip on" : "chip"} onClick={save} style={{ cursor: exists ? "default" : "pointer" }}>
        {exists ? (ar ? "تم حفظ البحث ✓" : "Search saved ✓") : (ar ? "حفظ هذا البحث" : "Save this search")}
      </button>
      {saved.map((s) => (
        <span key={s.qs} className="tag" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <a href={`/${locale}/listings${s.qs ? `?${s.qs}` : ""}`} style={{ textDecoration: "none", color: "inherit" }}>{s.name}</a>
          <button type="button" onClick={() => remove(s.qs)} aria-label={ar ? "حذف" : "Remove"} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--slate)", padding: 0 }}>✕</button>
        </span>
      ))}
      {saved.length > 0 && <span className="muted" style={{ fontSize: 11 }}>{ar ? "محفوظة على هذا الجهاز" : "saved on this device"}</span>}
    </div>
  );
}
