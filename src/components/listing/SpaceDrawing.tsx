import { formatFieldValue } from "@/lib/attributeDisplay";
import { fill, formatArea } from "@/lib/format";
import { scaleBarMetres, type SpacePlan } from "@/lib/spaceDrawing";

// The to-scale drawing of a space, on its listing page.
//
// It is handed a `SpacePlan` and draws nothing it was not handed.
// `spacePlanOf` (src/lib/spaceDrawing.ts) decides whether a listing has one:
// the lister entered a frontage and a depth, and the two multiplied agree with
// the stated area. A listing without a plan never reaches this component.
//
// THE DRAWING. A rectangle whose sides are in the ratio the record gives, with
// the frontage along the bottom edge, where the street is marked, and the depth
// running back from it. One length unit of the viewBox is one tenth of a metre
// scaled to fit, the same scale on both axes, which is what "to scale" means and
// is why the scale bar under it can be read against either side.
//
// WHAT IT SAYS. Both sides are labelled with the value and unit the record
// holds, formatted by the same function the attribute rows use, so the drawing
// and the row beside it cannot print different numbers. The sentence under it
// states that the shape is a rectangle assumed from two sizes, gives the area
// that rectangle has and the area the lister stated, and says the real outline
// may differ. The picture is named for assistive technology by the same facts.
//
// Hex literals rather than var(): a custom property does not resolve in an SVG
// presentation attribute. No em dashes (Law 2). Western numerals (Law 4).

const INK = "#14181B", BLUE = "#2265C4", WASH = "#ECF2F8", SLATE = "#5B6470";

export default function SpaceDrawing({
  plan,
  t,
  ar,
}: {
  plan: SpacePlan;
  /** The `ld` dictionary slice: drawTitle, drawAlt, drawNote, drawStreet. */
  t: { drawTitle: string; drawAlt: string; drawNote: string; drawStreet: string };
  ar: boolean;
}) {
  const locale = ar ? "ar" : "en";
  const frontageText = formatFieldValue(plan.frontageField, plan.frontage, ar) ?? "";
  const depthText = formatFieldValue(plan.depthField, plan.depth, ar) ?? "";
  const frontageLabel = ar ? plan.frontageField.label_ar : plan.frontageField.label_en;
  const depthLabel = ar ? plan.depthField.label_ar : plan.depthField.label_en;

  // Fit the rectangle into a 300 by 220 box at one scale for both axes.
  const BOX_W = 300, BOX_H = 220;
  const k = Math.min(BOX_W / plan.frontage, BOX_H / plan.depth);
  const w = plan.frontage * k, h = plan.depth * k;
  // Room beside the rectangle for the depth label, on the reading-start side,
  // and below it for the frontage label, the street and the scale bar. The
  // canvas is as wide as the drawing needs and no wider, so the labels are set
  // at their stated size instead of being scaled with an empty margin.
  const LABEL_SIDE = 112, FAR_SIDE = 16, PAD_TOP = 12, PAD_BOTTOM = 78, HALF_CAPTION = 96;
  const VW = Math.max(LABEL_SIDE + w + FAR_SIDE, LABEL_SIDE + w / 2 + HALF_CAPTION);
  const VH = h + PAD_TOP + PAD_BOTTOM;
  const x = ar ? VW - LABEL_SIDE - w : LABEL_SIDE, y = PAD_TOP;
  const bar = scaleBarMetres(plan.frontage);
  const barW = bar * k;
  const barText = formatFieldValue(plan.frontageField, bar, ar) ?? "";
  // Anchors, stated physically. The drawing takes the page's direction so an
  // Arabic label reads number first, from the right. In a right-to-left run
  // `text-anchor: start` pins the text's RIGHT edge, so "the edge that touches
  // x" has to be named by side and resolved per language, or a label lands
  // inside the plan.
  const leftEdgeAt = ar ? "end" : "start";
  const rightEdgeAt = ar ? "start" : "end";
  // The depth label sits on the reading-start side of the rectangle.
  const depthX = ar ? x + w + 18 : x - 18;
  const depthAnchor = ar ? leftEdgeAt : rightEdgeAt;

  return (
    <section className="sd" aria-labelledby="sd-title">
      <h2 id="sd-title" className="serif ld-h2">{t.drawTitle}</h2>
      <div className="sd-body">
      <div className="sd-frame">
        <svg className="sd-svg" viewBox={`0 0 ${VW} ${VH}`} role="img" style={{ direction: ar ? "rtl" : "ltr", width: Math.round(VW) }} aria-label={fill(t.drawAlt, { frontageLabel, frontage: frontageText, depthLabel, depth: depthText })}>
          <rect x={x} y={y} width={w} height={h} fill={WASH} stroke={INK} strokeWidth="2" />
          {/* The frontage: the edge that meets the street. */}
          <rect x={x} y={y + h - 2} width={w} height="5" fill={BLUE} />
          {/* Depth, with a tick at each end. */}
          <path d={`M${ar ? x + w + 6 : x - 6} ${y}v${h}M${ar ? x + w + 2 : x - 10} ${y}h8M${ar ? x + w + 2 : x - 10} ${y + h}h8`} stroke={SLATE} strokeWidth="1" fill="none" />
          <text x={depthX} y={y + h / 2 - 4} textAnchor={depthAnchor} fontSize="12" fill={SLATE}>{depthLabel}</text>
          <text x={depthX} y={y + h / 2 + 13} textAnchor={depthAnchor} fontSize="14" fontWeight="600" fill={INK}>{depthText}</text>
          {/* Frontage, under the street edge. */}
          <text x={x + w / 2} y={y + h + 22} textAnchor="middle" fontSize="12" fill={SLATE}>{frontageLabel} · {t.drawStreet}</text>
          <text x={x + w / 2} y={y + h + 40} textAnchor="middle" fontSize="14" fontWeight="600" fill={INK}>{frontageText}</text>
          {/* Scale bar, the same scale as both sides. */}
          <path d={`M${x} ${y + h + 60}h${barW}M${x} ${y + h + 55}v10M${x + barW} ${y + h + 55}v10`} stroke={INK} strokeWidth="1.5" fill="none" />
          <text x={x + barW + 8} y={y + h + 64} textAnchor={leftEdgeAt} fontSize="12" fill={INK}>{barText}</text>
        </svg>
      </div>
      <p className="sd-note">
        {fill(t.drawNote, {
          frontage: frontageText,
          depth: depthText,
          product: formatArea(Math.round(plan.product * 10) / 10, locale),
          area: formatArea(plan.area, locale),
        })}
      </p>
      </div>
    </section>
  );
}
