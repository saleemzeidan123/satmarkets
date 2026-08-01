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

---

## 1. Position

| Item | Value |
| --- | --- |
| GitHub HEAD | `22a4a5a`, "Record the required next-highest-value-action judgment after PKG-LS3" |
| Branch | `main`, remote `github.com/saleemzeidan123/satmarkets` |
| Working tree | Clean at the time of writing, except this file |
| Production deployment | `dpl_HCXXb1SuHgg8XX4nJzcA3nkEERAV`, READY, target production |
| Deployment URL | `satmarkets-2c4cheg45-sat-markets.vercel.app` |
| Aliases | `satmarkets-wheat.vercel.app`, `satmarkets-sat-markets.vercel.app`, `satmarkets-git-main-sat-markets.vercel.app` |
| Commit deployed | `22a4a5a0b72de5b871b724e83f3bafadd0f1affa` |
| Build ready at | epoch ms 1785588590263 |
| Deployment lag | None. HEAD and production are the same commit |
| Release state | Site-wide `noindex, nofollow`. Preview protected. Owner ruling 1 parks indexing |
| Launch stage | E0, engineering foundation. The gate to E1 is a design-partner alpha |
| Test suite | 1513 tests, 0 failing |
| Gate command set | `npx tsc --noEmit`, `npm test`, `npm run ar-lint`, `node scripts/prose-scan.mjs`, then a Vercel READY build |

**Deployment lineage worth keeping.** `d2d2fb5` never received its own Vercel build
because no GitHub webhook fired for it; it reached production carried by `44a143f`'s
build, which is why the PKG-LS2 READY gate is satisfied without a build of its own. That
is a characterised gap, not an assumed one: `list_deployments` returned zero for the
window fourteen minutes after the commit.

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

---

## 3. Conditionally completed packages

Work that is shipped and gated but whose acceptance carries a stated condition.

| Package | Condition |
| --- | --- |
| PKG-LS2 | Accepted by Codex on the reported gates and live evidence. Its own commit `d2d2fb5` never built; the READY gate is satisfied by the later build that carries it |
| PKG-LS3 | Accepted by Codex on the reported gates and live evidence. Neither changed screen is verifiable end to end, because both are session gated and the only live channel is unauthenticated GET |
| Finding 11, availability re-affirmation | Register status is "Fixed and awaiting deployment verification". The fix is deployed; the verification that would close it needs an authenticated session |
| Findings 114 and 115 | Register status is "Fixed, verified on the deployment", 114 with the qualifier "to the limit the corpus allows". Neither is "Closed with live evidence" and neither should be reported as closed |

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
| **O12** | **Notification consent basis for opportunity routing, affirmative opt-in or opt-out, per channel** | **Every external channel. Email, push, SMS and WhatsApp are disabled in code, not by convention. This is why registering interest in a requirement notifies nobody, which is finding 118, and why a match is something a lister finds rather than something SAT sends** |
| O13 | The separate REGA analytics and consultation licence, distinct from FAL 1200025510 | The bulletin, HBU, investment scenarios, public market commentary, and PD4 deed checks |
| O14 | Who inside an organization may release contact details or bind the organization | Progressive disclosure and mutual-interest contact release |
| O15 | Attribution scope for the Rent Index, citation against navigation | Finding 45. A proposed rule is written and awaiting approval |
| O16 | Whether availability freshness keeps the reserved green, and what the label must state | Finding 46's follow-up. One colour currently carries two unrelated meanings on one card |

---

## 5. Open findings by severity

137 findings recorded. 80 carry a status beginning "Closed". 57 do not. Counts read from
`docs/findings-register.md` at this commit by parsing the status column, not estimated.

| Severity | Not closed | Ranks |
| --- | --- | --- |
| P0 | 6 | 4, 9, 10, 11, 12, 114 |
| P1 | 21 | 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 29, 30, 31, 32, 45, 50, 62, 117 |
| P2 | 30 | 37, 38, 39, 40, 41, 42, 43, 44, 47, 48, 49, 53, 63, 64, 74, 75, 80, 81, 92, 93, 94, 96, 97, 99, 102, 103, 115, 116, 118, 137 |

Rank 113 is "Closed in PKG-DEM1 for the reading, open for the data" and is not counted
above; its data half needs a write channel to the database that this environment does not
have.

Ranks 11, 114 and 115 appear above because their status is "fixed" rather than "closed";
see section 3.

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

**Finding 137, P2, open.** A first pin whose nearest district disagrees with the
listing's recorded `district_id` is a real disagreement that nothing currently reads.
This is slice C of PKG-ELITE-E1 and is being worked now. `district_id` was deliberately
excluded from `FILLABLE_WHEN_ABSENT` in PKG-LS3 rather than silently derived, because
deriving a district from a pin is a substitution wearing an addition's clothes.

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
| **RLS advisory, `public.map_anchors`** | 104 rows of public reference geography. RLS off. SQL written for the owner in `docs/owner-actions-adv-1c1.md`, deliberately not auto-applied | The exposure is public-by-design data, so the risk today is future columns rather than current rows. Enabling RLS without the SELECT policy in the same transaction would take location facts off every listing page, which is why this is owner-run |
| **RLS advisory, `public.spatial_ref_sys`** | 8500 rows. RLS off. Not to be modified blindly because the table may be PostGIS extension owned | Nothing user-facing. It is an advisory artefact of an extension, and acting on it without knowing the ownership risks breaking PostGIS |
| Advisory re-check | `Supabase.get_advisors` now answers permission denied, as do `execute_sql`, `apply_migration` and `list_tables` | The two advisories above cannot be re-read from here. They are carried forward from the last successful read rather than re-confirmed, and this file says so rather than presenting them as current |
| Design-partner recruitment | Not started. Owner side | The gate from E0 to E1. This is the binding constraint on the whole product, not any missing feature |
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
| Interactive browser Advisor verification | Codex item 7. Needs a browser session against the deployment | Owner-side browser run, or a session channel |
| `LocationPicker` visual fit at 320 to 430 pixels | Tailwind-classed component inside an inline-styled form, on a session-gated screen | The same session channel |

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
