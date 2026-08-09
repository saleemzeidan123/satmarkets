"use client";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";

// PKG-DISCOVERY-1, item 6 and item 8. `loading.tsx` receives no route params
// (only pages and layouts do), so the locale is read off the URL the same
// way `listings/loading.tsx` already does, and the label comes from the same
// dictionary the page itself renders from rather than a private string.
export default function Loading() {
  const ar = (usePathname() || "").split("/")[1] === "ar";
  const label = getDictionary(ar ? "ar" : "en").listers.loadingDirectory;
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label={label}>
      <div className="sk" style={{ width: 100, height: 11 }} />
      <div className="sk" style={{ width: 340, height: 30, marginTop: 12, maxWidth: "80%" }} />
      <div className="sk" style={{ width: "90%", height: 14, marginTop: 12, maxWidth: 500 }} />
      <div className="row gap10" style={{ marginTop: 20, alignItems: "center" }}>
        <div className="sk" style={{ width: 60, height: 14 }} />
        <div className="sk" style={{ width: 140, height: 34, borderRadius: 8 }} />
        <div className="sk" style={{ width: 70, height: 34, borderRadius: 8 }} />
      </div>
      <div className="sk" style={{ width: 160, height: 12, marginTop: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 260px), 1fr))", gap: 16, marginTop: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div className="row gap10" style={{ alignItems: "center" }}>
              <div className="sk" style={{ width: 44, height: 44, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="sk" style={{ width: "70%", height: 14 }} />
                <div className="sk" style={{ width: "40%", height: 12, marginTop: 8 }} />
              </div>
            </div>
            <div className="sk" style={{ width: "50%", height: 11, marginTop: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
