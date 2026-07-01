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

export const SITE = "https://satmarkets-sat-markets.vercel.app";

export const ORG = {
  "@type": "Organization",
  "@id": `${SITE}#org`,
  name: "SAT Markets",
  url: SITE,
  description:
    "Verified commercial real estate exchange for Saudi Arabia. Powered by SAT Real Estate (REGA FAL licence 1200025510). Open to the market.",
  parentOrganization: {
    "@type": "Organization",
    name: "SAT Real Estate",
    url: "https://www.satestate.com",
    identifier: "REGA FAL 1200025510",
  },
  knowsLanguage: ["ar", "en"],
};
