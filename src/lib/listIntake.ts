// PKG-SUP1. What `/list` is allowed to say about the intake.
//
// THE DEFECT THIS EXISTS TO END.
//
// `/list` is the public entry point for supply, and it was a picture of a form
// rather than a description of one. Eight `<label>` elements, zero `<input>`,
// zero `<textarea>`, zero `<select>` and zero `<form>` on the deployed route in
// both languages. Every field was a `<div class="input">` holding somebody
// else's answer, a four step progress bar showed step 1 checked and step 2
// active, and a "Drag photos here" zone was not a drop target. So an owner
// reasonably believed they were two steps into a submission that did not exist,
// a photograph dropped on that zone was lost without a message, and a screen
// reader announced a "Listing title" field with nothing to focus.
//
// It also described the wrong intake. Its four steps were Asset, Details and
// media, Pricing, Verify and publish. The intake has ten stages.
//
// WHY THIS MODULE IS DERIVED RATHER THAN WRITTEN.
//
// A page that describes an intake in its own words drifts the first time the
// intake changes, and nobody finds out, because prose has no test. Everything
// here is computed from the two models that actually run the Studio and the
// write path:
//
//   `studioSteps()`      the stages a lister is taken through, with the title
//                        and purpose the Studio itself shows for each.
//   `DRAFT_REQUIRED_CHECK_KEYS` plus `assessListing()`
//                        the facts the write path refuses to save a draft
//                        without, with the label and the reason the
//                        completeness model already holds for each.
//
// So the public description of the intake and the intake are the same object.
// Change a stage and this page changes with it; delete one and the page loses a
// row rather than lying about it.
//
// WHAT IT DELIBERATELY REFUSES TO ASSERT.
//
// A stage is listed only if EVERY asset type has it. The page speaks to a
// visitor who has not chosen a type yet, so a stage that applies to warehouses
// and not to land would be a promise made to two thirds of readers. The
// intersection is computed rather than assumed, and the test fails if it ever
// stops being all ten.
//
// A step COUNT is not a stage count. Some asset types split one stage over two
// pages, so the same ten stages run to ten steps for an office and eleven for a
// warehouse. Both numbers are computed and the page states the range rather
// than picking the flattering end.
//
// The asking figure is the one required fact whose label depends on a choice the
// visitor has not made: `Asking rent` under a lease, `Asking price` under a
// sale. Rather than pick one and be wrong for half the market, both are read and
// joined. Every other required fact has one label under both deal types, which
// the test asserts rather than trusts.

import { ASSET_FIELDS } from "./assetFields";
import { studioSteps, DRAFT_REQUIRED_CHECK_KEYS, type StudioStepKind } from "./listingStudio";
import { assessListing } from "./listingQuality";

/** One stage of the intake, as a visitor who has chosen nothing yet can be told about it. */
export interface IntakeStage {
  kind: StudioStepKind;
  /** 1 based, in the order a lister meets them. */
  index: number;
  title: string;
  purpose: string;
}

/** One fact the write path will not save a draft without. */
export interface IntakeRequirement {
  key: string;
  label: string;
  why: string;
}

/** How many steps the intake runs to, across every asset type. */
export interface IntakeSize {
  stages: number;
  minSteps: number;
  maxSteps: number;
}

const assetTypes = (): string[] => Object.keys(ASSET_FIELDS);

/**
 * The stages every asset type shares, in intake order.
 *
 * Titles come from the step's own `title_*`, with one correction: a stage split
 * into parts carries ", part 1" in its title, which is true of that step and
 * false of the stage. The part suffix is stripped by taking the title of a
 * stage that was NOT split where one exists, and every kind has at least one
 * unsplit occurrence across the registry, which the test asserts.
 */
export function intakeStages(ar: boolean): IntakeStage[] {
  const types = assetTypes();
  if (types.length === 0) return [];

  // Order comes from the first type; membership from all of them.
  const first = studioSteps(types[0]);
  const order: StudioStepKind[] = [];
  for (const s of first) if (!order.includes(s.kind)) order.push(s.kind);

  const shared = order.filter((kind) => types.every((t) => studioSteps(t).some((s) => s.kind === kind)));

  const out: IntakeStage[] = [];
  for (const kind of shared) {
    let title = "";
    let purpose = "";
    for (const t of types) {
      const step = studioSteps(t).find((s) => s.kind === kind && s.parts === 1);
      if (!step) continue;
      title = ar ? step.title_ar : step.title_en;
      purpose = ar ? step.purpose_ar : step.purpose_en;
      break;
    }
    if (!title) continue;
    out.push({ kind, index: out.length + 1, title, purpose });
  }
  return out;
}

/** The stage count, and the range of step counts it expands to across asset types. */
export function intakeSize(): IntakeSize {
  const counts = assetTypes().map((t) => studioSteps(t).length);
  return {
    stages: intakeStages(false).length,
    minSteps: counts.length ? Math.min(...counts) : 0,
    maxSteps: counts.length ? Math.max(...counts) : 0,
  };
}

/**
 * The facts a draft cannot be saved without, in the order the write path lists
 * them, each with the label and reason the completeness model already holds.
 *
 * `orWord` is the reader's "or", passed in from the dictionary because it is the
 * only word on this surface that is copy rather than model. It is used for the
 * asking figure alone, and only while lease and sale genuinely disagree.
 */
export function intakeRequirements(ar: boolean, orWord: string): IntakeRequirement[] {
  const forDeal = (deal: string) =>
    new Map(assessListing({ asset_type: "office", deal_type: deal }).checks.map((c) => [c.key, c]));
  const lease = forDeal("lease");
  const sale = forDeal("sale");

  const out: IntakeRequirement[] = [];
  for (const key of DRAFT_REQUIRED_CHECK_KEYS) {
    const a = lease.get(key);
    if (!a) continue;
    const b = sale.get(key);
    const la = ar ? a.label_ar : a.label_en;
    const lb = b ? (ar ? b.label_ar : b.label_en) : la;
    out.push({
      key,
      label: la === lb ? la : `${la} ${orWord} ${lb}`,
      why: ar ? a.why_ar : a.why_en,
    });
  }
  return out;
}
