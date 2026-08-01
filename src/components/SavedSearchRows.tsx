"use client";
import { useState } from "react";
import Link from "next/link";

// The occupier's account-backed saved searches, with a live "new since you saved
// this" alert count. Delete is optimistic and calls /api/saved-searches. Read-only
// data (labels, hrefs, counts) is computed on the server and passed in.
export type SavedSearchRow = {
  id: string;
  label: string;
  href: string;
  total: number;
  fresh: number;
};

export default function SavedSearchRows({
  rows, locale, labels,
}: {
  rows: SavedSearchRow[];
  locale: "en" | "ar";
  labels: { matches: string; newSince: string; view: string; remove: string; empty: string };
}) {
  const ar = locale === "ar";
  const [items, setItems] = useState(rows);
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusy(id);
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id)); // optimistic
    try {
      const res = await fetch("/api/saved-searches", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) setItems(prev); // rollback
    } catch {
      setItems(prev);
    } finally {
      setBusy(null);
    }
  };

  if (!items.length) return <p className="muted" style={{ fontSize: "0.84375rem", margin: "6px 0 0" }}>{labels.empty}</p>;

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      {items.map((s) => (
        <div key={s.id} className="card pad row between" style={{ alignItems: "center", gap: 12, boxShadow: "none", border: "1px solid var(--silver)" }}>
          <div style={{ minWidth: 0 }}>
            <div className="row gap8 wrap" style={{ alignItems: "center" }}>
              <Link href={s.href} style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{s.label}</Link>
              {s.fresh > 0 && (
                <span className="tag" style={{ background: "var(--harbor)", color: "var(--on-brand)", borderColor: "transparent", fontSize: "0.6875rem" }}>
                  {s.fresh} {labels.newSince}
                </span>
              )}
            </div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 3 }}>
              <bdi dir="ltr">{s.total}</bdi> {labels.matches}
            </div>
          </div>
          <div className="row gap8" style={{ alignItems: "center", flex: "none" }}>
            <Link href={s.href} className="btn secondary sm" style={{ textDecoration: "none" }}>{labels.view}</Link>
            <button type="button" onClick={() => remove(s.id)} disabled={busy === s.id} aria-label={labels.remove}
              style={{ border: "1px solid var(--silver)", background: "var(--paper)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "var(--slate)", flex: "none", opacity: busy === s.id ? 0.5 : 1 }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
