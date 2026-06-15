import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/getDictionary";
import SearchBar from "@/components/SearchBar";

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const dict = getDictionary(locale);
  return (
    <section className="py-10">
      <div className="text-xs uppercase tracking-widest text-gold">{dict.hero.eyebrow}</div>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight">{dict.hero.title}</h1>
      <p className="mt-4 max-w-2xl text-charcoal/70">{dict.hero.subtitle}</p>
      <div className="mt-8">
        <SearchBar locale={locale} placeholder={dict.hero.searchPlaceholder} cta={dict.hero.browse} />
      </div>
    </section>
  );
}
