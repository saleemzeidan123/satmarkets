"use client";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px" }}>
      <div className="card pad" style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>ما قدرنا نحمّل الصفحة. جرّب مرة ثانية.</p>
        <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>We could not load this page. Try again.</p>
        <button type="button" onClick={() => reset()} className="btn primary" style={{ marginTop: 18, justifyContent: "center" }}>
          إعادة المحاولة · Try again
        </button>
      </div>
    </div>
  );
}
