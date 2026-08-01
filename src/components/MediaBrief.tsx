"use client";

import { useState } from "react";
import { assessMedia, shotWeightLabel, type MediaHeld } from "@/lib/mediaStandard";

// ADV-2E. The media brief, in the Studio, above the upload controls.
//
// Two things sit here and they are kept visibly apart, because merging them is the
// mistake this whole module exists to avoid.
//
// The BRIEF is what a listing of this asset type shows, with the reason each view
// matters to the person deciding. It is addressed to the lister and it is never
// scored. The platform has no idea what any attached photograph is a photograph OF,
// so it cannot say a required view was supplied, and it does not pretend to.
//
// The STATUS counts the three things the record actually holds: photographs, plans
// and a video. That is a count, it is checkable, and nothing beyond it is claimed.
//
// Colour: signal for what is met, amber for what is outstanding. Never green. Green
// states that evidence was checked against an outside authority, and "six files are
// attached" is not that (D24: quality is not verification).

export default function MediaBrief({
  assetType,
  held,
  ar,
}: {
  assetType: string;
  held: MediaHeld;
  ar: boolean;
}) {
  const [open, setOpen] = useState(false);
  const status = assessMedia(assetType, held);
  const shots = status.standard.shots;
  const t = (en: string, arr: string) => (ar ? arr : en);

  return (
    <div className="rounded border border-line p-3">
      <div className="text-[12px] font-medium text-charcoal/80">
        {t("What this listing needs to show", "ما الذي يجب أن يعرضه هذا الإعلان")}
      </div>

      {/* The countable part. Statements, not scores. */}
      <ul className="mt-2 space-y-1">
        {status.requirements.map((r) => (
          <li key={r.key} className="text-[12px] flex items-start gap-2">
            <span aria-hidden="true" className={r.met ? "text-signal" : "text-amber"}>
              {r.met ? "✓" : "○"}
            </span>
            <span className={r.met ? "text-charcoal/70" : "text-charcoal/80"}>
              {ar ? r.statement_ar : r.statement_en}
              {!r.met && r.weight === "expected" && (
                <span className="text-charcoal/65"> {t("(expected, not required)", "(متوقع وغير مطلوب)")}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* The brief. Guidance, never a check, never a public claim about this listing. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 text-[12px] text-signal underline underline-offset-2 min-h-[44px]"
      >
        {open
          ? t("Hide the views a professional listing carries", "إخفاء اللقطات التي يحملها الإعلان الاحترافي")
          : t(`The ${shots.length} views a professional listing carries`, `${shots.length} لقطات يحملها الإعلان الاحترافي`)}
      </button>

      {open && (
        <div className="mt-2">
          <p className="text-[11px] text-charcoal/65">
            {t(
              "Guidance for you, not a check on this listing. Nothing here reads the contents of a file, so nothing here is counted against you.",
              "إرشاد لك، وليس فحصاً لهذا الإعلان. لا شيء هنا يقرأ محتوى الملفات، ولذلك لا يُحسب شيء منه عليك.",
            )}
          </p>
          <ul className="mt-2 space-y-2">
            {shots.map((s) => (
              <li key={s.key}>
                <div className="text-[12px] text-charcoal/85">
                  {ar ? s.label_ar : s.label_en}
                  <span className="ms-2 text-[11px] text-charcoal/65">{shotWeightLabel(s.weight, ar)}</span>
                </div>
                <p className="text-[11px] text-charcoal/65 leading-relaxed">{ar ? s.why_ar : s.why_en}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
