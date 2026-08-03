import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { IntakeLocation } from "@/lib/requirementIntake";
import RequirementForm from "./RequirementForm";

// PKG-DEM1. The public demand entry point.
//
// WHY THIS IS A SERVER PAGE NOW. The form that used to live here was a client
// component holding five district UUIDs as literals, all of them in Riyadh, with
// names that had drifted from the source. The platform holds seventy seven
// locations across twenty one cities, and the only way a form can offer what the
// platform actually holds is to read it. So the read is here, on the server,
// where the districts table is reachable, and the form below is the part that
// needs state.
//
// A NULL CLIENT IS NOT AN EMPTY MARKET. When Supabase is unconfigured this
// passes an empty array and the form says its locations are unavailable rather
// than rendering a select with nothing in it. A control with no options reads as
// "this market has no locations", which is a claim about the market; the empty
// state is a claim about this request, which is the true one.
//
// No `generateMetadata` here. `layout.tsx` owns it, from the time this route was
// a client component and could not export one (Codex correction 5), and two
// sources for one route's metadata is how they start disagreeing.

export const revalidate = 3600;

export default async function PostRequirementPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;

  const sb = await getSupabaseServer();
  let locations: IntakeLocation[] = [];
  if (sb) {
    const { data } = await sb.from("districts").select("id,name_en,name_ar,city");
    locations = (data ?? [])
      .map((d: any) => ({
        id: String(d.id ?? ""),
        name_en: String(d.name_en ?? ""),
        name_ar: String(d.name_ar ?? ""),
        city: String(d.city ?? ""),
      }))
      .filter((d) => d.id && d.city);
  }

  return <RequirementForm locale={locale} locations={locations} />;
}
