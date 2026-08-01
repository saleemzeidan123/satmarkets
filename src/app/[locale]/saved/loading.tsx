export default function Loading() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label="Loading saved">
      <div className="sk" style={{ width: 180, height: 26 }} />
      <div className="row gap8" style={{ marginTop: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="sk" style={{ width: 90, height: 30, borderRadius: 8 }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%, 260px), 1fr))", gap: 16, marginTop: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ overflow: "hidden" }}>
            <div className="sk" style={{ height: 150, borderRadius: 0 }} />
            <div style={{ padding: 14 }}>
              <div className="sk" style={{ width: "70%", height: 15 }} />
              <div className="sk" style={{ width: "45%", height: 12, marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
