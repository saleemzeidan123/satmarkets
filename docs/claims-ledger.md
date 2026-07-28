# Claim and evidence ledger (WS02)

Every material public promise, with owner, evidence and state. No new material
claim ships without an entry here. States: Supported | Unsupported, replacement
pending approval | Removed | Preview-qualified.

| # | Surface | Current claim (EN / AR) | State | Evidence and action |
| --- | --- | --- | --- | --- |
| C1 | Home | "No one else in the Kingdom brings all four together" | Unsupported, replacement pending approval | Comparative claim with no market survey. Codex-approved replacement: "Four connected capabilities in one preview". WS11/WS15. Owner: Saleem. |
| C2 | Home | "Sourced, never estimated" | Unsupported, replacement pending approval | Conflicts with representative figures elsewhere. Replacement: "Source-attributed where data is available". |
| C3 | Home | "Live market board" | Unsupported, replacement pending approval | Inventory is seed data. Replacement: "Market preview with sample data" once Saleem approves preview-state wording (WS05). |
| C4 | Home/Listing | "Owner-verified" KPI and badge | Unsupported as worded | Calculation includes broker authorization and SAT-listed rows. Split rendering per verification policy decision (register rank 3). |
| C5 | Pricing | "Browse & enquire, free forever" | Unsupported, replacement pending approval | Perpetual commercial promise. Replacement: preview-period wording; whole page pending pricing-visibility decision. |
| C6 | Home map | "Buildings across the Kingdom are clickable" | Unsupported, replacement pending approval | Coverage is Riyadh sample. Replacement: "Explore sample commercial locations in Riyadh". |
| C7 | Deal | "Full deal" / SAT "track(s) the deal" | Unsupported, replacement pending approval | Replacement: deal workspace language (WS28). |
| C8 | About | "We check the person, the property, and the licence" | Unsupported as universal | Replacement: badge-specific scope wording. |
| C9 | Rent Index | Attribution to REGA Rental Index (Ejar), averages of registered contracts, Q2 2026 | Supported | rent_index_published (period 2026-Q2, sufficient=true) + source_registry.rega_ejar (averages, attribution licence). PKG-0A aligned both locales. |
| C10 | Footer | FAL 1200025510, operated by SAT Real Estate | Supported | Licence number per Law 1. |
| C11 | Footer | SATMARKETS.SA | Removed | Domain not acquired. Removed in PKG-0A; law test guards regression. |
| C12 | Global | Preview notice: sample data for testing, not live inventory | Supported | dict chrome.preview, both locales. Keep until real inventory. |
| C13 | Invest | "underwritten on verified comparable transactions" / "مُحلَّل على صفقات مقارنة موثّقة", and "Comps drawn only from verified SAT-advised transactions, no asking prices, no scraped figures." | Removed | No SAT-advised transaction record exists behind any row. Replaced with the wording /hbu already carried: "Simulated demonstration. Every comparable, price and cap rate in this table is illustrative and does not describe a real transaction." Owner ruling 3. Guarded by `src/lib/claims.test.ts`. |
| C14 | Invest | Potential NOI of SAR 4,583,333 and a going-in cap rate of 6.8%, the latter described in source as "the verified comp cap rate" | Removed | Both were compiled constants presented as findings, and the 6.8% also drove the "at/above district" KPI note against a district benchmark no query produced. Both are now user inputs with starting values, in the same class as acquisition price and leverage, so the model does arithmetic on the reader's assumptions and asserts nothing of its own. Owner ruling 3. |
| C15 | Invest, HBU | Named comparables: Olaya Tower, Al Akaria Plaza, Tahlia Gate, Granada Oasis, and their Arabic counterparts | Removed | Real Riyadh buildings carrying a price and a cap rate with no documented public source and no permission for this use. Anonymised to Comparable A to D with grade and configuration only, identically in both surfaces and both locales. Owner ruling 4. |
| C16 | Invest | Verified tick rendered in the Source column of every comparable row | Removed | Verified green is reserved for evidence-backed verification. The column now reads "Simulated" / "محاكاة", and the `Verified` component is no longer imported by either modelling page. Owner ruling 3. |
| C17 | Invest, HBU | "Last 6 months" filter chip above the comparables table | Removed | Described a recency query over transaction records. No such query and no such records. Key deleted from both dictionaries rather than reworded, so a future page cannot revive it. Owner ruling 3. |
| C18 | Invest | CSV export filename `sat-underwriting-olaya-tower.csv` | Removed | The export leaves the platform and is read without the page around it, so it carried a real building name into a spreadsheet with a full underwriting on it. Now `sat-underwriting-sample.csv`, and the export includes the reader's own NOI and pricing cap as declared inputs. Owner rulings 3 and 4. |

Review cadence: every release touching a listed surface. Last review: 2026-07-28 (owner ruling 3 and 4 corrections, `/invest` and `/hbu`).

Entries C13 to C18 are marked Removed rather than replaced because each was a claim about
evidence that does not exist. A claim of that kind has no honest weaker wording: the
correction is to stop making it, state what the surface actually is, and let the claim
return through the evidence path when a record supports it.
