export default function Loading() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }} aria-busy="true" aria-label="Loading compare">
      <div className="sk" style={{ width: 220, height: 26 }} />
      <div className="sk" style={{ width: "60%", height: 14, marginTop: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "160px repeat(3, 1fr)", gap: 12, marginTop: 24 }}>
        {Array.from({ length: 24 }).map((_, i) => <div key={i} className="sk" style={{ height: i < 4 ? 90 : 20, borderRadius: i < 4 ? 12 : 6 }} />)}
      </div>
    </div>
  );
}
