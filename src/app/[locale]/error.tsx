"use client";
import { useParams } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";

// This boundary used to print both languages at once, stacked, because it had no
// locale to choose with. It sits inside the [locale] segment, so the route
// params are available on the client and the page can speak one language like
// every other page does.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ locale?: string }>();
  const d = getDictionary(params?.locale === "ar" ? "ar" : "en").errorPage;
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px" }}>
      <div className="card pad" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{d.body}</p>
        <button type="button" onClick={() => reset()} className="btn primary" style={{ marginTop: 18, justifyContent: "center" }}>
          {d.retry}
        </button>
      </div>
    </div>
  );
}
