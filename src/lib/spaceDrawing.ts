// When a listing may be drawn to scale, and from what.
//
// OWNER RULING, 2026-11-13. The to-scale drawing of a space is shown only when
// the lister entered every size the drawing needs and those sizes agree with
// the area the same lister stated. Otherwise there is no drawing: not a sketch,
// not a default shape, nothing.
//
// WHAT "EVERY SIZE" MEANS HERE. A plan needs a width and a depth. The registry
// (`ASSET_FIELDS`) is asked whether an asset type records both, under the keys
// below, so a type gains a drawing the day its form gains the two fields and
// not before. Today that is retail. An office records a floor plate, a
// warehouse a clear height and a plot a frontage, and none of those is two
// sides of a rectangle, so none of them is drawn.
//
// WHAT "AGREE" MEANS HERE. The drawing is a rectangle, so its own area is the
// frontage multiplied by the depth. If that product is within AREA_TOLERANCE of
// the stated area the three numbers describe one space and the rectangle is a
// fair picture of it. If it is not, at least one of the three is wrong or the
// space is not a rectangle, and in either case a rectangle would be a picture
// of something the record does not describe. The tolerance is a judgment, not a
// measurement, and it is stated on the page beside the drawing along with the
// two areas, so a reader can see how close "agree" was.
//
// Nothing here is a figure of SAT's. The product is arithmetic over two numbers
// the lister typed, shown next to the third. No em dashes (Law 2).

import { fieldsFor, type AssetField } from "./assetFields";

/** How far the rectangle's area may sit from the stated area, as a share of the stated area. */
export const AREA_TOLERANCE = 0.1;

const FRONTAGE_KEY = "frontage_m";
const DEPTH_KEY = "unit_depth_m";

export type SpacePlan = {
  frontage: number;
  depth: number;
  /** frontage multiplied by depth: the area of the rectangle that is drawn. */
  product: number;
  /** The area the lister stated. */
  area: number;
  frontageField: AssetField;
  depthField: AssetField;
};

const positive = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const read = (
  listing: { attributes?: Record<string, unknown> | null } & Record<string, unknown>,
  f: AssetField,
): number | null => {
  const attrs = (listing.attributes as Record<string, unknown> | null | undefined) ?? {};
  return positive(f.column && listing[f.column] != null ? listing[f.column] : attrs[f.key]);
};

/**
 * The plan a listing has earned, or null.
 *
 * Null for every reason the ruling names, and they are not told apart, because
 * the page does the same thing for all of them: it draws nothing.
 */
export function spacePlanOf(
  listing: { asset_type?: string | null; area_sqm?: unknown; attributes?: Record<string, unknown> | null } & Record<string, unknown>,
): SpacePlan | null {
  const fields = fieldsFor(listing.asset_type ?? "");
  const frontageField = fields.find((f) => f.key === FRONTAGE_KEY);
  const depthField = fields.find((f) => f.key === DEPTH_KEY);
  if (!frontageField || !depthField) return null;
  const frontage = read(listing, frontageField);
  const depth = read(listing, depthField);
  const area = positive(listing.area_sqm);
  if (frontage === null || depth === null || area === null) return null;
  const product = frontage * depth;
  if (Math.abs(product - area) / area > AREA_TOLERANCE) return null;
  return { frontage, depth, product, area, frontageField, depthField };
}

/** A round length for the scale bar: the largest of these that is at most 40 percent of the frontage. */
export function scaleBarMetres(frontage: number): number {
  const steps = [50, 20, 10, 5, 2, 1];
  return steps.find((s) => s <= frontage * 0.4) ?? 1;
}
