"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/satkit";

type Opt = { label: string; href: string; kind: "city" | "district" };

export default function LocationSearch({ locale, options, initial }: { locale: string; options: Opt[]; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial || "");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
    return base.slice(0, 8);
  }, [q, options]);
  const go = (o: Opt) => { setQ(o.label); setOpen(false); router.push(o.href); };
  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      <div className="search focus" style={{ border: "1px solid var(--azure)", boxShadow: "none", margin: 0 }}>
        <span style={{ color: "var(--harbor)" }}><Icon.pin size={18} /></span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter") { e.preventDefault(); if (matches[hi]) go(matches[hi]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search any city, district or project across Saudi Arabia"
          style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 15, color: "var(--ink)", fontFamily: "var(--sans)" }}
        />
        {q ? <button type="button" onClick={() => { setQ(""); setOpen(true); }} aria-label="Clear" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--slate)", fontSize: 18, lineHeight: 1 }}>&times;</button> : null}
      </div>
      {open && matches.length > 0 ? (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid var(--silver)", borderRadius: 12, boxShadow: "0 14px 36px rgba(20,24,27,.14)", zIndex: 40, overflow: "hidden" }}>
          {matches.map((o, i) => (
            <button key={o.href} type="button" onMouseEnter={() => setHi(i)} onClick={() => go(o)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "11px 14px", border: "none", borderTop: i === 0 ? "none" : "1px solid var(--paper)", cursor: "pointer", background: i === hi ? "var(--cool)" : "#fff", color: "var(--ink)", fontSize: 14 }}>
              <span style={{ color: o.kind === "city" ? "var(--harbor)" : "var(--slate)" }}><Icon.pin size={15} /></span>
              <span style={{ fontWeight: o.kind === "city" ? 600 : 400 }}>{o.label}</span>
              {o.kind === "city" ? <span className="tag" style={{ marginLeft: "auto" }}>City</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
