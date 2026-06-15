import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import ar from "./dictionaries/ar.json";
const dictionaries = { en, ar } as const;
export type Dictionary = typeof en;
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
