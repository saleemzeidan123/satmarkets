// Server-rendered JSON-LD. Identity guardrail: never a person, always the
// SAT brand. FAL licence is 1200025510.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }) }}
    />
  );
}

import { SITE } from "@/lib/site";
export { SITE };

export const ORG = {
  "@type": "Organization",
  "@id": `${SITE}#org`,
  name: "SAT Markets",
  url: SITE,
  description:
    // Ruling 3. Structured data is read by a crawler with no page around it to
    // qualify the claim, so the organisation describes itself by what it is and
    // by the one credential that is evidenced.
    "Commercial real estate exchange for Saudi Arabia. Powered by SAT Real Estate (REGA FAL licence 1200025510). Open to the market.",
  parentOrganization: {
    "@type": "Organization",
    name: "SAT Real Estate",
    url: "https://www.satestate.com",
    identifier: "REGA FAL 1200025510",
  },
  knowsLanguage: ["ar", "en"],
};

/**
 * The site itself, and the one query the site can actually answer.
 *
 * Finding 36. `SearchAction` was withheld until the search box did something: a
 * declared search endpoint that returns the same unfiltered page for every term is
 * a claim the platform cannot honour, and the discovery parser is what makes it
 * true. The target is the listings route because that is the only surface that
 * narrows on `q`.
 *
 * The locale is baked into the URL rather than negotiated, so the schema is emitted
 * per locale from the locale layout and each one points at its own language. The
 * `inLanguage` field is what stops the Arabic document advertising an English entry
 * point, which is the same parity rule every other head field on the site follows.
 */
export const website = (locale: "en" | "ar") => ({
  "@type": "WebSite",
  "@id": `${SITE}/${locale}#website`,
  url: `${SITE}/${locale}`,
  name: "SAT Markets",
  inLanguage: locale === "ar" ? "ar-SA" : "en",
  publisher: { "@id": `${SITE}#org` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE}/${locale}/listings?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});
