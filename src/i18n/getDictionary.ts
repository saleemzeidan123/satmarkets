import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import ar from "./dictionaries/ar.json";
import { rebrandDeep } from "@/lib/operator";
// PKG-SEPARABILITY-1. The dictionaries are written for the default operator.
// This is the one place their text meets the operator configured for the
// deployment. With the default operator `rebrandDeep` hands back the same
// object, so nothing is copied and nothing changes.
const dictionaries = { en: rebrandDeep(en), ar: rebrandDeep(ar) } as const;
export type Dictionary = typeof en;
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
