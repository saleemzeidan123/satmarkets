"use client";
import { getDictionary } from "@/i18n/getDictionary";
import { useEffect, useState } from "react";
import { readSaved, writeSaved, syncSave } from "@/lib/saved";

// Chip-style save toggle for the listing detail page. Writes the listing id into the
// shared satm_saved device list the Saved page and TabBar badge read, and mirrors the
// change to the signed-in user's account (best effort) so favourites persist.
export default function SaveButton({ id, locale }: { id: string; locale: string }) {
  const ar = locale === "ar";
  const t = getDictionary(ar ? "ar" : "en").chrome;
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(readSaved().includes(id)); }, [id]);
  const toggle = () => {
    const arr = readSaved();
    const on = !arr.includes(id);
    writeSaved(on ? [...arr, id] : arr.filter((x) => x !== id));
    setSaved(on);
    void syncSave(id, on);
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
