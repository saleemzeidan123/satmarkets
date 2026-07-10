export default function Loading() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 64px" }} aria-busy="true" aria-label="Loading building">
      <div className="sk" style={{ width: 200, height: 11 }} />
      <div className="sk" style={{ width: "100%", height: 300, borderRadius: 14, marginTop: 16 }} />
      <div className="sk" style={{ width: "55%", height: 28, marginTop: 20 }} />
      <div className="sk" style={{ width: "35%", height: 14, marginTop: 12 }} />
      <div className="row gap12 wrap" style={{ marginTop: 22 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk" style={{ width: 150, height: 96, borderRadius: 12 }} />)}
      </div>
    </div>
  );
}
