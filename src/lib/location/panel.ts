import { mobilityFigure, type MobilityContext, type MobilityStage } from "./mobility";
import type { Audience } from "./registry";

// ADV-5B. The only way a rendering surface may reach a mobility figure.
//
// WHY THIS FILE EXISTS RATHER THAN A DIRECT CALL FROM THE PAGE.
//
// `mobilityFigure` returns a `reasons` array that quotes licence and contract
// reasoning, and a `code` and `unanswered` list that name internal register and
// clause identifiers. None of that may reach a reader. The usual way to honour
// that is a comment telling the next editor not to render `reasons`, and the
// usual outcome is that somebody renders `reasons` while debugging an empty
// panel and never takes it out again.
//
// So the view type below has no field to put it in. `MobilityPanelView` carries
// a translation key and, when a figure is ever permitted, the evidence that has
// to travel with it. A page cannot print the licence reasoning because a page
// never holds it.
//
// The second reason is vocabulary. A page that names `footfall_index` reads as a
// page that has one. The metric names live here, the surface asks for a panel,
// and the structural claims gate keeps working on the surfaces themselves.
//
// Today every call returns `available: false` at the `rights` stage, because
// `geo_analytics` has no row in `source_registry`. That is the correct state and
// it is rendered as such rather than hidden.

/** Translation keys, so no English or Arabic prose is decided in this file. */
export type PanelStatusKey =
  | "mobilityStageRights"
  | "mobilityStageSufficiency"
  | "mobilityStageData"
  | "mobilityStageCoverage";

export type MobilityPanelView =
  | {
      available: false;
      /** What a reader is told. Never a reason string. */
      statusKey: PanelStatusKey;
    }
  | {
      available: true;
      value: number;
      /** Required, on the mobility rule: a figure states its aggregation count. */
      k: number;
      periodEnd: string;
      coverageShare: number;
      method: string;
      attribution: string;
    };

const STAGE_KEY: Record<MobilityStage, PanelStatusKey> = {
  rights: "mobilityStageRights",
  sufficiency: "mobilityStageSufficiency",
  data: "mobilityStageData",
  coverage: "mobilityStageCoverage",
};

/**
 * The visitation panel for a district, or the reason a reader may be told there
 * is none.
 *
 * A building id is deliberately not accepted. `MobilityAvailable` narrows its
 * geography to city or district, so a building-level movement figure cannot be
 * constructed, and offering a building argument here would suggest otherwise.
 *
 * Never throws. An absent or unreadable register denies at the rights stage,
 * because an unknown source has no rights.
 */
export function districtMobilityPanel(
  districtId: string | null | undefined,
  audience: Audience,
  ctx: MobilityContext = {}
): MobilityPanelView {
  const out = mobilityFigure(
    {
      metric: "footfall_index",
      geography: "district",
      areaId: districtId ?? "",
      audience,
    },
    ctx
  );

  if (out.status === "unavailable") {
    return { available: false, statusKey: STAGE_KEY[out.stage] };
  }

  return {
    available: true,
    value: out.value,
    k: out.k,
    periodEnd: out.periodEnd,
    coverageShare: out.coverageShare,
    method: out.method,
    attribution: out.attribution,
  };
}
