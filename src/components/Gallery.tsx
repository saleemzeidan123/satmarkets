"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export default function Gallery({ images, title, photosLabel }: { images: string[]; title: string; photosLabel: string }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [tx, setTx] = useState(0);
  /* ELITE-4 J3-1: the lightbox is a modal, so it needs a root to trap Tab inside,
     a close button to receive focus on open, and the thumbnail that opened it to
     receive focus back on close. */
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const show = useCallback((idx: number) => setI((idx + images.length) % images.length), [images.length]);
  const prev = useCallback(() => show(i - 1), [i, show]);
  const next = useCallback(() => show(i + 1), [i, show]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      /* ELITE-4 J3-1: focus trap. Tab cycles the overlay's own controls and never
         reaches the page underneath, which aria-modal already hides. */
      else if (e.key === "Tab") {
        const root = overlayRef.current;
        if (!root) return;
        const f = Array.from(root.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        const act = document.activeElement as HTMLElement | null;
        const inside = !!act && root.contains(act);
        if (e.shiftKey && (!inside || act === first)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (!inside || act === last)) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, prev, next]);
  /* ELITE-4 J3-1: focus move and restore, kept in its own effect so it does not
     re-run (and steal focus back) every time the shown image changes. */
  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    return () => { if (opener && document.contains(opener)) opener.focus(); };
  }, [open]);
  const openAt = (idx: number, el: HTMLElement | null) => { openerRef.current = el; setI(idx); setOpen(true); };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <button type="button" onClick={(e) => openAt(0, e.currentTarget)} className="group relative col-span-4 overflow-hidden rounded-2xl">
          <img src={images[0]} alt={title} className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          <span className="pointer-events-none absolute bottom-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 20"/></svg>
            {images.length} {photosLabel}
          </span>
        </button>
        {/* ELITE-4 J3-6: the image is decorative here, so the name has to come
            from the button itself or the thumbnail is an unnamed control. */}
        {images.slice(1, 3).map((src, k) => (
          <button type="button" key={k} onClick={(e) => openAt(k + 1, e.currentTarget)} aria-label={`${title}, ${k + 2} / ${images.length}`} className="group col-span-2 overflow-hidden rounded-xl">
            <img src={src} alt="" className="h-28 w-full object-cover transition duration-500 group-hover:scale-[1.05]" />
          </button>
        ))}
      </div>

      {open && (
        <div ref={overlayRef} role="dialog" aria-modal="true" aria-label={`${title}, ${images.length} ${photosLabel}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          onTouchStart={(e) => setTx(e.touches[0].clientX)}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - tx; if (dx > 45) prev(); else if (dx < -45) next(); }}>
          <button type="button" ref={closeRef} aria-label="Close" className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20" onClick={() => setOpen(false)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <button type="button" aria-label="Previous" className="absolute start-3 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          {/* ELITE-4 J3-2: the only image in the dialog cannot be decorative. */}
          <img src={images[i]} alt={`${title}, ${i + 1} / ${images.length}`} className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button type="button" aria-label="Next" className="absolute end-3 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20" onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          {/* ELITE-4 J3-2: the position indicator is the only feedback that the arrows worked. */}
          <div aria-live="polite" className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[12px] text-white fig">{i + 1} / {images.length}</div>
        </div>
      )}
    </>
  );
}
