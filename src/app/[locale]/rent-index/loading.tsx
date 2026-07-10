export default function Loading() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label="Loading rent index">
      <div className="sk" style={{ width: 150, height: 11 }} />
      <div className="sk" style={{ width: 420, height: 30, marginTop: 12, maxWidth: "80%" }} />
      <div className="sk" style={{ width: "70%", height: 14, marginTop: 12 }} />
      <div className="row gap12 wrap" style={{ marginTop: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="sk" style={{ width: 220, height: 110, borderRadius: 12 }} />)}
      </div>
      <div className="sk" style={{ width: "100%", height: 360, borderRadius: 12, marginTop: 24 }} />
    </div>
  );
}
