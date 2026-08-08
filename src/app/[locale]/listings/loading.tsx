"use client";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";

// Sprint A1 item 4: skeleton for the exchange while listings + map data load.
//
// PKG-DISCOVERY-1 slice C. This fallback used to name itself "Loading
// listings" unconditionally, in English, on an App Router route segment
// whose Arabic half never gets to say otherwise: `loading.tsx` receives no
// route params, only pages and layouts do. It reads its own locale off the
// URL instead, the same way ChromeGate and the other client shells that sit
// outside a locale-aware server tree already do, and the label itself comes
// from the same dictionary every other string on this page does.
export default function Loading() {
  const ar = (usePathname() || "").split("/")[1] === "ar";
  const label = getDictionary(ar ? "ar" : "en").listings.loadingListings;
  const bar = (w: number, h = 12, mt = 8) => (
    <div className="sk" style={{ width: `${w}%`, height: h, marginTop: mt }} />
  );
  const cards = Array.from({ length: 6 });
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label={label}>
      <div className="sk" style={{ width: 120, height: 11 }} />
      <div className="sk" style={{ width: 340, height: 30, marginTop: 12, maxWidth: "80%" }} />
      <div className="sk" style={{ width: "100%", height: 48, marginTop: 18, borderRadius: 11 }} />
      <div className="row gap8" style={{ marginTop: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk" style={{ width: 74, height: 30, borderRadius: 8 }} />
        ))}
      </div>
      <div className="row gap8" style={{ marginTop: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk" style={{ width: 66, height: 30, borderRadius: 8 }} />
        ))}
      </div>
      <div className="sk" style={{ width: 130, height: 12, marginTop: 16 }} />
      <div className="lst-split" style={{ marginTop: 18 }}>
        <div className="col gap12" style={{ display: "grid", gap: 14 }}>
          {cards.map((_, i) => (
            <div key={i} className="card" style={{ overflow: "hidden" }}>
              <div className="sk" style={{ height: 150, borderRadius: 0 }} />
              <div style={{ padding: 14 }}>
                {bar(70, 15, 0)}
                {bar(45)}
                {bar(35, 20, 12)}
              </div>
            </div>
          ))}
        </div>
        <div className="sk" style={{ minHeight: 460, height: "100%", borderRadius: 12 }} />
      </div>
    </div>
  );
}
