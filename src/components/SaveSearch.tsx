"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState } from "react";

// Saved searches. localStorage is the device list (used signed-out and for the inline
// chips here); when the visitor is signed in we ALSO mirror each save to their account
// via /api/saved-searches, so it persists across devices and feeds the saved-search
// alerts on their occupier home. Signed-out mirror calls 401 and are ignored.

type Saved = { name: string; qs: string };
const KEY = "sat_saved_searches";

function read(): Saved[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

// Best effort: a signed-out user gets 401 and we simply keep the device list.
function mirror(qs: string, label: string): void {
  try {
    void fetch("/api/saved-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ qs, label }),
    });
  } catch {
    /* offline or signed out: the device list still has it */
  }
}

export default function SaveSearch({ locale, qs, label }: { locale: "en" | "ar"; qs: string; label: string }) {
  const ar = locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").chrome;
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
    mirror(qs, label);
  };
  const remove = (q: string) => {
    const next = saved.filter((s) => s.qs !== q);
    localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(next);
  };
  return (
    <div className="row gap8 wrap" style={{ marginTop: 10, alignItems: "center" }}>
      <button type="button" className={exists ? "chip on" : "chip"} onClick={save} style={{ cursor: exists ? "default" : "pointer" }}>
        {exists ? (t.searchSaved) : (t.saveThisSearch)}
      </button>
      {saved.map((s) => (
        <span key={s.qs} className="tag" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <a href={`/${locale}/listings${s.qs ? `?${s.qs}` : ""}`} style={{ textDecoration: "none", color: "inherit" }}>{s.name}</a>
          <button type="button" onClick={() => remove(s.qs)} aria-label={t.remove} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--slate)", padding: 0 }}>✕</button>
        </span>
      ))}
      {saved.length > 0 && <span className="muted" style={{ fontSize: "0.6875rem" }}>{t.savedOnDevice}</span>}
    </div>
  );
}
