// Sprint A1 item 4: skeleton for the locations directory while districts load.
export default function Loading() {
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label="Loading commercial locations">
      <div className="sk" style={{ width: 90, height: 11 }} />
      <div className="sk" style={{ width: 380, height: 30, marginTop: 12, maxWidth: "82%" }} />
      <div className="sk" style={{ width: "55%", height: 14, marginTop: 10 }} />
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} style={{ marginTop: 30 }}>
          <div className="sk" style={{ width: 180, height: 16 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginTop: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card pad">
                <div className="sk" style={{ width: "65%", height: 14 }} />
                <div className="sk" style={{ width: "40%", height: 11, marginTop: 10 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
