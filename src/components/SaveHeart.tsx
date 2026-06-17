"use client";
import { useEffect, useState } from "react";

const KEY = "satm_saved";

export default function SaveHeart({ id, label }: { id: string; label?: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "[]"); setSaved(Array.isArray(s) && s.includes(id)); } catch {}
  }, [id]);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "[]");
      const arr: string[] = Array.isArray(s) ? s : [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaved(next.includes(id));
    } catch {}
  };
  return (
    <button type="button" onClick={toggle} aria-label={label || "Save"} aria-pressed={saved}
      className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-charcoal shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#2E5FE0" : "none"} stroke={saved ? "#2E5FE0" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
      </svg>
    </button>
  );
}
