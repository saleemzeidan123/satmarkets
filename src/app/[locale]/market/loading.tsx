// Sprint A1 item 4: skeleton for Market pulse while index + listings aggregate.
export default function Loading() {
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label="Loading market pulse">
      <div className="sk" style={{ width: 110, height: 11 }} />
      <div className="sk" style={{ width: 300, height: 30, marginTop: 12, maxWidth: "80%" }} />
      <div className="sk" style={{ width: "60%", height: 14, marginTop: 10 }} />
      <div className="row gap12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%, 150px), 1fr))", gap: 14, marginTop: 22 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card pad">
            <div className="sk" style={{ width: "55%", height: 12 }} />
            <div className="sk" style={{ width: "40%", height: 26, marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div className="card pad" style={{ marginTop: 20 }}>
        <div className="sk" style={{ width: 200, height: 14 }} />
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="sk" style={{ width: 90, height: 12, flex: "0 0 auto" }} />
              <div className="sk" style={{ flex: 1, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
