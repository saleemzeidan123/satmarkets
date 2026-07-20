# Competitive research — feature adaptation notes

Status: pre-launch. Everything below is product direction, not yet built.
Lens for every item: SAT is a **verified, neutral, commercial** exchange for KSA.
Neutrality (SAT represents neither side), SAT-owned verification, FAL licence, and
"AI never invents figures" constrain what we adopt. Never call a development a "district".

---

## 1. OSUS (osus.com.sa) — residential developer, own inventory

Reviewed the listing grid, synced map, cards, compare flow (tray → dedicated
`/compare` table), advanced filter panel, and the full property detail page
(gallery, facts grid, payment plan, register-interest form, similar-listings carousel).
Pressure-tested the takeaways with Fable (adversarial advisor).

### Decision: ADOPT

- **Commercial filter/search set — the real differentiation lane (TOP PRIORITY).**
  OSUS filtering is only City/Type/Bedrooms/Price; their "advanced" panel was empty.
  A serious commercial user needs far more. Build data-disciplined (scope to fields
  that are reliably populated; **blanks included-by-default, never hard-excluded**).
  KSA commercial dimensions:
  - Top-level **lease vs sale** toggle (fundamental, must not be buried).
  - Location granularity: **city → district (hayy) → corridor/road** (biggest value
    driver in Riyadh CRE).
  - Asset-subtype specifics: showroom/معرض on main road; warehouse clear-height +
    loading docks + **cold storage**; office single- vs multi-tenant; land
    **zoning / permitted use**.
  - Fitted / semi-fitted / white-box / **shell-and-core** (not binary).
  - **Tenure**: freehold / leasehold / usufruct (hikr) — objective, matters in KSA
    incl. foreign-ownership rules.
  - **Trust facets as filters** (not just badges): FAL-licensed lister, verified,
    Ejar/REGA-registered.
  - Standardize and **label the area basis** (BUA vs GLA vs NLA + load factor) — turn
    a common KSA dispute source into a trust differentiator.

- **PDP facts-grid tiles** (icon tiles: area/floor/parking/grade/etc.). Renders the
  existing `ASSET_FIELDS` registry directly — same registry work as filters, ships
  together. Underrated / foundational.

- **Floor-plan / stacking-plan as gallery co-hero + lightbox.** Docs already stored;
  mostly gallery config. Decision-grade for commercial.

- **Similar-listings carousel** on the PDP (query by type + geo + price band).
  Ship it **without** the compare checkboxes.

- **Map clustering** at low zoom (near-free config). Bigger idea: **draw-to-search by
  district polygon** beats pin cosmetics for CRE — prioritize boundaries over pins.

### Decision: KILL / CUT (includes correcting my own earlier proposals)

- **Per-row "winner highlighting" in compare — KILLED PERMANENTLY.** A neutral
  exchange cannot algorithmically declare one listing the winner (bias grievance from
  every lister who never lights up; editorializes on unverifiable fields; "cheaper =
  better" is an investment judgment). Keep the *math* (price/sqm, rent/sqm) as neutral
  facts shown in every column; highlight nothing.
- **Cap rate / NOI filters — CUT for launch.** Confidential, mostly blank pre-launch
  ("AI never invents figures"), and publishing a yield is advice-adjacent liability.
  Let investors compute their own from asking price + area + asking rent.
- **Grade A/B/C** — soft self-declared tag only, never a ranked hard filter (no
  certified KSA grading authority).
- **Inline lead-capture form** — skip; undercuts the verified-enquiry / neutrality
  model. (Replacement = the structured verified-enquiry path, a separate workstream.)
- **Residential payment-plan module** — skip (off-plan developer furniture).

### Decision: PARK

- **`/compare`** stays a noindexed stub. Revisit **after launch** with real inventory
  and users — facts-only (no highlighting), no saved-listings tie-in yet.
- **Off-market/exclusive** scaffolding stays dormant.

### What OSUS could NOT teach us (Fable's addition — the real pre-launch priority)

Buy-side polish is the wrong half to obsess over pre-launch. Existential items:
1. **Supply side**: frictionless listing creation + the verification/identity flow
   that *is* the brand + lister dashboard (+ likely broker bulk upload).
2. **Verified-enquiry path**: verified occupier → structured enquiry → routed to
   lister with SAT as neutral, audited intermediary (the trust-grade version of the
   inline form we're skipping).
3. **Provenance & freshness**: "last verified" dates, FAL number, listing expiry /
   relisting. CRE portals die of stale listings; a trust brand dies faster.
4. **Data-completeness strategy**: listing completeness score that nudges listers +
   graceful blank-field handling in filters (decides whether filters feel
   world-class or broken).
5. **Saved-search alerts** to warm demand pre-launch (better use of the saved-search
   foundation than compare) — launch with a warm list, not an empty hall.
6. **Bilingual canonical values** for district names + asset types, or filters
   silently fracture across AR/EN.

### First move (agreed)

Data-coverage audit of `ASSET_FIELDS` (which fields are actually populated across
sample listings) → then build **filter set + PDP facts grid** on the reliably-populated
fields. Same registry work, ships together, hits the core discovery loop.

Do NOT build `/compare`, winner-highlighting, cap-rate/NOI, or map pin cosmetics yet.

---

## 2. Property Finder (propertyfinder.ae) — large multi-lister commercial+residential portal

Walked the broker/agency profile (Knight Frank Commercial), the Agents roster, the
search + full Filters drawer, and a listing PDP end-to-end. Pressure-tested the
judgment calls with Fable.

**The neutrality line (Fable, verbatim principle):** SAT may publish facts that are
true *of* a lister; SAT may NOT publish a judgment *about* a lister. Verification
answers "is this real?" (on-brand). Rating answers "is this good?" (off-brand — SAT
becomes scorekeeper for the people who pay to be on it).

### Decision: ADOPT (cheap, pre-launch)

- **Broker/agency VERIFICATION PROFILE — the sleeper, and the one item that changes the
  plan.** Not PF's vanity roster — a *factual dossier* and the proof-surface of the whole
  brand: SAT-Verified status, FAL licence number, CR number, established-since, real
  active-listings count. Double duty: the supply side's verified storefront (reason to
  list) + the demand side's trust anchor. It's a direct **output of the verification flow
  we're already building** → promote it into the supply-side workstream as first-class.
- **Licence-number display with a "what is this?" tooltip** (PF shows broker ORN this way).
  PF's single most on-brand-for-SAT feature — copy aggressively (FAL licence, prominent).
- **Freshness: "listed / last-verified X days ago"** on cards + PDP (already roadmapped).
- **Report-this-listing** link — governance-as-trust made visible; cheap; signals SAT
  actively polices the exchange.
- **Sticky in-page PDP section nav** (Gallery/Description/Facts/Location/Provided-by).
  Trivial polish; build it in the same workstream as the facts-grid PDP.
- **Live result + facet counts** ("Show N results" on apply; location chips with counts).
  Honest UX; ties to the blanks-included-by-default filter discipline.
- **Steal the CONTACT CTA prominence, not the routing.** PF wires Call/WhatsApp straight
  to the agent. SAT keeps everything routed through the **verified enquiry** — but makes
  that CTA fat, sticky, one-tap, pre-filled (WhatsApp-grade immediacy). Consider a
  SAT-mediated real-time chat channel (SAT can see it) to close the speed gap without a
  side door.

### Decision: PHASE 2 / GATED (not pre-launch)

- **Market data — transactions history + price trends** (PF's real moat, from DLD open
  data). Most brand-aligned feature of all ("we don't invent figures — here's the official
  registry"). KSA analog = REGA transaction index / Ejar rental registry / Suhail. Trap is
  **coverage, not liability**: KSA *commercial* transaction data is thinner/less liquid than
  DLD residential, and commercial is the whole game — a sparse panel looks worse than none.
  Pursue as phase-2, **gated on a commercial-specific licensing + coverage audit**.
  Present-only, every figure **source-stamped**, never editorialized (chart "prices +8%"
  ok; "good time to buy" never).
- **Upfront-costs — only reframed as a static "statutory fees reference"** (published RETT
  rate, Ejar/registration fees, typical commission ranges — all sourced). NOT a personalized
  projection ("your number" = advice-adjacent liability). Not pre-launch.
- **SEO cross-link blocks** (PDP-bottom internal links). Zero value while noindexed, but
  **build the URL/taxonomy structure now** so it's a switch-flip at launch. Design-for,
  don't build.

### Decision: KILL (neutrality / advice breaches)

- **"SuperAgent" / any performance TIER** — SAT anointing its own paying listers.
- **Per-agent / per-broker STAR RATINGS** — SAT editorializing a ranking of paying listers;
  also a defamation / review-gaming surface; invites unwinnable "why is my rival higher"
  disputes.
- **Awards / "Top" / "Featured" merit dressing.**
- **Default sort by a performance metric** — a *hidden* endorsement. Keep **default sort
  neutral** (recency / relevance); performance sorts must be user-chosen.
- **Rent-vs-Buy calculator** — emits a buy/sell recommendation (= the financial advice SAT
  disclaims) and only works by SAT inventing assumptions (discount rate, appreciation).
  Violates both core rules at once.
- **Raw direct agent Call/WhatsApp** — dissolves the mediated model; leaks deals
  off-platform (the disintermediation that kills portals); SAT can't stand behind an
  off-platform conversation.

### Decision: PREMATURE (revisit after supply exists)

Agent rosters / per-agent cards (no agent-level accounts yet, and drifts toward ratings);
virtual-tour filter and keywords free-text filter (both return empty against thin data);
save-search alert *bell placement* (delivery already roadmapped — placement is trivial
copy, not a priority lever); "Partner Hub" as a product (a whole second lister-tooling
surface).

### Net effect on the plan

**No reprioritization.** PF confirms and sharpens the OSUS plan. Its one genuine
differentiator (market data) sits *downstream* of the provenanced-facts spine already
prioritized, so it's a phase-2 extension, not a pivot. The single change PF earns:
**promote the broker/agency verification profile into the supply-side workstream as a
first-class deliverable** (same verification flow, now with a trust proof-surface attached).

**Priority stays:** supply-side (listing creation + verification, now incl. the verified
profile) + commercial filter set + PDP facts-grid, on top of the `ASSET_FIELDS`
data-coverage audit.

---

## 3. Data-coverage audit — ASSET_FIELDS vs. real listing data

Ran against the live DB (93 listings). This decides which fields can back a filter/facts
tile *now* vs. which would return near-empty results.

**Inventory (93 listings, office-heavy):** office 37 (25 lease / 12 sale), retail 17,
medical 10, warehouse 8, serviced 7, showroom 6, land 3, education 3, mixed_use 2.
(No gas_station / entertainment data yet; those registry families are dormant.)

### Headline finding: typed columns are populated, the jsonb `attributes` bag is nearly empty

The registry defines dozens of rich per-asset fields that live in `attributes` jsonb —
but the sample data barely fills them. Only office/retail/warehouse have **any** jsonb
attributes, and only on ~2–4 listings each. **medical, serviced, showroom, education,
land, mixed_use have ZERO jsonb attributes** — including registry-**required** defining
fields (land_use + deed_type for land; clinic_rooms for medical; suite_type + price_basis
for serviced; premises_type for education). So every jsonb-based field (frontage,
floor_plate, ceiling_height, deed_type, land_use, clinic_rooms, clear_span, …) is **not
viable as a filter or facts tile yet** — it would render empty.

### Reliably populated (BUILD filters/facts on these — all typed columns)

- `asset_type` 100%, `deal_type` (lease/sale) 100% — the top-level toggle. Solid.
- `area_sqm` 100% — core size filter.
- `district_id` **100%** — the single best location facet; city→district filtering is
  fully viable now. (`building_id` only 16/93, so multi-tenant/stacking is thin.)
- `asking_rent_sqm` ≈100% of *lease* listings; `sale_price` 100% of *sale* listings —
  price/rent filter works if scoped by deal_type.
- `building_grade` — real grades (a/a_plus/b/c) for office, retail, medical; explicit
  `n_a` where not applicable (all land = n_a). Honest, not defaulted. Scope the grade
  filter to asset types where it's real.
- `fitout_condition` — real for most; `n_a` for land. Usable.
- `parking_ratio` — good for office (36/37), retail, medical, serviced, showroom; absent
  for warehouse/land/education.
- Warehouse technical set — `clear_height_m`, `loading_docks`, `power_kva`,
  `civil_defense_approved` all **8/8 (100%)** for warehouse, zero elsewhere (correct).
  Strong warehouse-specific filters/facts.

### Sparse — facts-only-if-present, do NOT filter yet

`service_charge_sqm` (office 13/37, retail 3, medical 3, else 0), `lease_term_months`
(sparse), and every jsonb field above. `rent_free_months` is 100% but almost certainly
default 0 — treat as fact, not filter.

### Data-integrity gaps (prerequisites, flagged)

- **`geom` only 54/93 (~58%).** ~42% of listings have no geometry → they silently
  vanish from the map, clustering, and any draw-to-search. Backfill from district/address
  before leaning on the map. (`lat`/`lng` columns are unused/all-null — map reads `geom`.)
- **jsonb attributes missing for the six newer asset types**, incl. required fields.
  Those asset types can't render a meaningful facts-grid until the seed/intake actually
  writes `attributes`. Fix the seed (or confirm intake persists attributes) first.
- **`floorplan_url` ~3/93, `video_url` 2/93.** Floor-plan-as-hero and any media-richness
  / virtual-tour filter are data-starved — confirms parking those (Fable was right).
- **`expires_at` 0/93** → listing-expiry feature has no data. But `availability_confirmed_at`
  89/93 and `published_at` 92/93 → **"listed / last-confirmed X ago" freshness IS viable**.
- Trust surface is well-fed: `ad_permit_no` 92/93, `ownership_verified` 92,
  `authorization_verified` 92, `right_to_market_confirmed` 93, `verified_at` 50 →
  the **broker verification profile + permit/licence display have real data to build on**.

### Verdict — first build slice, data-backed

Ship the **filter set + facts-grid on the universal typed columns** (asset_type, deal_type,
area, district, rent/price, grade, fitout, parking) **+ the warehouse technical four**,
blanks included-by-default. **Defer everything jsonb-based** until attributes are actually
populated. Two data fixes are prerequisites: **backfill `geom` (54→93)** for the map, and
**backfill the missing `attributes`** (esp. required fields) for medical/serviced/showroom/
education/land/mixed_use. Freshness and the verification profile both have the data they
need today.
