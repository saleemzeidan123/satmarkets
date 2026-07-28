# Paseetah (بسيطة) competitive dossier

Deep investigation of https://paseetah.com/ and its sister product https://paseet.ai/,
commissioned after the owner identified Paseetah as "doing the data part that we want
to do in SAT Markets".

Everything below is split into FACT (observed directly, with the source) and
INFERENCE (my reading of what it means). Where a source could not be reached, that is
said plainly rather than filled in.

## 1. The one thing that matters

FACT. Paseetah publishes its own data attribution on its marketing site, in Arabic:

> بيانات دقيقة من وزارة العدل والسجل العقاري وشبكة إيجار والعديد من المصادر

"Accurate data from the Ministry of Justice, the Real Estate Registry, the Ejar
network, and many other sources."

INFERENCE. That sentence is the whole moat, and it is not a moat. Every named source
is a public Saudi government data product that SAT Markets can obtain on identical
terms, through the same official channels, without a partnership, without a licence
Paseetah holds and we do not, and without scraping anything. No REGA FAL licence, no
MOU, and no official data partnership could be found anywhere for Paseetah. They were
first, not privileged.

The corollary is the actual finding: **being first to aggregate public data is worth
very little once a second party aggregates it and explains its method.** Paseetah has
published zero methodology. That is where we beat them, and it is a position they have
already vacated.

## 2. The company

| Item | Value |
| --- | --- |
| Legal name | PASEETAH SOLUTIONS TECHNOLOGY COMPANY (شركة بسيطة حلول التقنية) |
| Address | Building 8604, Othman Bin Affan St, Al Nuzha, Riyadh 12474 |
| CEO | Omar Alomar |
| Headcount | roughly 20 |
| LinkedIn | slug `paseetah-spv-ltd` |
| Funding | none found |
| Accelerator | none found |
| Press coverage | none found |

INFERENCE. A self-funded, roughly twenty-person Riyadh product company with no press
and no visible institutional backing. They move on product cadence, not on capital.
That means they can ship faster than a funded competitor would expect, but they cannot
buy an exclusive data position, and they have no war chest to win a price war they are
already pricing into.

## 3. What they actually sell

FACT. Two products, one company.

**Paseetah** is the consumer and small-professional app: a map of Saudi real estate
with transaction history, valuation estimates, and property reports. Apple
`id6445990165`, Google Play `com.paseetah.app`, 5,000+ installs, 4.1 stars across 32
reviews.

**Paseet** (paseet.ai) is the newer enterprise play, marketed as "Saudi Arabia's first
real-estate AI". Apple `id6756920195`, Play `ai.paseet.app`, 50+ installs. Clients
displayed on the site: NHC, ROSHN Group, Mohammad Al-Habib Holding, Almajdiah, and PIF.

Pricing, as published:

| Plan | Price (SAR) |
| --- | --- |
| Starter | 90.99 |
| Professional | 344.99 |
| Expert | 519 |
| Property Report (one-off) | 49.99 |
| Paseet Plus | 33.49 |

INFERENCE. Paseet is the larger threat, not Paseetah. Paseetah is a consumer map with
a five-thousand-install footprint. Paseet is selling an AI advisory layer to exactly the
counterparties SAT Markets wants: the master developers and the sovereign owner. Their
client wall overlaps our intended advisory positioning directly. Fifty installs says the
enterprise product is early and the logos may be pilots or design partners rather than
revenue, but the logos are real placement and they got there first.

## 4. Where their data comes from, source by source

FACT, with the official channel for each. Every one of these is available to us.

| Source | What it carries | Official channel |
| --- | --- | --- |
| Ministry of Justice open data | Transaction records, deed-level sale data | moj.gov.sa/ar/opendata, Power BI reports, and a custom data-request form at moj.gov.sa/ar/OpenData/Pages/Request.aspx |
| REGA indicators | Neighborhood-level real-estate indicators | rei.rega.gov.sa |
| Ejar rental index | **Commercial price per sqm for shops, showrooms and offices, six cities including Riyadh, back to 2019** | sakani.sa/reports-and-data |
| GASTAT REPI | Real-estate price index, with a published methodology document | gastat |
| CMA / REITs | Listed real-estate vehicle disclosures | cma |
| MOMAH idle lands | White-land inventory | momah |
| open.data.gov.sa | Cross-government datasets under an attribution licence | open.data.gov.sa |

The Ejar line is the one to read twice. The commercial rent index that SAT Markets
needs as the spine of its own Rent Index is already published, already segmented by
shops, showrooms and offices, already covers Riyadh, and already runs back to 2019.

INFERENCE. We do not have a data acquisition problem. We have a data ingestion,
attribution and presentation problem, which is a build problem with a known shape.

FACT and a hard boundary. Some MOJ surfaces (srem.moj.gov.sa, the Najiz UIs) were not
reachable and are interactive portals, not data products. Those must be requested
through the official open-data channel. **We do not scrape Najiz or srem.** That is both
a legal exposure and precisely the shortcut a verification-first exchange cannot be
caught taking.

## 5. Their weaknesses, ranked by how usable each one is against them

1. **Zero published methodology.** Nothing explains how an estimate is produced, what
   period it covers, or what the source is. For a market where a wrong number moves a
   lease, this is the soft centre.
2. **No supply side at all.** They are a data product, not a marketplace. There is no
   listing, no owner, no broker, no transaction path. SAT Markets is a two-sided
   exchange with data attached; they are data with nothing attached.
3. **Commercial real estate is shallow.** The CRE layers are essentially commercial
   land. Offices, showrooms and retail units as leasable space are not modelled.
4. **Everything is login-gated.** paseetah.com/map requires authentication, so they have
   no public data surface, no indexable content, and no SEO position on any Saudi CRE
   query.
5. **Login failure is the top complaint in both stores.** The most common negative
   review on Apple and Google is not being able to get in.
6. **App Store metadata lists English only** for an Arabic-first product.
7. **Staging is publicly indexed.** stg.paseetah.com is reachable and crawlable.

INFERENCE. Points one and four combine into the opening. They gated their data and
published no method, which means a competitor who does the opposite (open the numbers,
publish the method, attribute every figure) occupies a position they have structurally
abandoned rather than one they are defending.

## 6. The rest of the field

| Player | Position |
| --- | --- |
| Aqarsas (aqarsas.sa) | Since 2016, explicit MOJ open-data basis, has a public API page. The closest thing to a serious data incumbent. |
| Suhail / البورصة العقارية | The Ministry of Justice's own product. Sets the floor for what "official" looks like. |
| Aqar (aqar.fm) | The dominant listings portal, has now added deal data. The one that could pincer us from the marketplace side. |
| Wasalt, Bayut SA | Listings portals, residential-weighted. |
| REGA / GASTAT dashboards | Official, authoritative, poorly presented. |

INFERENCE. The genuine strategic risk is not Paseetah adding listings. It is Aqar
adding data, because Aqar already owns the supply side and the traffic. Paseetah is the
warning; Aqar is the clock.

## 7. What SAT Markets should do

Ordered, and each one is a thing we can start.

**Ingest MOJ open data through the official channel.** Use moj.gov.sa/ar/opendata and
the custom data-request form. Never scrape Najiz or srem. Log the request and the
licence terms in the source registry the way rega_ejar is already logged.

**Ingest the Ejar commercial rent index from sakani.sa/reports-and-data.** This is the
highest-value single action in this document. It is the commercial series, it covers
Riyadh, it goes back to 2019, and it is published. It becomes the evidence behind the
Rent Index context line we now show on every listing.

**Publish a public, un-gated, bilingual monthly Riyadh CRE bulletin, with the full
methodology attached.** This is the direct counter-move. It takes the position Paseetah
abandoned, it is the only thing on this list that compounds, and it is the reason a
broker cites us instead of them. It also gives the site a public data surface, which is
currently the thing our own noindex prototype most conspicuously lacks.

**Build verification on RER deed checks under our FAL licence 1200025510.** This is the
one thing they cannot copy quickly. Their data says a transaction happened. Ours says
this owner is this owner. That distinction is the whole product.

**Do not fight on price.** SAR 49.99 for a property report is a consumer price point.
Competing there gets us a consumer product we did not want and margins we cannot fund
verification from.

## 8. What could not be reached, and why

Stated so the gaps are not mistaken for absences. The web-content restriction in force
means a blocked fetch is not retried by other means, and none of these were.

Paseetah SPA page bodies (terms, privacy, FAQ, whatsnew, get-deed-data), Crunchbase,
LinkedIn, follower counts on X, Instagram and TikTok, srem.moj.gov.sa, and the
open.data.gov.sa licence text.

One item is worth a human look: an **Etimad tender detail page** surfaced that appears to
involve Paseetah, but it is CAPTCHA-gated and was not opened. If Paseetah holds a
government contract, that page is where it would show. Worth checking manually, since a
public-sector contract would be the one thing in this dossier that is genuinely not
copyable.

## 9. Bottom line

They are not ahead of us on data. They are ahead of us on shipping, and behind us on
everything that makes a real-estate number trustworthy: no methodology, no verification,
no supply side, no public surface. Their attribution sentence is a list of doors we can
walk through today. The plan is to walk through them, and then do the thing they chose
not to do, which is show our work.
