"use client";
import { useEffect } from "react";
import { dirFor, type Locale } from "@/i18n/config";

export default function HtmlLangDir({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale]);
  return null;
}
