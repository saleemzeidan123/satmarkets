"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState } from "react";

const KEY = "satm_saved";

// Chip-style save toggle for the listing detail page. Writes the listing id into
// the same satm_saved localStorage list the Saved page and TabBar badge read.
export default function SaveButton({ id, locale }: { id: string; locale: string }) {
  const ar = locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").chrome;
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "[]"); setSaved(Array.isArray(s) && s.includes(id)); } catch {}
  }, [id]);
  const toggle = () => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "[]");
      const arr: string[] = Array.isArray(s) ? s : [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaved(next.includes(id));
      try { window.dispatchEvent(new Event("storage")); } catch {}
    } catch {}
  };
  return (
    <button type="button" onClick={toggle} className="chip" aria-pressed={saved}
      style={{ cursor: "pointer", borderColor: saved ? "var(--harbor)" : undefined, color: saved ? "var(--harbor)" : undefined }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "#3A6EA5" : "none"} stroke={saved ? "#3A6EA5" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {saved ? (t.saved) : (t.save)}
    </button>
  );
}
