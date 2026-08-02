# SAT Markets status ledger

One authoritative place to read what is true right now. Created as slice A of
PKG-ELITE-E1 under the Codex instruction of 2026-08-01.

**How this file is used.** Before proposing or re-running any package, read this file.
A package listed as completed is not re-run and not re-proposed unless a regression is
found and recorded here first. Where this file and a package narrative disagree, this
file is corrected in the same commit that finds the disagreement, and the narrative is
left alone; the narratives are historical records of a decision at a time, this is the
current state.

**How this file is maintained.** Updated in the same commit as any package closure, any
findings-register change, any deployment that becomes production, and any owner decision
that resolves or opens an outcome. It carries no figures that are not read from the
repository, the findings register, the decision register or a live check named beside
them.

**This file and the baseline enhancement plan answer two different questions.** This
file records present truth: what is built, what is deployed, what is open, what is
blocked and by whom. It does not record intended scope, and it never did.
`docs/baseline-enhancement-plan-2026-07-22.md` records intended scope: the 37
workstreams with their original acceptance conditions, the six user journeys and the
58-route register, exactly as they were written on 22 July 2026 and unedited since. A
reader asking "what is this workstream meant to deliver" reads the baseline. A reader
asking "is it delivered" reads this file. Neither is derived from the other, which is
the point: on 2026-08-02 a reconciliation was built by inferring intended scope from
repository numbering, ten workstreams were declared unrecoverable while the source
document sat in the owner's Drive, and six journeys were replaced by four substitutes
and two candidates. Preserving the baseline in the repository is what prevents that
recurring. Do not edit the baseline to match what was built. Record what was built
here.

**Where to start a new session.** `docs/session-resume.md` carries the continuity record:
how to rebuild the ephemeral build container, the gate and ship commands, what this
environment cannot do, the standing owner rulings and Codex commission, the evidence
discipline, and what is owed next. Read it before this file. It defers to this file on
every current figure.

---

## 1. Position

| Item | Value |
| --- | --- |
| GitHub HEAD | `d34ebfa`, "docs: O18 recorded, ELITE-1 kit corrected on all four counts, and the no-code roadmap reconciliation gate", plus the commit this file ships in |
| Branch | `main`, remote `github.com/saleemzeidan123/satmarkets` |
| Working tree | Clean at the time of writing, except this file |
| Production deployment | `dpl_9FuZYiaZAdymW2DWpMv2sd4pH1SW`, READY, target production |
| Deployment URL | `satmarkets-nv8azrhm8-sat-markets.vercel.app` |
| Aliases | `satmarkets-wheat.vercel.app`, `satmarkets-sat-markets.vercel.app`, `satmarkets-git-main-sat-markets.vercel.app` |
| Commit deployed | `d34ebfa`, confirmed by reading `meta.githubCommitSha`, not `readyState` alone. It is the PKG-KIT-REC documentation commit, whose reconciliation gate was subsequently rejected and rebuilt; see the PKG-REC-COR row in section 2. The last commit carrying a source change is still `994f02e`; everything after it is documentation |
| Build ready at | epoch ms 1785682704960, 62.4 seconds after build start |
| Deployment lag | The rule, so this row stops chasing itself. A ledger cannot record its own deployment before that deployment exists, so it always names the newest deployment that existed when it was written and states the gap. The gap is currently one commit: the one this row ships in, which carries documentation only and changes no rendered surface. A documentation-only commit does not require a further ledger commit to close it. Every one of the seven finding 203 commits was confirmed READY at its own matching `meta.githubCommitSha`: `bbdc22b`, `b731f7f`, `81844ed`, `085a4bc`, `0d62cb5`, `994f02e`, `48352e3`. So were `7aaab03`, `0a21ae5`, `17cefd2`, `77f26a5` and `d34ebfa`. **`4dcfb93` did not receive a build**, for the same reason `d2d2fb5` did not: no GitHub webhook fired. `list_deployments` returned zero for the window from the push to ten minutes after it, checked three times. It is documentation only, ten files all under `docs/`, which Next.js reads neither at build time nor at request time, so the rendered output is unchanged and the commit is carried by the next build rather than by one of its own |
| Release state | Site-wide `noindex, nofollow`. Preview protected. Owner ruling 1 parks indexing |
| Launch stage | E0, engineering foundation. The gate to E1 is a design-partner alpha |
| Test suite | 1679 tests, 0 failing. The rise from 1668 is finding 203's eleven guards in `src/lib/apiErrors.test.ts`, counted as tests rather than as files, because the six slices added assertions inside existing files and added no new file to the `npm test` list |
| Gate command set | `npx tsc --noEmit`, `npm test`, `npm run ar-lint`, `node scripts/prose-scan.mjs`, `node scripts/reflow-probe.mjs --chromium /opt/pw-browsers/chromium`, `node scripts/radio-probe.mjs --chromium /opt/pw-browsers/chromium`, then a Vercel READY build whose `meta.githubCommitSha` is checked, not only its `readyState` |

**This has now happened twice, so it is a pattern rather than an incident.** A push can
land on `main` without Vercel creating a deployment for it. The check that catches it is
`list_deployments` with a `since` timestamp, not `get_deployment` on the branch alias:
the alias keeps answering READY for the previous commit and looks healthy. Any future
ship that reads READY must confirm `meta.githubCommitSha` matches the commit just
pushed, which is the rule this file already states and which is what caught this one.

**Deployment lineage worth keeping.** `d2d2fb5` never received its own Vercel build
because no GitHub webhook fired for it; it reached production carried by `44a143f`'s
build, which is why the PKG-LS2 READY gate is satisfied without a build of its own. That
is a characterised gap, not an assumed one: `list_deployments` returned zero for the
window fourteen minutes after the commit.

---

## 1a. In flight

One package is open at the time of writing. It is recorded here rather than in section 2,
because section 2 is a list of things that are finished and putting an unfinished package
in it is how a ledger starts lying.

**PKG-E1-READINESS**, commissioned 2026-08-02, sequenced by decision D37. Six slices, run
through without pausing for intermediate approval and returned as one consolidated handback:
A, functional truth in WS13, removing the falsely positive success behaviour from
`/api/viewings` and `/api/signup` so that a request which was not stored can never return or
render success. B, the responsive shell in WS09, extending automated evidence through 1920 px
in both languages and resolving the dead 62 px `main.has-tabbar` padding if it is genuinely
unused, without disturbing safe-area handling or real bottom-navigation spacing. C, search
correctness in WS16, the known-query test set and canonicalization matrix the baseline
requires, in English and Arabic, including that developments never become districts.
D, authentication safety in WS25, recorded account-enumeration coverage across signup, login
and recovery that keeps responses generic without making recovery unintelligible. E, the
first reproducible synthetic performance baseline in WS33, by route family, locale and
device profile, with budgets derived from the measured application rather than from invented
industry targets. F, security essentials in WS34, the recorded dependency vulnerabilities
where upgrades are compatible, and Content Security Policy introduced in report-only mode
first.

What this package explicitly is not: no broad visual redesign, no migration of the 372 BASE
prose strings, no Listing Studio expansion, no external notification activation, no analytics
collection, no indexing or domain work, no licensed-data assumption, no O18 implementation
and no new governance package. Finding 117 stays an owner-side Supabase action and does not
block it. Finding 203 stays fixed pending its interactive Arabic POST verification.

---

## 2. Completed packages

Listed once. Do not re-run, do not re-propose, do not rebuild any of these unless a
regression is recorded in section 6 first.

| Package | What it closed | Recorded in |
| --- | --- | --- |
| PKG-0A to PKG-2A | The original Codex audit remediation sequence, typography, RTL, verification labelling | `docs/pkg-1b-verification.md`, `pkg-1b1-closure.md`, `pkg-1b2-closure.md`, `pkg-1c-closure.md`, `pkg-1c1-closure.md`, `pkg-2a-closure.md` |
| ADV-0 | Regulatory and data-rights register, rights ledger, AI data boundary, procurement backlog | `docs/adv-0-closure.md` |
| ADV-1 | Evidence and entity foundation, five verification dimensions, fail-closed resolver | `docs/adv-1-closure.md` |
| ADV-1C | The Evidence Passport producer, its rendering and its gate | `docs/handback-adv-1c.md` |
| ADV-1C.1, ADV-1D | The eleven corrections and the first integrated evidence | `docs/handback-adv-1c1-adv-1d.md` |
| ADV-1E | One quote decision, and the meanings it separates | `docs/handback-adv-1e-finding-91.md` |
| ADV-2 | Professional supply and demand workflow | roadmap, ADV-2 section |
| ADV-3A, ADV-3A.1, ADV-3B | Model-agnostic AI platform, its corrections, agents and tools | `docs/adv-3a-closure.md`, `adv-3a1-closure.md`, `adv-3b-closure.md` |
| ADV-4A, ADV-4B | Source-linked research, to the limit O10 and O13 allow | `docs/adv-4a-closure.md`, `adv-4b-closure.md` |
| ADV-5A, ADV-5B | Location intelligence interfaces, no dataset activated | `docs/adv-5a-closure.md`, `adv-5b-closure.md` |
| Owner ruling 3 and 4 closure | Verification labelling and HBU comparable anonymisation | `docs/ruling-3-4-closure.md`, `ruling-3-residual-closure.md` |
| PKG-AV1, PKG-AV2 | Availability truth on the browse card, and the re-affirmation it asks for | roadmap lines 805 and 854 |
| PKG-NM1 | One name per listing in the reader's language | roadmap line 888 |
| PKG-LS1 | The Arabic half of the lister's own workspace | roadmap line 961 |
| PKG-SUP1, PKG-SUP2 | The public listing entry stops simulating a form; one figure grammar on every listing surface | roadmap lines 1054 and 1397 |
| PKG-DEM1, PKG-DEM2 | The demand entry point stops rejecting its visitors; a requirement's figures stop being invented | roadmap lines 1180 and 1338 |
| PKG-FIG1, PKG-FIG2 | The grammar of a figure; one table for a unit | roadmap lines 1456 and 1509 |
| Codex ten-item corrective package | Items 1 to 8 implemented, item 9 closed at `b2fc4b8` | `docs/elite-standard-reconciliation.md` |
| PKG-ELITE-E1 slice A | The authoritative status ledger, this file | shipped `3b80cf9` |
| PKG-ELITE-E1 slice B | The working practice against environment reclamation, and the first recovery bundle | shipped `e2f776b`, section 10 below |
| PKG-ELITE-E1 slice C | Finding 137 resolved safely: a first pin may offer a location and never overwrite one, a contradiction refuses the write and blocks production counting | shipped `cf3504a` and `83dfdf3`, roadmap slice C section |
| PKG-ELITE-E1 slice D | The ELITE-1 research instrument in English and Arabic, eleven artefacts at full parity | `docs/research/elite-1-instrument-en.md`, `docs/research/elite-1-instrument-ar.md`, roadmap slice D section |
| PKG-ELITE-E1 slice E | The ELITE-4 manual accessibility pass over four journeys. 126 defects found, all 7 critical and all 41 high fixed, 54 of the remainder recorded | shipped `ae7b198`, `docs/accessibility-elite-4.md`, findings 139 to 192 |
| PKG-ELITE-E1 slice F | The ELITE-8 event dictionary and product scorecard. 46 events across the ten named families, 48 catalogued properties, 30 forbidden by name, 12 measures with no invented target, nothing collected | shipped `1b9bc0a`, `docs/elite-8-event-dictionary.md`, O17 below |
| PKG-ELITE-E1, whole package | Codex items 1 to 6 delivered, item 7 observed. Consolidated handback with scope, commits, gates, live EN and AR evidence, responsive limits, blockers and the next action | `docs/handback-pkg-elite-e1.md` |
| PKG-A11Y-1 slice A | The O17 and O12 rulings recorded against the surfaces they hold shut, the data-collection readiness record and the owner-ready recruitment sheet | shipped `7621724`, `docs/data-collection-readiness.md`, `docs/research/elite-1-recruitment-sheet.md` |
| PKG-A11Y-1 slices B to R | The accessibility remediation itself. 55 open P1 findings triaged to 12 root causes plus 2 journey-specific defects, 38 of the 39 accessibility findings closed, 8 further findings raised and closed inside the package, 1 data-quality migration authored for the owner | shipped `beef75a`, `7dfca13`, `7dfa5e7`, `1853e92`, `8beeaf6`, `abc3495`, `69fc447`, `72d04fa`, `d8de177`, `ededded`, `a38c06e`, `fcb4388`, `9fde67c`, `3cf25b4`, `8e80dbe`, `c6cad0e`, `7aaab03`; `docs/a11y-p1-triage.md` |
| PKG-A11Y-1, whole package | Consolidated handback with the Finding 138 disposition stated first, the triage, the root-cause fixes by journey, EN and AR live evidence, viewport and assistive-technology evidence classified by kind, and the independent-audit items that automation cannot settle | `docs/handback-pkg-a11y-1.md` |
| PKG-KIT-REC | The O18 ruling recorded and the four ELITE-1 recruitment kit corrections applied. **Its third deliverable, the roadmap reconciliation gate, was rejected by Codex on 2026-08-02 and has been rebuilt. Do not read the version shipped in `d34ebfa`, and do not read sections 4 or 5 of its handback.** The O18 record and the kit corrections stand | `docs/handback-recruitment-kit-and-reconciliation.md` sections 1 to 3, `docs/research/elite-1-recruitment-sheet.md`, `docs/research/elite-1-instrument-en.md`, `docs/research/elite-1-instrument-ar.md`, O18 and O19 in `docs/decision-register.md` |
| PKG-REC-COR | The corrected reconciliation. The original enhancement plan was recovered from the owner's Google Drive, preserved unedited in the repository as a baseline reference, and the gate rebuilt against it: all 37 workstream titles audited against source rather than inferred from repository numbering, the authoritative six journeys restored in place of four substitutes and two candidates, the status matrix rebuilt from the original acceptance conditions, and the conclusion that every incomplete visible workstream awaits something other than engineering time withdrawn verbatim and replaced by an eighteen-workstream inventory of unblocked engineering work. Two further ELITE-1 corrections applied at parity in three files: what ELITE-1-AT validates stated exactly with a separate authenticated round ELITE-1-AT-B defined for the 22 private-flow findings, and raw research notes bounded to 90 days after the final session rather than to the life of an open finding | `docs/baseline-enhancement-plan-2026-07-22.md`, `docs/roadmap-reconciliation-gate.md`, `docs/handback-reconciliation-corrected.md`, `docs/research/elite-1-recruitment-sheet.md`, `docs/research/elite-1-instrument-en.md`, `docs/research/elite-1-instrument-ar.md` |
| Finding 203, slices A to G | The bilingual refusal architecture. A route states a stable `code` and keeps its English sentence on the wire for the log and the API consumer; a client-side `[en, ar]` table names that code in the reader's language. 127 refusals across 16 route files all state a code, 76 codes are named in `src/lib/apiErrors.ts`, 15 client files render the named sentence, and 11 guards read the source so neither half can drift back. Four PostgREST leaks closed on the way, three of them on routes that take no session at all | shipped `bbdc22b`, `b731f7f`, `81844ed`, `085a4bc`, `0d62cb5`, `994f02e`, `48352e3`; `src/lib/apiErrors.ts`, `src/lib/apiErrors.test.ts`, findings register row 203. Status is "Fixed and awaiting deployment verification", not closed, for the reason in section 9 |
| Codex bounded batch, items 2 to 4 | The three owner-facing items of the batch that opened with finding 203. Item 2 is the finding 117 action card: preflight reads that establish a baseline and are explicitly not a count of affected rows, the application steps, four post-application checks including a refusal proved inside a transaction that is rolled back, a rollback that restores the defect exactly and therefore reopens the finding, and the four artefacts that close it. The Arabic-font workflow stays item 3 of the same file and is referenced rather than restated, per Codex condition 3. Item 3 of the batch is the ELITE-1 recruitment kit, finalised and unsent, with the authorisation error corrected: the sheet had read that recruitment was authorised when only preparation is. Item 4 is decision O18, the identity mechanism for an anonymous poster's withdrawal, written as a decision the owner rules on rather than a design already chosen | shipped `0391130`; `docs/owner-actions-adv-1c1.md` section 4, `docs/research/elite-1-recruitment-sheet.md`, `docs/decision-register.md` row O18, findings register row 193. Nothing in it is implemented and nobody has been contacted |
| Finding 203 and the owner batch, handback | One consolidated handback covering commits, gates, live EN and AR evidence read from the deployed build, what is genuinely closed, what requires human verification because no automation in this environment can settle it, what remains owner-blocked, and what was deliberately not started | `docs/handback-203-and-owner-batch.md` |

---

## 3. Conditionally completed packages

Work that is shipped and gated but whose acceptance carries a stated condition.

| Package | Condition |
| --- | --- |
| PKG-LS2 | Accepted by Codex on the reported gates and live evidence. Its own commit `d2d2fb5` never built; the READY gate is satisfied by the later build that carries it |
| PKG-LS3 | Accepted by Codex on the reported gates and live evidence. Neither changed screen is verifiable end to end, because both are session gated and the only live channel is unauthenticated GET |
| Finding 11, availability re-affirmation | Register status is "Fixed and awaiting deployment verification". The fix is deployed; the verification that would close it needs an authenticated session |
| Findings 114 and 115 | Register status is "Fixed, verified on the deployment", 114 with the qualifier "to the limit the corpus allows". Neither is "Closed with live evidence" and neither should be reported as closed |
| Finding 203, the bilingual refusal architecture | Register status is "Fixed and awaiting deployment verification". All six slices are deployed and each was confirmed READY at its own `meta.githubCommitSha`. What is missing is not code and not a gate: every refusal in the finding is reached by a POST, and the only live channel here is GET only and unauthenticated, so no refusal sentence can be made to appear on the deployed build from this container. The evidence that closes it is one interactive session submitting an invalid enquiry, viewing request and requirement on the Arabic build and reading the rendered sentence |

---

## 4. Open product outcomes

Owner or counsel decisions. None of these is engineering-blocked; each blocks a surface.

| Ref | Question | What it holds shut |
| --- | --- | --- |
| O1 | Pricing visibility, labelled concept or hidden until real | The pricing page CTA truthfulness |
| O2 | SAT Markets and SAT Real Estate relationship statement | `/neutrality` |
| O4 | Production default locale | The `x-default` alternate target, finding 14 and finding 32 |
| O5 | Legal wording and counsel engagement | Terms, Privacy and Contact placeholders, finding 9 |
| O6 | Licensed market datasets for public display and AI retrieval | Broker overlays stay internal only |
| O7 | Requirements indexability and requester-data exposure | Consent and redaction rules on the demand side |
| O8 | Write canonical-law amendments back into the knowledge base | Law drift between the repository and the knowledge base |
| O9 | Origin of the repository gstack instruction | A documentation tidy only |
| **O10** | **External written confirmation of REGA Rental Index (Ejar) permitted use, unanimous across ten clauses: access, public display, attribution wording, transformations and derived figures, aggregation and minimum samples, export, API and machine-readable output, AI retrieval and response use, retention and correction, Arabic and English publication** | **Every derived Rent Index figure on every channel. `decidePublicQuote` withholds it from the browser, the API, metadata, structured data and the assistant. Nine clauses answered is unresolved. The decision fails closed until it is unanimous. Held as data in `src/lib/sources/o10.ts`** |
| O11 | Whether the public bulletin is the surface that lifts the site-wide noindex | Finishing ADV-4. Owner ruling 1 parks the indexing half |
| **O12** | **Notification consent basis for opportunity routing, affirmative opt-in or opt-out, per channel. Ruled held on the PKG-A11Y-1 commission: no automatic email, SMS, WhatsApp, push or other external match notification may be activated** | **Every external channel. Email, push, SMS and WhatsApp are disabled in code, not by convention. This is why registering interest in a requirement notifies nobody, which is finding 118, and why a match is something a lister finds rather than something SAT sends. The authenticated in-product opportunity or matches inbox may remain available where it respects organization permissions and exposes nothing confidential. The preference and consent model may be prepared; external delivery needs all ten preconditions recorded in the decision register, and acceptance of general platform terms is not consent to automated opportunity marketing** |
| O13 | The separate REGA analytics and consultation licence, distinct from FAL 1200025510 | The bulletin, HBU, investment scenarios, public market commentary, and PD4 deed checks |
| O14 | Who inside an organization may release contact details or bind the organization | Progressive disclosure and mutual-interest contact release |
| O15 | Attribution scope for the Rent Index, citation against navigation | Finding 45. A proposed rule is written and awaiting approval |
| O16 | Whether availability freshness keeps the reserved green, and what the label must state | Finding 46's follow-up. One colour currently carries two unrelated meanings on one card |
| **O17** | **The lawful basis, the retention position and the user disclosure for first-party behavioural measurement. Whether contract performance covers product measurement of an account the person asked for, what the raw retention window may be before aggregation, and what the person must be told and where. Ruled on the PKG-A11Y-1 commission: collection remains disabled, the catalogue and the architecture are authorized, production behavioural collection is not** | **Every one of the 46 events in `src/lib/analytics/events.ts`. `COLLECTION_AUTHORISED` is a module constant set to false, not an environment variable, so switching it on is a commit rather than a dashboard setting. Answering O17 would open 39 events and would still leave the notification family shut, because O12 holds that separately. The fourteen-item readiness record required before enablement is written at `docs/data-collection-readiness.md`. No analytics vendor may be installed and no data may be sent to one; ELITE-1 sessions use consented research notes and manual observation** |

---

## 5. Open findings by severity

207 findings recorded. 127 carry a status beginning "Closed". 80 do not. Counts read from
`docs/findings-register.md` at this commit by parsing the status column, not estimated.

PKG-E1-READINESS slice A moved three of those. Finding 206, the two write routes that
reported success for a request they had not stored, is recorded and closed in the same
commit, which is the wrong order and is stated as such in the register: the defect was
known and written into the source as a comment for weeks without ever reaching this
count. Finding 207, the listings read that answers an empty list when it cannot reach the
store, was found while writing slice A's class guard and is left open on purpose, because
the surface that owns its fix is the public-discovery package that follows. Two rows
raised and one net closed is the same pattern as before and means the same thing.

The movement since PKG-ELITE-E1 is PKG-A11Y-1 and nothing else. P1 falls from 55 to 19,
which is 36 net, and the gross figure is larger: 47 rows carry "PKG-A11Y-1" in their
status. Thirteen findings were raised during the package, 193 to 205, and eight of those
were closed inside it. Thirteen new rows appearing while the open count falls by 32 is the
same pattern slice E showed and means the same thing: looking properly finds things, and
the count that matters is the one after both halves are recorded.

| Severity | Not closed | Ranks |
| --- | --- | --- |
| P0 | 6 | 4, 9, 10, 11, 12, 114 |
| P1 | 19 | 13, 14, 15, 16, 17, 19, 20, 21, 25, 29, 30, 31, 32, 45, 62, 117, 170, 193, 203 |
| P2 | 55 | 37, 38, 39, 40, 41, 42, 43, 44, 47, 48, 49, 53, 63, 64, 74, 75, 80, 81, 92, 93, 94, 96, 97, 99, 102, 103, 113, 115, 116, 118, 138, 142, 144, 146, 151, 152, 163, 169, 172, 173, 175, 176, 177, 178, 183, 185, 186, 188, 189, 190, 191, 194, 195, 202, 207 |

**What the 19 open P1 rows are, because "19 open P1" reads worse than it is.** Sixteen of
them were open before PKG-A11Y-1 began and are not accessibility findings: 13, 14, 15 and
32 are metadata and syndication; 16, 17, 19, 25, 29, 30, 31 and 45 are language and content
quality; 20, 21 and 62 are claims and figure precision, two of them already blocked by an
owner decision; and 117 is the requirement-city data-quality defect, whose migration is
authored and awaiting the owner. Of the three that are accessibility rows, 170 is the
listing video's missing captions, which is a content and ingest commitment rather than a
markup change; 193 is a requirement poster's consent withdrawal, which needs a database
migration this environment cannot apply; and 203 is the server-composed English refusal
sentence, which is fixed in six shipped slices and is still counted open here because the
refusals it repairs are all reached by a POST and nothing in this environment can send one
to the deployment. See section 3.

**The 203 arithmetic, corrected rather than restated.** The line above used to read
"sixteen client sites rendering a server-composed English error sentence in both
languages". Sixteen was the route count, not the client count, and it had been carried
forward without measurement. Measured at `994f02e`: 127 refusals across 16 route files, 76
codes named, 15 client files rendering them. The slice D, E and F commit messages state 56,
73 and 80 codes; those were running additions and are wrong. Commit messages are immutable
and are left as written. This is the corrected figure, and it also stands in the register
row.

Rank 113 now reads "Closed in PKG-DEM1 for the reading, open for the data" and IS counted
above, under P2, unlike in the PKG-ELITE-E1 edition of this file where it was excluded by a
parse that treated its leading "Closed" as closure. Its data half still needs a write
channel to the database that this environment does not have. The count moved because the
rule was corrected, not because the finding changed.

Ranks 11, 114, 115 and 203 appear above because their status is "fixed" rather than
"closed"; see section 3.

**A correction made in RC15, recorded because a ledger that quietly restates a number is
worse than one that was wrong.** Six P1 rows, 50, 140, 150, 154, 166 and 179, read "Open"
or "Confirmed open, 3 of 155 fixed" in this file and in the register for eight slices after
`beef75a` closed them. The fixes were real and shipped; the register was not updated in the
same commit, which is the practice this file's own header requires. The rows now carry the
correction, the arithmetic that closes them and the evidence class, and the counts above
are computed from the corrected register.

### The three Codex named explicitly

**Finding 80, P2, open.** A lister's own figures have no recorded export or model-input
permission, so the Evidence Passport reports two of its three permissions as unrecorded
on every first-party figure. This is honest rather than broken: the passport is refusing
to claim a permission nobody granted. Closing it means deciding, at the point a lister
publishes, what they are granting SAT the right to do with their own numbers, which is an
owner and terms question before it is an engineering one.

**Finding 81, P2, open.** Five library modules are unreachable from every route root, and
three of them are held in the tree only by a test asserting that nothing imports them.
Dead code that a test keeps alive is worse than dead code, because the test reads as
coverage. Resolution is either to delete them with their test or to wire them to the
surface they were written for, and that decision needs a reading of what each was for.

**Finding 137, P2, CLOSED in PKG-ELITE-E1 slice C.** A first pin whose nearest district
disagreed with the listing's recorded `district_id` was a real disagreement nothing read.
`district_id` had been deliberately excluded from `FILLABLE_WHEN_ABSENT` in PKG-LS3 rather
than silently derived, because deriving a district from a pin is a substitution wearing an
addition's clothes; that was the safe half, and reading the disagreement was the missing
half. Closed by `src/lib/locationConsistency.ts`, a pure module read by four surfaces that
already existed. The evidence source, which Codex required be documented: SAT holds no
district boundary geometry, the deployed preview is the proof, and every location row
carries a point and a kind and no polygon, radius, bounding box or area. So the module has
five verdicts and no `verified` among them, and cannot grow one while the data is one point
per row. A later pin now offers a location and never takes one, `PATCH /api/listings/[id]`
refuses a contradicting pin with 409, and `launchGate.ts` blocks a contradicted or an
unchecked row from counting as production inventory. No dataset was purchased, licensed or
scraped, per Codex and owner ruling 7. Full record in `docs/findings-register.md` and in
the roadmap's slice C section.

**Finding 138, P2, open, raised in PKG-ELITE-E1 slice C.** Two dashboard selects asked
`districts_geo` for a `city` column while the public listings page has read the city from
`districts` and joined it since PKG-NM1. Both cannot be right, and which one is right is
UNPROVEN from this environment: every Supabase read here is permission denied and both
routes are session gated while `web_fetch_vercel_url` is GET only. Both selects were
repaired to the pattern that is correct under either answer. Recorded so the repair is not
mistaken for a proof.

**Its PKG-A11Y-1 disposition, which Codex required be stated at the head of the handback.**
It stays recorded and does not become a corrective prelude. It is P2; it concerns none of
the categories Codex named for escalation, being neither security, authorization, privacy,
an unsupported figure, misleading publication nor irreversible data corruption; and the
repair already applied is correct whichever answer the schema gives, so there is no
outcome that waiting changes. The full statement is at the head of
`docs/handback-pkg-a11y-1.md`.

---

## 6. Regressions

None recorded. This section exists so that a claim of regression has a place to be
written down before any completed package is reopened.

---

## 7. External owner dependencies

Everything here is outside the repository. None of it is a reason to stop engineering
work, per the governing directive and owner ruling 6.

| Dependency | State | What it costs while open |
| --- | --- | --- |
| **Arabic font workflow** | Delivered to the owner as a file, documented in `docs/owner-actions-adv-1c1.md`. Not installed. The deploy token has no `workflow` scope, so `.github/workflows/arabic-font.yml` cannot be pushed from here | Arabic font correctness is evidenced manually and by live check rather than by a gate on every push. Owner ruling 6 explicitly says this does not stop other work |
| **Migration `20260801_requirement_city_is_never_assumed.sql`** | Authored, checked in, NOT applied. `apply_migration` and `execute_sql` are permission denied from this environment. The full action card is section 4 of `docs/owner-actions-adv-1c1.md`: preflight, application, post-application verification, rollback, and the four artefacts that close the finding. Shorter instructions remain in `supabase/migrations/README.md` | Finding 117 stays open. The deployed `create_requirement` still writes `coalesce(nullif(payload->>'city',''), 'Riyadh')`, so any caller that is not the API route can still file a requirement in a city nobody stated. The HTTP path has been safe since PKG-DEM1, so nothing a visitor can do reaches the default; what is open is the direct-call path, because the function is SECURITY DEFINER and executable by `anon` |
| **Finding 193, consent withdrawal** | The owner question is answered. Ruling O18 arrived on 2026-08-02 and is recorded in the closed section of `docs/decision-register.md`: a new anonymous requirement gets a cryptographically strong one-time withdrawal token, shown once at confirmation and stored only as a hash; an already-posted requirement and any lost token are served by a manual privacy-request route once the approved privacy contact surface exists, which O5 still gates; an authenticated user in the mature organisation workflow withdraws from their own dashboard; and reference code paired with the recorded email is refused outright, in any form. Implementation does not begin until the product sequence is approved. The reconciliation gate that was to establish this work's position was rejected on 2026-08-02 and rebuilt, and Codex then directed that the rebuilt gate not be used to choose the next package: Codex and Saleem approve the sequence after the corrected matrix. So the finding stays open on sequencing rather than on an unanswered question, and the sequencing decision now sits with the advisor and the owner rather than with a document | A requirement poster still has no route to withdraw the consent that shares their contact details, and the already-posted rows are the half the ruling routes through O5 rather than through code. `beef75a` corrected the label so it no longer promises a withdrawal that does not exist, which is why 192 is closed and 193 is the remaining and larger half. The obligation exists whether or not the product offers a control |
| **RLS advisory, `public.map_anchors`** | 104 rows of public reference geography. RLS off. SQL written for the owner in `docs/owner-actions-adv-1c1.md`, deliberately not auto-applied | The exposure is public-by-design data, so the risk today is future columns rather than current rows. Enabling RLS without the SELECT policy in the same transaction would take location facts off every listing page, which is why this is owner-run |
| **RLS advisory, `public.spatial_ref_sys`** | 8500 rows. RLS off. Not to be modified blindly because the table may be PostGIS extension owned | Nothing user-facing. It is an advisory artefact of an extension, and acting on it without knowing the ownership risks breaking PostGIS |
| Advisory re-check | `Supabase.get_advisors` now answers permission denied, as do `execute_sql`, `apply_migration` and `list_tables` | The two advisories above cannot be re-read from here. They are carried forward from the last successful read rather than re-confirmed, and this file says so rather than presenting them as current |
| Design-partner recruitment | **Authorised 2026-08-02.** Owner side. The instrument is written and ready to run: criteria, screener, invitation, consent script, facilitator guide, accounts, task scripts, observation sheet, severity rubric, success calculation, interview questions and findings template, in English and Arabic. Six corrections required by Codex on 2026-08-02 are now applied across all three files, four from the first review and two from the rejection of `d34ebfa`. Physical mobile coverage is allocated before outreach rather than accepted by chance: three handset seats, M1 on D1 as iPhone Safari in Arabic and not substitutable, M2 on D5 as Android Chrome, M3 on S3, with a gate that the round does not close below 3 mobile sessions or without M1. Assistive-technology validation is stated as a separate required round, ELITE-1-AT, seat A1, public path only, and stage E1 is gated on it having run. What A1 validates is now stated exactly rather than implied: it validates whether four public surfaces can be operated with a screen reader, and it does not verify the 22 accessibility findings recorded in the private flows. Those 22 are fixed and awaiting independent verification, not known-broken, and the round that verifies them is a separate authenticated session, ELITE-1-AT-B, run against registration, the Listing Studio and the dashboard with a prepared test account after the ELITE-1 write-up. Until ELITE-1-AT-B has run and its results are recorded, no document may state that the 22 are closed. Raw notes retention is also now bounded by a date rather than by a condition: raw pseudonymous notes are destroyed no later than 90 days after the final session of the round, after which only synthesized findings are kept, carrying no participant identifier including seat labels; a finding still open on day 91 is carried by its synthesized form, and any duration other than 90 days is an owner or counsel decision recorded in `docs/decision-register.md` before the round runs. The recording policy is corrected: round one is notes only, no audio, video or screen capture, automatic transcription and AI notetakers switched off before every session, and no notes uploaded to any unapproved transcription service, which removes the contradiction of retaining a recording while claiming nothing personal was retained. Whether a later round may record, and on what seven data-protection terms, is now decision O19. **The authorisation to approach 10 people arrived on 2026-08-02 and recruitment is now running with the corrected kit.** Four conditions came with it and bind every session. Saleem holds the real contact list outside the repository, so no name, phone number or email of a prospective participant is committed, staged or written to any file here. Saleem controls the actual external messages; the kit supplies the wording and nothing in this repository sends anything. No automatic outreach of any kind is authorised, which forecloses generating an approach from an inferred interest as much as it forecloses a mail merge. No AI transcription and no recording is authorised, which keeps round one at notes only and leaves O19 the only route to changing that. ELITE-1-AT and ELITE-1-AT-B both remain required under the scopes recorded above; authorising recruitment did not fold them into the main round | The gate from E0 to E1. This is the binding constraint on the whole product, not any missing feature. It is no longer blocked on preparation and no longer blocked on authorisation either: what remains is scheduling and the sessions themselves. The 1 October 2026 re-ranking condition is discharged, because the authorisation arrived before it |
| Saudi counsel memorandum | Not commissioned | O5, O13, and the FAL scope question surface by surface |
| REGA and Ejar permitted use | Not obtained | O10 |
| Enterprise AI agreement and processing terms | Not signed | External model processing stays off |
| Email or messaging provider | Not chosen | Saved-search email alerts, and any external notification once O12 is ruled |
| Additional OAuth providers | Not created | Microsoft, LinkedIn and Apple sign-in |
| Purchase budget shape | Undecided: a total, or a rate per square metre | The demand-side budget field's grammar |

Owner ruling 7 governs all of these: create the interfaces, the procurement requirements
and the decision records, but buy nothing, contact no vendor, sign nothing, and never
represent that a data right exists.

---

## 8. Packages superseded or renamed

| Original | Now |
| --- | --- |
| PD1 to PD5, the public data programme | Folded into ADV-4 and ADV-0 rather than run in parallel. PD5 is owner action only and carries no engineering task |
| Codex ten-item corrective package, item 10 | Superseded by PKG-ELITE-E1 |
| The competitive advantage strategy document | Converted through `docs/strategy-reconciliation.md`. Only the surviving items became ADV packages; the rest were classified as shipped, already answered more strictly here, or gated |
| Map Phase 2 | Deferred by standing agreement, not cancelled. It touches the core listings query and is a supervised pass |
| The visual-quality package | Parked by the owner: finish the Codex work first |
| `/compare` | Parked deliberately as a stub until post-launch |
| Off-market | Dormant scaffolding. The RLS recursion it caused is fixed |

---

## 9. Live-verification gaps

The single largest evidence debt on this product. Stated plainly because three
consecutive packages have now owed the same thing.

| Gap | Why it exists | What would retire it |
| --- | --- | --- |
| No authenticated live channel | The sandbox egress proxy blocks both the deployment and the database directly. The only working channel is `Vercel.web_fetch_vercel_url`, which is unauthenticated and GET only | A session-capable channel. One thing, and it retires most of this table |
| Every session-gated screen | Listing Studio, the lister dashboard, inventory, requirement creation, matches, messages, admin. None can be exercised end to end from here | The same |
| Photo and media presence | `GET /api/listings` carries no media count, so photo checks read as missing because the channel cannot decide them, not because they were proved absent | A media count on the public endpoint, or a session channel |
| Database reads | `execute_sql`, `apply_migration` and `list_tables` are permission denied | Restored permission, or a read-only public route for each fact needed |
| Real physical device testing | No device in this environment. Zoom, reflow, screen reader and touch behaviour can be reasoned about and tested in code, not observed | A human on a real device. This is a stated limit of slice E, not a claim it will make |
| No accessibility automation in the repository | There is no axe, pa11y, jest-axe or Lighthouse step anywhere, and no accessibility npm script. `e2e/` holds two specs and neither is an accessibility spec | An automated harness, which slice E deliberately did not add because Codex item 7 forbids new tooling in this package |
| No reachable development server | `curl http://localhost:3000/en/login` returns status 000 in this container, so no surface can be operated locally either | A running server in the container, or the session channel above |
| **Every refusal sentence on the platform** | Finding 203. A refusal is what a route returns when it declines a write, and every write is a POST. The live channel is GET only, so the 127 refusals across 16 routes can be proved correct by reading the source and proved present by the test suite, and cannot be made to appear on the deployed build from here. Two of the routes take no session at all, `/api/viewings` and `/api/leads`, and even those cannot be exercised, because the channel will not POST | One interactive session on the deployed preview: submit an enquiry with a mistyped email, a viewing request for a time that has passed, and a requirement with a missing city, on the Arabic build, and read the sentence each one renders. That single session retires this row and closes finding 203 |
| No screen reader and no accessibility specialist | Neither exists in this environment | A human. Every one of the 126 slice E findings is source-read only and none is independently verified |
| Interactive browser Advisor verification | Codex item 7. Needs a browser session against the deployment | Owner-side browser run, or a session channel |
| `LocationPicker` visual fit at 320 to 430 pixels | Tailwind-classed component inside an inline-styled form, on a session-gated screen | The same session channel |
| **Every name, role, value and announcement fixed in PKG-A11Y-1** | 16 of the 39 accessibility findings are defects in what a screen reader says. A DOM assertion proves an attribute is present; only a screen reader proves what is spoken, and in Arabic only an Arabic screen reader proves it is spoken in Arabic | One session with NVDA or JAWS in English and one with a screen reader in Arabic, against the deployed preview. Until then the package's own record classifies these as fixed and awaiting independent verification, and claims no WCAG 2.2 AA conformance |
| **Touch target size, reading size and phone-width table semantics** | Findings 26, 27, 139 and 148. A CSS `min-height` is evidence that a rule exists, and a Chromium viewport with `hasTouch` is evidence that a media query matches. Neither is evidence that a thumb reaches a control on a real handset | A human with a phone. `scripts/touch-probe.mjs` and `scripts/radio-probe.mjs` measure the rendered box and say in their own output that they are browser emulated and not a device |
| **Two judgement calls that are not measurements** | Finding 165, whether the non-colour distinction between district bubbles and building pins is actually distinguishable, and finding 145, whether the non-colour step indicator reads as progress. Both are now non-colour distinctions in code; whether they communicate is a human question | An independent reviewer, or the ELITE-1 design-partner sessions once recruitment is authorised |

**The rule that follows from this table.** Where a thing cannot be verified live, the
package record says so in those words and does not substitute a local result for a live
one. A local pass is evidence that the code does what it says; it is not evidence that
the deployed product does.

---

## 10. Environment and durability

| Item | Value |
| --- | --- |
| Repository clone | `/tmp/sm2`, inside an ephemeral container |
| Durability of `/home/claude` | Identical. Same filesystem `/dev/vda`. Relocating inside the container buys nothing |
| Persistent workspace available | Yes. `C:\Users\salee\Desktop\SAT Knowledge Base` on the owner's device, through the device bridge |
| Consequence | No completed multi-file slice may exist only in the container clone. See PKG-ELITE-E1 slice B |
| Deployment mechanism | `python3 tools/ship.py --auto -m "message"`. The em-dash guard rejects an em dash in a commit message |
| Known local build limitation | `npm run build` fails locally on four `next/font` errors because Google Fonts is unreachable. A Vercel READY build is the production build evidence |

### The working practice, adopted in PKG-ELITE-E1 slice B

The container has been reclaimed mid-package before, and it took uncommitted work with
it. The practice below exists so that it can happen again without costing anything.

1. **Commit each coherent slice as it finishes.** A slice is coherent when its tests pass
   and its record is written. Not per file, not per edit.
2. **Push each of those commits.** A commit that exists only in the container clone is
   protected from an editor mistake, not from a reclamation.
3. **Keep the tree clean between slices.** `git status` at the start of a slice should
   show nothing. If it does not, the previous slice is not finished.
4. **No large multi-file uncommitted package.** If more than a handful of files are
   uncommitted at once, the slice was drawn too wide and should be split.
5. **No meaningless microcommits.** Reviewability is the reason commits exist. A commit
   whose message cannot state what changed and why is the wrong size in the other
   direction.
6. **Record the intended deployment commit before beginning the next package.** Written
   into section 1 of this file, so that a reclamation between packages loses nothing but
   time.
7. **Mirror a recovery bundle to the persistent workspace at each package close.** A
   `git bundle` of `main` plus this ledger goes to
   `C:\Users\salee\Desktop\SAT Knowledge Base\sat-markets\work\recovery\` on the owner's
   device, with a `RECOVERY.md` stating how to restore from it. GitHub stays the
   authoritative remote; the bundle is a second copy held somewhere a container cannot
   reclaim.

   **Blocked since slice C.** The device bridge is absent from this session: the
   `remote-devices` tools do not resolve at all, so the persistent workspace cannot be
   written to and the bundle has not been refreshed since slice B. This is recorded rather
   than worked around. Nothing is at risk, because every slice since is committed and
   pushed to GitHub, which this practice names as the authoritative remote and the bundle
   only duplicates. The refresh happens at the first package close where the bridge is
   present.

**Intended deployment commit for the next package:** unchanged practice. Each slice ships on
its own commit to `main` and deploys to production on its own Vercel build. There is no
long-lived branch and no accumulated package commit. PKG-A11Y-1 ran eighteen slices this
way, A through R, and the container was not reclaimed during it; the practice is what made
that unremarkable rather than lucky.
