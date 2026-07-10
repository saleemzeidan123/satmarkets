export default function Loading() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 64px" }} aria-busy="true" aria-label="Loading listing">
      <div className="sk" style={{ width: 220, height: 11 }} />
      <div className="satmkt-2col" style={{ display: "grid", gap: 28, marginTop: 16 }}>
        <div>
          <div className="sk" style={{ width: "100%", height: 360, borderRadius: 14 }} />
          <div className="sk" style={{ width: "60%", height: 30, marginTop: 20 }} />
          <div className="sk" style={{ width: "40%", height: 14, marginTop: 12 }} />
          <div className="row gap8" style={{ marginTop: 20 }}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="sk" style={{ width: "23%", height: 74, borderRadius: 12 }} />)}
          </div>
          <div className="sk" style={{ width: "100%", height: 120, borderRadius: 12, marginTop: 24 }} />
        </div>
        <div className="sk" style={{ width: "100%", height: 380, borderRadius: 14 }} />
      </div>
    </div>
  );
}
