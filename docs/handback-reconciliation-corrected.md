# Handback: the corrected reconciliation

Returned under the Codex rejection of `d34ebfa`, 2026-08-02: *"Return one corrected
documentation-only handback. Do not start implementation, do not contact participants,
and do not use the present reconciliation to choose the next package."*

**This is documentation only.** No file under `src/` was touched. The test suite is
unchanged at 1679. No rendered surface changed, in either language. No participant was
contacted. No package was chosen.

**What was accepted, and is therefore not re-litigated here.** Codex accepted the O18
record and the substantive ELITE-1 recruitment corrections shipped in `d34ebfa`. Those
stand. This handback covers the rejection: the reconciliation gate, rebuilt, plus the
two limited recruitment-kit corrections Codex added.

---

## 1. The instruction, answered item by item

| Codex required | Returned |
| --- | --- |
| Read the original enhancement plan before editing the reconciliation. Say so if the environment cannot access it | **Read in full, 787 lines.** The path Codex gave could not be reached; a copy of the same document was reached another way. Both facts are stated in section 2, not glossed |
| Do not reconstruct it from repository numbering | **Not reconstructed.** Every workstream title, acceptance condition and journey in the rebuilt gate is quoted or paraphrased from the baseline document, and the baseline is now in the repository so any reader can check the quotation |
| The ten workstreams labelled unknown are explicitly named | **All ten restored** with their baseline titles and acceptance conditions, and all ten re-evaluated. Not one of them was "Not started". Nine are Partial and one, WS37, is genuinely Not started |
| Audit all 37 titles against the source, not only the six examples | **All 37 audited.** Codex's six examples are confirmed. No seventh title error was found beyond the same failure mode: the rejected version had named the slice a shipped package touched and judged the whole workstream against it. Part A of the gate names the six and states the pattern |
| Replace the four substitute journeys and two candidates with the authoritative six. Map the shipped product to them without renaming them | **Replaced.** Part D.1 is a disposition table saying what happened to each rejected label. Part D.2 maps the shipped product to the six, quoting each journey's success condition from the baseline rather than restating it. No journey was renamed |
| Rebuild the reconciliation from the original acceptance outcomes. Adjacent code does not make a workstream Complete | **Rebuilt.** Part B states the rule explicitly and part C applies it. The Complete count fell from the rejected version's reading to nine. WS34, previously Complete, is Blocked, because findings 41 and 42 were open in the register at the very commit that marked it Complete |
| Where foundations exist but the complete experience does not, use Partial and name both the remaining engineering work and the external dependency | **Two separate columns, in every Partial row.** A row with engineering work and no external dependency is unblocked. That distinction is the whole mechanism by which the false conclusion was caught |
| Withdraw the conclusion that every incomplete visible workstream is waiting on something other than engineering time. Reassess only after the corrected matrix | **Withdrawn verbatim in part G.1**, quoted as a block quote before it is withdrawn, so that anyone who read the claim finds the retraction next to it. Reassessed in G.2 and G.3, after part C and part D and not before |
| Home design, listing detail, Advisor, broker profiles, Listing Studio, authentication, dashboards, enquiries, messages, viewings, performance, accessibility validation, observability and launch operations must all be evaluated under their actual workstream definitions | **All fourteen evaluated** under their baseline definitions in part C: WS15, WS18, WS21, WS22, WS24, WS25, WS26, WS27, WS33, WS32, WS35 and WS37, with dashboards and enquiries carrying their own rows |
| Preserve the original enhancement plan as a clearly labelled baseline reference | **`docs/baseline-enhancement-plan-2026-07-22.md`**, 830 lines, the 787-line plan unedited under a 43-line provenance header |
| State that the ledger records present truth while the baseline preserves intended scope | **Stated in three places**, so it is found wherever a reader starts: the baseline header, the gate's part A, and a new paragraph in the header of `docs/status-ledger.md` |
| ELITE-1-AT must not be presented as validating the 22 private-flow findings. State what A1 validates and schedule separate authenticated coverage | **Corrected at parity in three files**, and the separate round is defined rather than merely promised. See section 4 |
| Bound the raw-notes period, recommended maximum 90 days after the final session. Record any different duration as an owner or counsel decision | **Bounded to a date, not a condition.** See section 5 |
| Do not start implementation, contact participants, or use this reconciliation to choose the next package | **None of the three happened.** Section 7 states what was deliberately not done, including the one place where the earlier commission and this instruction conflicted |

---

## 2. How the baseline was obtained, stated plainly

Codex gave the path
`C:\Users\salee\OneDrive\Documents\SAT Markets\SAT-Markets-Complete-Enhancement-Plan-2026-07-22.md`
and instructed that if the environment could not access it, that be said rather than
worked around silently.

**That path could not be accessed.** This build environment reaches the owner's machine
only through the device bridge, and the bridge is not connected:
`mcp__remote-devices__get_device_info` returns "The device this session is bound to is
not connected to the bridge." No local drive, no OneDrive mount and no filesystem path
on the owner's computer is readable from here.

**A copy of the same document was reachable another way.** The Google Drive connector
does work in this environment. It holds a file titled "SAT Markets - Complete
Enhancement Plan - 2026-07-22.md", file id `1NILly2at_Q8HeIfbMgnGeuukOZYI_YlI`, owned by
saleem.zeidan@gmail.com, created 2026-07-22T17:09:11Z and last modified
2026-07-23T04:55:46Z. It was downloaded, decoded and read in full: 105,630 characters,
787 lines, zero em dashes and zero en dashes, so Law 2 needed no exception to commit it
unedited.

**Why this was not treated as grounds to stop and ask.** The instruction to say so if the
environment could not access the file is honoured by saying so, which this section does.
Stopping would have been the right response only if no authoritative copy existed. One
did, under the owner's own account, matching on title, date and subject. It is committed
unedited so that its authority does not rest on this account of it: anyone can diff the
repository copy against the OneDrive original.

**What a reader should check if the two ever disagree.** The repository copy is a copy of
the Drive document, not of the OneDrive file. If the owner edited the OneDrive file after
23 July 2026 without syncing, the repository baseline is stale and the OneDrive file
wins. The provenance header of `docs/baseline-enhancement-plan-2026-07-22.md` records
every figure needed to test that, including byte counts.

---

## 3. The rebuilt gate

`docs/roadmap-reconciliation-gate.md`, 494 lines, parts A to H, no code, no package
proposed. The rejected version was 331 lines.

**Part A** states what was wrong before anything else, including the two false claims,
the cause, the six confirmed title errors and what survives from the rejected version.

**Part B** is the status vocabulary with the rule the rejected version did not apply:
adjacent code does not make a workstream Complete.

**Part C** is all 37 workstreams under their baseline titles and acceptance conditions,
grouped by the baseline's own phases. The count:

| Status | Count | Workstreams |
| --- | --- | --- |
| Complete | 9 | WS01, WS02, WS03, WS04, WS05, WS06, WS07, WS08, WS17 |
| Partial | 22 | WS09, WS10, WS11, WS12, WS13, WS14, WS15, WS16, WS18, WS19, WS21, WS22, WS23, WS24, WS25, WS26, WS27, WS28, WS32, WS33, WS34, WS35 |
| Blocked | 5 | WS20, WS29, WS30, WS31, WS36 |
| Deferred | 0 | Map Phase 2 is a deferred slice inside WS19, not a deferred workstream |
| Not started | 1 | WS37 |
| Dropped | 0 | None, and none without Saleem's explicit approval |

**Part D** restores the six journeys. D.1 disposes of each rejected label; D.2 maps the
shipped product to the six against their baseline success conditions; D.3 accounts for
the eighteen baseline routes the plan assigns to no journey; D.4 is the finding this
correction exists to surface; D.5 states exactly what ELITE-1-AT validates.

**Parts E and F** reconcile the decision register and the findings register. F carries one
arithmetic correction the rejected version got wrong in its own terms: it wrote "79 do
not" and then listed 6 at P0, 19 at P1 and 53 at P2, which sums to 78. P2 is 54. The
ledger was right and the severity line was wrong.

**Part G** withdraws the false conclusion and reassesses. **Part H** lists the five owner
and advisor inputs still genuinely open, having removed two that were never owner inputs
at all.

### 3.1 The single most consequential thing the correction surfaced

The rejected version's four substitute journeys were read off the scope table of
`docs/accessibility-elite-4.md`, which is the record of an accessibility audit. Using an
audit's scope as the journey list makes the audit look complete by construction: every
journey in the list had been audited, because the list was made from what was audited.

With the authoritative six restored, part D.4 shows what that hid. **Track a deal has
never been accessibility-audited. Research the market has never been
accessibility-audited. Manage supply and demand was audited only in part.** Seventeen
shipped surfaces carry no manual accessibility pass: `/deal`, `/deal/termsheet`, `/docs`,
`/verify/viewings`, `/rent-index`, `/market`, `/advisor`, `/area`, `/hbu`, `/invest`,
`/sources`, `/messages`, `/notifications`, `/saved`, `/me`,
`/dashboard/enquiries/[id]` and `/dashboard/viewings`.

That gap was invisible under the rejected journey list and is unblocked engineering work
under the corrected one. It is stated here as a finding, not as a proposal: it is not
scheduled, and this document does not schedule it.

### 3.2 What the corrected matrix says about the withdrawn conclusion

The withdrawn sentence, quoted from the rejected version:

> "Every single visible workstream still marked Partial or Blocked is waiting on
> something other than engineering time."

It was asserted over 27 of 37 workstreams while omitting six visible ones, because the
other ten were wrongly held to be unknown. Part G.2 inventories, workstream by
workstream, the unblocked engineering work the corrected matrix reveals: **eighteen of
the 28 workstreams that are not Complete carry engineering work that no external party
is holding.** Four have genuinely none available: WS20, WS29, WS30 and WS31. WS36 has
none available from this environment specifically. WS12, WS15, WS18 and WS19 sit between.

The corrected answer, in G.3, is two-part. On whether owner-blocked and evidence-blocked
work displaced product work: partly yes. On whether that happened because nothing else
could be built: no. That was the false part.

**G.2 is ordered by workstream number precisely so it cannot be read as a sequence.**

---

## 4. Recruitment correction 1: what ELITE-1-AT actually validates

Codex: *"ELITE-1-AT's public session must not be presented as validating the 22
outstanding private-flow accessibility findings. Those findings are fixed and awaiting
independent verification, not 'known broken.'"*

**What the kit said.** It justified A1's public-only scope by saying registration, the
Listing Studio and the dashboard were out of scope "because 22 accessibility findings in
those surfaces are already recorded and not yet independently verified, and sending a
participant into known defects tests the participant rather than the product." That
sentence does two wrong things at once. It describes fixed surfaces as known defects, and
it lets a public-path session stand in for verification that no public-path session can
perform.

**What it now says.** Four statements, in this order, in
`docs/research/elite-1-recruitment-sheet.md`:

1. **The scope.** A1 covers the home page, the listings index with one filter applied,
   one listing detail page including its Evidence Passport, and the requirement form up
   to but not through submission. In journey terms that is journey 1, Find and enquire,
   up to the enquiry, and the first screen of journey 2, Post a space requirement.
2. **What A1 validates, stated exactly.** Whether those four public surfaces can be
   operated with a screen reader.
3. **What A1 does not validate.** A1 does not verify the 22 accessibility findings
   recorded in the private flows. Those findings are fixed and awaiting independent
   verification. They are not known-broken surfaces and must not be described as such.
4. **The authenticated round is separate, and it is also required.** **ELITE-1-AT-B**,
   run with a prepared test account and seeded inventory against registration, the
   Listing Studio and the dashboard, with the participant consenting to operate an
   account under observation, scheduled after the ELITE-1 write-up.

And the standing rule that makes the correction hold: **until ELITE-1-AT-B has run and
its results are recorded, no document may state that the 22 findings are closed.**

The same statement is added to `docs/research/elite-1-instrument-en.md` after the
ELITE-1-AT scope paragraph, and at parity to `docs/research/elite-1-instrument-ar.md`.

**Why a new round rather than a wider A1.** Verification of a fix is not the same activity
as discovery with a participant, and it needs a prepared account, seeded data and consent
to be observed inside a logged-in session. Folding it into A1 would have produced a
session that does neither job properly. ELITE-1-AT-B is therefore named, scoped and given
a position in the schedule rather than left as an intention.

---

## 5. Recruitment correction 2: raw notes are bounded by a date

Codex: *"Do not retain raw pseudonymous research notes for as long as a finding remains
open, which could become indefinite. Establish a bounded raw-notes period, recommended
maximum 90 days after the final session, then retain only synthesized findings without
participant identifiers."*

**What the kit said.** "The notes are kept for as long as the findings they support are
open." That is a condition, not a bound. A finding can stay open for a year, and the
retention period silently follows it.

**What it now says.** Raw notes are kept for a bounded period, and the bound is a date
rather than a condition:

- Raw pseudonymous notes are retained for a **maximum of 90 days after the final session
  of the round**.
- On or before day 90 the raw notes are destroyed and only the synthesized findings are
  kept. The synthesized findings carry no participant identifier of any kind, including
  seat labels such as S1 or D3, no per-participant attribution, and no verbatim quotation
  that could be traced to one person.
- **A finding that is still open on day 91 is carried by its synthesized form.** That
  clause exists so the bound cannot be quietly extended by appeal to an open finding,
  which is the exact failure Codex named.
- **Any duration other than 90 days is an owner or counsel decision and is recorded as
  one** in `docs/decision-register.md` before the round runs, not after.

90 days is applied as a builder default under Codex's recommendation, so nothing waits on
a ruling. The rule is added at parity to both instruments and recorded against decision
O19 in `docs/decision-register.md`, with a note that if O19 later permits recording, the
retention period set for the recording is a separate figure and does not extend the
raw-notes bound.

---

## 6. What was recorded where

| File | Change |
| --- | --- |
| `docs/baseline-enhancement-plan-2026-07-22.md` | **New, 830 lines.** The original enhancement plan of 22 July 2026, unedited, under a provenance header giving the source, file id, timestamps, byte counts and the disclosure in section 2 above |
| `docs/roadmap-reconciliation-gate.md` | **Rebuilt, 331 lines to 494.** Parts A to H. Part A opens with what was wrong. Parts C, D and G are new work; B, E and F are carried forward corrected |
| `docs/research/elite-1-recruitment-sheet.md` | Both corrections. Header section renamed to record that three corrections have now been made to this kit and when |
| `docs/research/elite-1-instrument-en.md` | Both corrections, at parity |
| `docs/research/elite-1-instrument-ar.md` | Both corrections, at parity, in Arabic |
| `docs/status-ledger.md` | Position refreshed to `d34ebfa`. Header gains the paragraph separating present truth from intended scope. Section 2: the PKG-KIT-REC row now records that its reconciliation was rejected, and a PKG-REC-COR row records the correction. Section 7: the recruitment row carries both new corrections; the finding 193 row's sequencing condition is rewritten, because the gate it referred to no longer decides the sequence |
| `docs/decision-register.md` | O18's sequencing sentence rewritten for the same reason. O19 gains the raw-notes bound |
| `docs/findings-register.md` | Row 193's sequencing sentence rewritten to match |
| `docs/handback-recruitment-kit-and-reconciliation.md` | A superseding notice added at the top. **Its body is left unedited on purpose.** Sections 4 and 5 are wrong; correcting them in place would hide the error rather than answer for it. The notice says exactly which parts are superseded and by what |
| `docs/handback-reconciliation-corrected.md` | New. This document |

**On leaving the old handback standing.** The ledger's own maintenance rule says that
where the ledger and a package narrative disagree, the ledger is corrected and the
narrative is left alone, because narratives record what was believed at a time. That rule
is applied here rather than suspended for a case where it is inconvenient.

---

## 7. What was deliberately not done

- **No implementation.** No file under `src/` was touched. No migration was written. The
  eighteen workstreams with unblocked engineering work in part G.2 are inventoried, not
  started.
- **No participant contacted.** ELITE-1 outreach authorisation remains a separate owner
  sentence and has not been given. ELITE-1-AT-B is defined and unscheduled against real
  people.
- **No package chosen.** Codex and Saleem approve the product sequence after the
  corrected matrix.
- **One conflict, resolved and recorded rather than silently obeyed.** Relay item 5 of
  the original commission asked this document for a recommended sequence. The rejection
  then forbade using it to choose the next package. The later instruction governs. Rather
  than dropping the earlier requirement without comment, the gate's header records that
  the commission is superseded on that one point, and part G.2 is ordered by workstream
  number so it cannot be read as a ranking. This is stated so that Codex can see the
  earlier instruction was not forgotten.
- **The baseline was not edited to match what was built.** Not one line of the plan was
  reconciled, tidied or updated. Where the plan and the product disagree, the disagreement
  is recorded in the gate and the plan is left alone.

---

## 8. Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean |
| `npm test` | 1679 pass, 0 fail. Unchanged, because nothing under `src/` moved |
| `npm run ar-lint` | Clean |
| `node scripts/prose-scan.mjs` | `GATE` 0 hardcoded prose strings in 0 files. `BASE` 372 in 16 files, deferred to the page-redesign packages. `NOTE` 1781 library strings |
| Em dash and en dash | Zero in all ten touched documents, verified by character scan rather than by eye |
| `npm run build` locally | Not run as evidence. It fails in this environment on four `next/font` errors because Google Fonts is unreachable from the sandbox. The production build evidence is the Vercel READY state below |
| Vercel | **No build was created for `4dcfb93`.** `list_deployments` returns zero for the window from the push to ten minutes after it, and the production alias still resolves to `dpl_9FuZYiaZAdymW2DWpMv2sd4pH1SW` at `d34ebfa`. No GitHub webhook fired, which is the same characterised gap `d2d2fb5` hit and which `docs/status-ledger.md` already records. This is stated rather than smoothed: the READY gate for `4dcfb93` is not satisfied by a build of its own, and it is carried by the next commit that does build |

**On the missing build, and why it changes nothing rendered.** `4dcfb93` touches ten
files, all under `docs/`. Next.js does not read `docs/` at build or at request time, so
the pages the production alias serves at `d34ebfa` are byte-identical to the pages a
build of `4dcfb93` would serve. The absent build is a gap in the evidence trail, not a
gap in what is deployed, and it is recorded as the former.

**Live EN and AR evidence, and why this section is short.** The directive requires live
bilingual and responsive evidence after each package. This package changed no rendered
surface in either language: every file it touches is under `docs/`, and no route, no
component, no dictionary key and no style was modified. The honest evidence is therefore
the deployment confirmation rather than a set of page reads, and presenting page reads
here would be evidence of nothing. The last commit carrying a source change is still
`994f02e`.

---

## 9. What is now owed, by whom

**By Codex and Saleem.** The product sequence. That is the one thing this document is
forbidden to decide, and the corrected matrix exists to inform it. Part H of the gate
lists the four other advisor or owner inputs still open, including the WS14 service-worker
scope variance and whether the Dropped label may ever be used without a written approval.

**By the owner, unchanged from the previous handback.** ELITE-1 outreach authorisation,
decision date 1 October 2026. The Supabase migration for finding 117. The Arabic font
workflow file. The two RLS advisories. Decision O19. The counsel memorandum behind O5 and
O13. The REGA and Ejar permitted-use question behind O10.

**By the owner, new.** Nothing, unless a raw-notes retention period other than 90 days is
wanted, in which case that is an owner or counsel decision recorded before the round runs.

**Independent verification, unchanged in substance but now correctly named.** The 22
accessibility findings in the private flows are fixed and awaiting independent
verification. ELITE-1-AT-B is the round that verifies them. Until it has run, no document
may state that they are closed, and this one does not.

---

*Documentation only. No code, no package, no implementation started, no participant
contacted. Rebuilt against `docs/baseline-enhancement-plan-2026-07-22.md`, which is the
original enhancement plan of 22 July 2026 preserved unedited.*
