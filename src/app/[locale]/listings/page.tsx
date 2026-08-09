import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { releaseVisibleInventory } from "@/lib/inventory";
import { assetLabel, dealLabel, cityLabel, cityKey, gradeLabel, gradePhrase, fitoutLabel, segmentLabel } from "@/lib/labels";
import { listingTitle } from "@/lib/listingTitle";
PLACEHOLDER_ABORT_SENTINEL
