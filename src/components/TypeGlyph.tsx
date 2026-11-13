// The picture a listing gets on a results row when it has no photograph of its
// own: a small drawing of what kind of space it is.
//
// WHY NOT A STOCK PHOTOGRAPH. The grid card draws one from src/lib/photos.ts,
// chosen by hashing the listing id into a short list of library pictures. A
// reader cannot tell that from a photograph of the space, and a picture of some
// other building beside a real address and a real price is a statement about
// the listing that nobody recorded. The owner ruling for the redesign is: a
// listing's own photographs lead when it has them, and until then the drawing
// stands in. This file is the drawing.
//
// WHAT IT IS NOT. It is not to scale and it carries no figure. Four forms cover
// the fifteen asset types by the thing each is measured by: floors stacked, a
// street front, a shed, a plot. The to-scale drawing built from a listing's own
// recorded sizes belongs to the listing page, where the sizes are on the page
// beside it. So this is decoration and is hidden from assistive technology; the
// row names the asset type in words.
//
// Hex literals rather than var(): a custom property does not resolve in an SVG
// presentation attribute, the same reason the card's tick carries one.

type Form = "stack" | "front" | "shed" | "plot";

const FORM: Record<string, Form> = {
  office: "stack", serviced: "stack", medical: "stack", education: "stack", mixed_use: "stack", hospitality: "stack", worker_housing: "stack",
  retail: "front", showroom: "front", entertainment: "front", wedding_hall: "front",
  warehouse: "shed", self_storage: "shed",
  land: "plot", gas_station: "plot",
};

const INK = "#14181B", BLUE = "#2B4782", BAR = "#C3CCD8";

export default function TypeGlyph({ type, size = 56 }: { type: string; size?: number }) {
  const form = FORM[type] ?? "stack";
  return (
    <svg className="rs-glyph" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      {form === "stack" && (
        <>
          {[10, 16, 22, 28, 34, 40].map((y, i) => (
            <rect key={y} x="14" y={y} width="28" height="4.5" rx="1" fill={i === 2 || i === 3 ? BLUE : BAR} />
          ))}
        </>
      )}
      {form === "front" && (
        <>
          <rect x="16" y="12" width="24" height="30" rx="1.5" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" />
          <rect x="15" y="41" width="26" height="3.5" fill={BLUE} />
        </>
      )}
      {form === "shed" && (
        <>
          <path d="M11 42V25l17-8 17 8v17" fill="#FFFFFF" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M7 42h42" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          <rect x="33" y="34" width="6" height="7" fill={BLUE} />
        </>
      )}
      {form === "plot" && (
        <>
          <rect x="13" y="13" width="30" height="26" rx="1" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" strokeDasharray="4 3" />
          <rect x="9" y="42" width="38" height="3.5" fill={BLUE} />
        </>
      )}
    </svg>
  );
}
