# Roadmap reconciliation gate

Written under Codex relay item 5 of 2026-08-02: before another broad engineering or
"elite" package is opened, produce one no-code reconciliation against all 37
workstreams in the original enhancement plan, all six end-to-end journeys, the
current status ledger and the current findings register. For every item state
Complete, Partial, Blocked, Deferred or Not started, the supporting commit or
document, the remaining user-visible outcome, the blocker or dependency, and the
recommended sequence. Nothing may be labelled Dropped without Saleem's explicit
approval, and nothing here is.

**This document contains no code and proposes no package.** It is a position
statement. The next package is chosen from part G by the owner and by Codex, not by
this file.

Read against: `docs/status-ledger.md` at the commit this ships in,
`docs/findings-register.md` at 205 rows, `docs/decision-register.md` at D1 to D33
plus O1 to O19, `docs/phase1-proposal.md`, `docs/roadmap.md`,
`docs/accessibility-elite-4.md` and `docs/elite-standard-reconciliation.md`.

---

## A. Two things this repository does not contain, stated before anything else

A reconciliation that quietly invents what it cannot find is worse than one that
comes up short, because the invention outlives the gap. Two inputs Codex named are
not recoverable from this repository, and neither is guessed at below.

**Ten of the 37 workstream titles are not recorded anywhere.** A search for the
token `WS<nn>` across every markdown file in the repository returns 27 distinct
numbers. WS21, WS22, WS24, WS25, WS26, WS27, WS32, WS33, WS35 and WS37 appear
nowhere: not in `docs/phase1-proposal.md`, not in `docs/roadmap.md`, not in the
claims, decision, findings or taxonomy registers, and not in any closure document.
The original enhancement plan that named all 37 is not in the repository, and no
document quotes the missing ten even in passing. They are carried below as ten
numbered rows with the title marked "Not recorded", because a workstream whose title
is unknown is still a workstream and deleting the row would be the same act as
labelling it Dropped.

**The authoritative six-journey list is not recorded either.** Four journeys are
named, once, in `docs/accessibility-elite-4.md` line 90, as "Four complete journeys,
as named by Codex", with their surfaces enumerated. Five independent searches were
run for a fifth and a sixth: a numbered-journey regex across all markdown, which
returns 1, 2, 3 and 4 and nothing higher; a search for the phrase pattern "six end
to end journeys", which returns nothing; heading and line greps of the accessibility
document, the elite-standard reconciliation, the roadmap and the strategy
reconciliation, which use the word "journey" in prose but never enumerate six; and a
grep of `docs/research/`, which returns nothing. Part C therefore reconciles the four
named journeys against evidence and then names two candidates from the product's own
surfaces, marked as candidates rather than as the missing two.

Both gaps are owner inputs. They are listed in part H.

---

## B. The status vocabulary, so the labels mean one thing

| Label | What it asserts |
| --- | --- |
| **Complete** | The user-visible outcome exists on the deployed build, and the evidence for it is recorded. Nothing further is owed on this workstream at E0 |
| **Partial** | Real work has shipped and a stated part of the outcome is still missing. The missing part is named in the row, not implied |
| **Blocked** | Engineering cannot proceed, or may not proceed, until a named external or owner dependency clears. The blocker is named by reference, never as "pending" |
| **Deferred** | Work that could proceed and has been consciously held, with the holder recorded. Deferred is not Blocked and is not Dropped |
| **Not started** | No work has been done. Distinguished from Blocked: nothing external prevents it |

Two labels this document does not use. **Dropped** requires Saleem's explicit
approval and no row here has it. **Closed** is reserved for the findings register,
which has its own status column and its own parse rule.

One counting rule carried from the ledger, because it explains a number that looks
wrong. The register is counted closed when a status string begins "Closed". Rank 113
is deliberately held open against that parse, which is why a naive parse of the file
returns 127 closed and 78 open while the ledger correctly states 126 and 79.

---

## C. The 37 workstreams

Split, as Codex asked, into work a user can see and work a user cannot. The split is
made on the outcome, not on the effort: a workstream is visible if a person using the
product would notice its absence, and foundational if they would not.

### C.1 Visible product work

| WS | Title | Status | Supporting commit or document | Remaining user-visible outcome | Blocker or dependency | Sequence |
| --- | --- | --- | --- | --- | --- | --- |
| WS07 | Design tokens | **Complete** | `docs/design-tokens.md`, `src/styles/sat-platform.css`, PKG-1A | None at E0. Harbor `#3A6EA5` is the single accent and the SATEstate gold is gone from every surface | None | Reopens only if the parked visual-quality package runs |
| WS08 | Bilingual typography | **Complete** | PKG-1A, `docs/pkg-1b-verification.md`, live font evidence | None. Arabic and Latin faces load and render at parity in both directions | The font workflow file is an owner-side install, owner ruling 6, and explicitly does not hold this | Closed. Do not re-run |
| WS09 | Responsive shell | **Partial** | PKG-1B, `scripts/reflow-probe.mjs`, `scripts/responsive-probe.mjs` | The shell holds at 320, 360, 390 and 430 pixels by probe. What no probe has established is whether the product is usable on a physical handset, which is a different claim | The three ELITE-1 mobile seats, M1 to M3, which are now allocated in `docs/research/elite-1-recruitment-sheet.md` and are gated on outreach authorisation | After outreach is authorised. Not before, because the missing evidence is human |
| WS10 | Component system | **Complete** | PKG-1B | None at E0 | None | Closed |
| WS11 | Unit formatter, Arabic month plurals, punctuation lint, claim wording, British English | **Complete** | `docs/pkg-1c-closure.md`, `npm run ar-lint`, `scripts/prose-scan.mjs` | None. Western numerals hold in both languages and the lint gates run on every package | None | Closed, and enforced by gate rather than by review |
| WS12 | Metadata factory and WebSite schema | **Partial** | `docs/pkg-1c-closure.md` | The metadata is correct and the site is `noindex, nofollow` site-wide, so none of it reaches a search engine. The outcome is built and not yet visible to anyone outside the preview | Owner ruling 1 parks indexing, and O11 holds the question of which surface lifts the noindex | Deliberately last. Ruling 1 says do not spend time here except to prevent regressions |
| WS14 | PWA app mode | **Partial** | PKG-1D | Installability and offline shell exist. Whether they are worth anything is a mobile question and no mobile session has run | Same as WS09 | With WS09, after mobile evidence |
| WS15 | OG and Twitter images, claim wording | **Partial** | findings register, WS15 rows | The images render and the claims on them are within the ledger. They are only seen when a link is shared, and the site is unshared by policy | Owner ruling 1 and the release policy | With WS12 |
| WS16 | Server-side search, gating SearchAction | **Complete** | `docs/pkg-2a-plan.md` | None. `q` is read server-side and SearchAction is gated on it | None | Closed |
| WS17 | Title and district agreement, display-rule split | **Complete** | `docs/taxonomy.md`, findings register | None. Developments are not districts, and the display rule is separated from the data rule | None | Closed |
| WS19 | Kind-aware location route, district parameter rename, map controls | **Partial** | `docs/pkg-2a-plan.md`, decision register | The route is kind-aware and the raw-slug defect on `/listings?city=riyadh` is closed at `b3e2dfa` in both languages, which was owner ruling 5. Map Phase 2 is the remaining half | Deferred by standing agreement, not blocked | Map Phase 2 sits behind the E1 gate |
| WS23 | Post-requirement wording | **Complete** | PKG-DEM1, PKG-DEM2, findings register | None. The demand entry point no longer rejects its visitors and a requirement's figures are no longer invented | None | Closed |
| WS28 | Deal workspace language | **Blocked** | `docs/claims-ledger.md` claim C7 | There is no deal workspace. The language for one exists and the surface does not, which is the single largest visible gap between this product and the stated objective of a transaction operating system | O14, who inside an organization may bind it or release contact details, and O12 for anything that would notify a counterparty | The first large visible package after the E1 gate, if the owner ranks transaction preparation above discovery |
| WS29 | Pricing visibility | **Blocked** | `docs/claims-ledger.md` claim C5, decision O1 | The pricing page states a position the owner has not ruled on: labelled concept, or hidden until real | O1 | Ruling O1 is cheap and unblocks a whole page. Rank it early among owner items |
| WS31 | Entity schema verified fields, kind-aware entity pages, default locale | **Partial** | decision register O4, O6, O7, findings 14 and 32 | Entity pages render and the verified fields are evidence-backed. The production default locale is unruled, which is why findings 14 and 32 stay open and why `x-default` has no settled target | O4, and O6 for anything a licensed dataset would fill | O4 is a one-sentence owner ruling. Rank it with O1 |

### C.2 Foundational work

| WS | Title | Status | Supporting commit or document | Remaining user-visible outcome | Blocker or dependency | Sequence |
| --- | --- | --- | --- | --- | --- | --- |
| WS01 | SAT Markets laws, enforced register | **Complete** | `docs/LAWS.md`, `sat-markets/CLAUDE.md`, the gate command set | None directly. Every visible outcome depends on it | None | Closed and permanently in force |
| WS02 | Claim and evidence ledger | **Complete** | `docs/claims-ledger.md` | None directly. It is what stops an unsupported sentence reaching a page | None | Closed. It gains rows, it does not reopen |
| WS03 | Route and state map | **Complete** | `docs/routes.md` | None | None | Closed |
| WS04 | Entity and taxonomy model | **Complete** | `docs/taxonomy.md`, `src/lib/locationKind.ts` | None | None | Closed |
| WS05 | Release-state vocabulary | **Complete** | decision D11, `src/lib/releaseState.ts`, six bilingual states | None. It is why a preview surface can say what it is | None | Closed |
| WS06 | Package evidence template | **Complete** | `docs/evidence-template.md` | None | None | Closed |
| WS13 | Shared data-state pattern and freshness thresholds | **Partial** | decision D17, findings register | The pattern is shared and the thresholds are set. O16 holds whether availability freshness keeps the reserved green, so one colour currently carries two unrelated meanings on one card | O16 | Rule O16 with O1 and O4. It is a labelling decision, not a build |
| WS18 | Freshness thresholds, display-rule split | **Partial** | `docs/taxonomy.md`, findings register | Same residue as WS13 | O16 | With WS13 |
| WS20 | Licensed market datasets | **Blocked** | decision register O6, O10, O13 | Every derived Rent Index figure. `decidePublicQuote` withholds it from the browser, the API, metadata, structured data and the assistant, and will continue to until O10 is unanimous across all ten clauses. Nine answered is unresolved | O10, O13, and owner ruling 7 which forbids representing that a data right exists | Owner and counsel. No engineering sequence exists until the right does |
| WS30 | Legal wording and counsel | **Blocked** | decision O2, O5, finding 9 | Terms, Privacy and Contact carry COUNSEL placeholders. This now also gates half of the O18 withdrawal ruling, because a manual privacy request has nowhere to land until `/contact` is real | O5, and no Saudi counsel memorandum is commissioned | **Highest-value owner unblock in this document.** It clears finding 9, unblocks the O18 manual route for every already-posted requirement, and removes a placeholder from three public pages |
| WS34 | Dependency patching and Content Security Policy | **Complete** | findings register, WS34 rows | None | None | Closed, and re-run on dependency alerts rather than on a schedule |
| WS36 | GitHub Actions CI and claim-ledger enforcement | **Blocked** | findings register, `docs/owner-actions-adv-1c1.md` | None visible. The gates run by hand on every package instead of on every push, so the risk is a future push that skips them, not a current defect | The deploy token has no `workflow` scope and `.github/workflows/` cannot be pushed from this environment. Owner installs it | Owner-side, small, and already packaged as a file |

### C.3 The ten workstreams whose titles are not recorded

Carried, not dropped. Each is Not started only in the sense that nothing in this
repository can be attributed to it, which is not the same as nothing having been
intended by it.

| WS | Title | Status | Why it is here |
| --- | --- | --- | --- |
| WS21 | Not recorded | **Not started, title unknown** | The token WS21 appears in no file in this repository |
| WS22 | Not recorded | **Not started, title unknown** | As above |
| WS24 | Not recorded | **Not started, title unknown** | As above |
| WS25 | Not recorded | **Not started, title unknown** | As above |
| WS26 | Not recorded | **Not started, title unknown** | As above |
| WS27 | Not recorded | **Not started, title unknown** | As above |
| WS32 | Not recorded | **Not started, title unknown** | As above |
| WS33 | Not recorded | **Not started, title unknown** | As above |
| WS35 | Not recorded | **Not started, title unknown** | As above |
| WS37 | Not recorded | **Not started, title unknown** | As above |

The numbering itself carries one weak signal and it is offered as a signal only. The
recovered titles cluster: WS01 to WS06 are governance and model, WS07 to WS19 are
design, content and route work, WS20 is data rights, WS23 and WS28 to WS31 are
product surfaces, WS34 and WS36 are hardening. The unrecovered numbers fall inside
the product-surface and hardening bands rather than the governance band. That is not
enough to name one of them and none is named.

---

## D. The end-to-end journeys

### D.1 The four that are named

Named in `docs/accessibility-elite-4.md` line 90 and reconciled here against the
findings register and the ledger. The defect figures are the ELITE-4 manual pass:
126 defects across the four, being 7 critical, 41 high, 52 medium, 23 low and 3
cosmetic. All 7 critical and all 41 high are fixed. 78 are recorded and not fixed.

| Journey | Status | Supporting commit or document | Remaining user-visible outcome | Blocker or dependency | Sequence |
| --- | --- | --- | --- | --- | --- |
| **J1. Authentication and organization onboarding** | **Partial** | PKG-A11Y-1 slices B to R, `docs/accessibility-elite-4.md`, ELITE-4 counts 0 critical, 7 high, 12 medium, 11 low, 30 total | A person can register an organisation and reach a dashboard. Nobody outside this project has ever done so, and the two highest-value unknowns are whether a first-time lister completes it alone and whether the Arabic direction holds through the whole flow | Nothing engineering. The evidence is the ELITE-1 seats S1 and S2, which are held for Arabic and scheduled first for exactly this reason | First journey exercised in ELITE-1, by design |
| **J2. Listing Studio and inventory management** | **Partial** | PKG-LS1, PKG-LS2, PKG-LS3, PKG-AV1, PKG-AV2, PKG-SUP1, PKG-SUP2, ELITE-4 counts 2 critical, 9 high, 14 medium, 4 low, 29 total | Inventory management above one listing is built and unverified. PKG-LS2 and PKG-LS3 are both conditionally accepted because every changed screen is session-gated and the only live channel from this environment is unauthenticated GET | Verification, not construction. Two of the three ledger conditional acceptances live here | ELITE-1 seats S3, S4 and S5. Seat S3 is also mobile seat M3 |
| **J3. Search, listing detail and Evidence Passport** | **Partial** | ADV-1, ADV-1C, ADV-1C.1, ADV-1D, ADV-1E, PKG-NM1, PKG-FIG1, PKG-FIG2, ELITE-4 counts 4 critical, 19 high, 16 medium, 3 low, 2 cosmetic, 44 total and the worst of the four | The most complete journey in the product and the one carrying the most recorded defects, which is not a contradiction: it is the most built, so it is the most inspected. The Evidence Passport renders and refuses correctly. What is missing is whether a demand-side reader trusts it | O10 withholds every derived Rent Index figure from this journey, so a reader currently sees an evidence surface with a hole in it where the market context belongs | ELITE-1 demand seats. Mobile seats M1 and M2 both sit here |
| **J4. Requirement creation and matching** | **Partial** | PKG-DEM1, PKG-DEM2, `src/lib/matching.ts`, ELITE-4 counts 1 critical, 6 high, 10 medium, 5 low, 1 cosmetic, 23 total | A requirement can be posted and matched. Registering interest notifies nobody, which is finding 118 and is a ruling, not a defect. Withdrawal of consent has no route, which is finding 193 and now has a ruling but no implementation | O12 holds every external notification. O5 gates the manual withdrawal route. Finding 117's migration is unapplied, so the direct-call path can still file a requirement in a city nobody stated | Finding 117's migration is an owner action already packaged. O18's implementation is sequenced by this document, see part G |

### D.2 The fifth and sixth, which are candidates and are labelled as such

The authoritative list is not in the repository. These two are read off the
product's own surfaces as the journeys that exist in the code and are not covered by
J1 to J4. They are offered so the reconciliation is not silently four-sixths
complete, and they are not presented as Codex's missing two.

| Candidate | Status | Supporting commit or document | Remaining user-visible outcome | Blocker or dependency |
| --- | --- | --- | --- | --- |
| **C5. Market intelligence and research: `/rent-index`, `/research`, `/invest`, the advisor** | **Blocked** | ADV-3A, ADV-3A.1, ADV-3B, ADV-4A, ADV-4B, ADV-5A, ADV-5B, `src/lib/sources/o10.ts` | The interfaces exist and are model-agnostic. No external processing is activated, no dataset is licensed, and `decidePublicQuote` fails closed on every derived figure | O10 unanimous across ten clauses, O13 for the separate analytics and consultation licence, and the unsigned enterprise AI agreement and processing terms. Owner ruling 7 forbids proceeding by assertion |
| **C6. Transaction preparation: viewing request, decision pack, deal workspace** | **Not started** | `docs/claims-ledger.md` claim C7, WS28 | The stated competitive objective ends at "decision pack, transaction preparation". Viewing requests exist. A decision pack and a deal workspace do not | O14 for who may bind an organisation, O12 for anything that would notify a counterparty, and O5 for whatever the workspace would have people agree to |

If either candidate is wrong, replacing it costs one sentence from the owner and
nothing else, because no work has been sequenced against them in part G.

---

## E. The status ledger, reconciled

The ledger's own sections are correct at this commit and are not restated. What
follows is the reconciliation Codex asked for: every open owner outcome, with the
label this document uses.

| Ref | Status | What it holds shut | Cost of leaving it |
| --- | --- | --- | --- |
| O1 pricing visibility | **Blocked on owner** | The pricing page CTA truthfulness | One public page states a position nobody has ruled |
| O2 SAT Markets and SAT Real Estate relationship | **Blocked on owner** | `/neutrality` | A neutrality page that cannot state the thing it exists to state |
| O4 production default locale | **Blocked on owner** | `x-default`, findings 14 and 32 | Two P1 findings held open by one sentence |
| O5 legal wording and counsel | **Blocked on counsel** | Terms, Privacy, Contact, finding 9, and now half of O18 | The single highest-leverage unblock in this document |
| O6 licensed datasets for public display | **Blocked on owner** | Broker overlays stay internal | C5 stays interface-only |
| O7 requirements indexability and requester exposure | **Blocked on owner** | Consent and redaction on the demand side | J4 cannot be opened to search even if ruling 1 changed |
| O8 canonical-law amendments into the knowledge base | **Deferred** | Law drift between repository and knowledge base | Low. Both are currently in step |
| O9 origin of the gstack instruction | **Deferred** | A documentation tidy | None. Recorded so it is not mistaken for an instruction |
| **O10 REGA Rental Index (Ejar) permitted use** | **Blocked on external confirmation** | Every derived Rent Index figure on every channel | The largest single hole in the visible product. Nine of ten clauses answered is unresolved, and the decision fails closed |
| O11 which surface lifts the noindex | **Deferred by owner ruling 1** | Finishing ADV-4 | None at E0 |
| **O12 notification consent basis** | **Ruled held** | Every external channel: email, SMS, WhatsApp, push | Finding 118. Registering interest notifies nobody, and that is correct until ruled |
| O13 REGA analytics and consultation licence | **Blocked on external** | The bulletin, HBU, investment scenarios, PD4 deed checks | C5 again, and PD4 |
| O14 who may bind an organization | **Blocked on owner** | Progressive disclosure and mutual-interest contact release | C6 cannot start |
| O15 Rent Index attribution scope | **Blocked on owner** | Finding 45. A proposed rule is written and awaiting approval | One P1 finding, and a rule already drafted |
| O16 availability freshness colour | **Blocked on owner** | Finding 46's follow-up | One colour carries two unrelated meanings on one card |
| **O17 lawful basis for behavioural measurement** | **Ruled held** | All 46 events. `COLLECTION_AUTHORISED` is a module constant set to false | No product telemetry. The fourteen-item readiness record is written and unrun |
| **O18 anonymous withdrawal identity** | **Ruled and recorded 2026-08-02, implementation sequenced** | Finding 193 | See part G. It is no longer an open question, it is queued work |
| **O19 whether a research round may record** | **Open, new** | Every ELITE round after round one | None for round one, which is now notes only. It becomes a cost if the owner later wants replayable sessions |

Three ledger conditional acceptances carry forward unchanged and are restated here
because they are the difference between "shipped" and "true": PKG-LS2, whose commit
`d2d2fb5` never received its own build and reached production carried by `44a143f`;
PKG-LS3 and finding 11, neither verifiable end to end because both are session
gated; and finding 203, which is engineering-complete and awaiting one interactive
Arabic session that submits an invalid enquiry, a past-dated viewing request and a
missing-city requirement. None of the three is a defect. All three are evidence this
environment cannot produce, because the only live channel here is unauthenticated
GET.

---

## F. The findings register, reconciled

205 rows. 126 carry a status beginning "Closed" by the ledger's parse rule; 79 do
not. By severity, the open rows are 6 at P0, 19 at P1 and 53 at P2, with P3 fully
closed.

| Severity | Open | Rows | What they are, honestly |
| --- | --- | --- | --- |
| **P0** | 6 | 4, 9, 10, 11, 12, 114 | Not six live defects. Finding 9 is O5 counsel placeholders, finding 11 is fixed and awaiting a session-gated verification, and finding 114 is verified on the deployment with a stated corpus qualifier. The genuinely open engineering P0s are fewer than the count suggests, and the count is left honest rather than re-graded to look better |
| **P1** | 19 | 13, 14, 15, 16, 17, 19, 20, 21, 25, 29, 30, 31, 32, 45, 62, 117, 170, 193, 203 | Three are owner-ruling rows in disguise: 14 and 32 fall to O4, 45 falls to O15. One is an owner-applied migration: 117. Two are verification-gated rather than unbuilt: 193 is now ruled and sequenced, 203 is engineering-complete and awaiting an interactive session. That leaves 13 genuine P1 engineering items |
| **P2** | 53 | 37 to 202, listed in the register | The accessibility remainder is the bulk of this. 78 of the 126 ELITE-4 defects were recorded and not fixed, all of them medium, low or cosmetic after every critical and high was closed. They are a backlog with a known shape, not an unknown risk |
| **P3** | 0 | none | Fully closed |

The movement worth recording: P1 fell from 55 to 19 across PKG-A11Y-1, and the gross
figure is larger than the net because 47 rows carry that package in their status
while 13 new findings, 193 to 205, were raised during it and 8 of those were closed
inside it. A package that raises findings while closing them is working correctly.

---

## G. Displacement: is visible work being pushed out by governance?

This is the question Codex actually asked, and it deserves a direct answer rather
than a table.

**Yes, recently, and for defensible reasons that have now run their course.**

Of the packages in ledger section 2, the visible-outcome majority sits early: ADV-2,
PKG-AV1 and AV2, PKG-NM1, PKG-LS1, PKG-SUP1 and SUP2, PKG-DEM1 and DEM2, PKG-FIG1
and FIG2 are all packages a user would notice. The recent sequence is different.
PKG-ELITE-E1 slices A, B, D and F are a status ledger, a durability practice, a
research instrument and an uncollected event dictionary. PKG-A11Y-1 slice A is a
readiness record and a recruitment sheet. The Codex bounded batch items 2 to 4 are
an owner action card, a recruitment kit and a decision write-up. This document is
itself governance.

Two of those were not displacement. PKG-ELITE-E1 slice E and PKG-A11Y-1 slices B to
R are the accessibility pass and its remediation: 126 defects found across four
journeys, all 7 critical and all 41 high fixed. That is visible product work by any
honest reading, and it is the largest single quality improvement in the product's
history. Finding 203 is closer to the line: bilingual refusal messages are hardening
by motivation and visible by effect, because an Arabic reader currently meets an
English error sentence and after the fix does not.

What was genuinely displaced, and by how much, is legible in part C. **Every single
visible workstream still marked Partial or Blocked is waiting on something other
than engineering time.** WS09 and WS14 wait on mobile evidence, which waits on
outreach authorisation. WS12 and WS15 wait on owner ruling 1. WS28 waits on O14.
WS29 waits on O1. WS31 waits on O4. WS20 waits on O10. Not one of them is waiting
for a builder to be free.

That is the finding this gate exists to produce, and it inverts the usual concern.
The risk is not that governance is eating the roadmap. The risk is that **there is
very little unblocked visible work left at E0**, and that opening another broad
engineering package would mean building depth into journeys that no external person
has ever attempted. The product has 50 preview listings, 6 requirements and 0
registered interests. The binding constraint is not code and it is not this
document. It is that the E0 to E1 gate is a design-partner alpha and nobody has been
contacted.

**Recommended sequence, in the order that removes the most block per unit of owner
effort.**

1. **Authorise ELITE-1 outreach.** Nothing engineering stands between one sentence
   and the first screener call. It unblocks WS09, WS14 and the verification half of
   J1, J2, J3 and J4 simultaneously. The recruitment kit is corrected and ready.
2. **Rule the four cheap owner decisions in one sitting: O1, O4, O15, O16.** Between
   them they close findings 14, 32, 45 and 46's follow-up, and settle a public page,
   a locale default, an attribution rule and a colour that currently means two
   things. None requires counsel or a purchase.
3. **Commission the counsel memorandum, O5.** It clears finding 9, unblocks the O18
   manual withdrawal route for every already-posted requirement, and removes
   placeholders from three public pages. It is the highest-leverage single item in
   this document and it is the slowest, which is why it starts now rather than later.
4. **Apply the finding 117 migration** and collect the four artefacts. The action
   card is written at `docs/owner-actions-adv-1c1.md` section 4.
5. **Run the one interactive Arabic session** that closes finding 203: an invalid
   enquiry, a past-dated viewing request and a missing-city requirement, read on the
   deployed build.
6. **Implement O18 clause 1 only:** the one-time withdrawal token for new anonymous
   requirements, displayed once at confirmation, stored only as a hash. This is the
   one piece of finding 193 that depends on nothing external. Clause 2 waits on O5,
   clause 3 waits on the mature organisation workflow, clause 4 is a refusal and
   needs no build. This is the recommended position for the O18 sequencing condition
   Codex attached to the ruling.
7. **Then, and only then, the next broad package**, chosen from what ELITE-1
   actually found rather than from what this repository currently guesses. If the
   round has not run by 1 October 2026, the ranking changes rather than the
   instrument, per the ledger.

Items 1 to 5 are owner actions. Item 6 is the only engineering work this document
recommends, it is small, and it is deliberately the sixth thing rather than the
first.

---

## H. Owner inputs this document could not supply

1. The ten unrecorded workstream titles: WS21, WS22, WS24, WS25, WS26, WS27, WS32,
   WS33, WS35, WS37. Ten titles, or a statement that the original enhancement plan
   is lost and the numbering should be re-based.
2. The authoritative six-journey list. Four are named. Two candidates are proposed in
   part D.2 and are marked as proposals.
3. Decision O19, whether an ELITE round may be recorded and on what terms. Round one
   is notes only and needs nothing.
4. Whether any row in this document should be labelled Dropped. None is, and none
   will be without explicit approval.

---

*Written under Codex relay item 5, 2026-08-02. No code, no package, no
implementation started.*
