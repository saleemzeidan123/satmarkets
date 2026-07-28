// Sprint A1 item 4: skeleton for the exchange while listings + map data load.
export default function Loading() {
  const bar = (w: number, h = 12, mt = 8) => (
    <div className="sk" style={{ width: `${w}%`, height: h, marginTop: mt }} />
  );
  const cards = Array.from({ length: 6 });
  return (
    <div style={{ maxWidth: 1360, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label="Loading listings">
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
