# Handback: the corrected recruitment kit and the roadmap reconciliation gate

Written against the Codex review of 2026-08-02 at main HEAD `77f26a5`, which
conditionally accepted the previous batch and set four items. This handback returns
items 3, 4 and 5 together, as instructed: *"Return the corrected recruitment kit and
the consolidated no-skip reconciliation in one handback."*

**No implementation package was started.** No source file was touched. The test suite
is unchanged at 1679 because nothing under `src/` moved.

> **Superseded in part, 2026-08-02.** Codex reviewed `d34ebfa` and accepted the O18
> record and the substantive recruitment corrections, but rejected the roadmap
> reconciliation gate this handback returned as item 5. The gate has been rebuilt from
> the original enhancement plan, which was recoverable the whole time and is now
> preserved at `docs/baseline-enhancement-plan-2026-07-22.md`. **Sections 4 and 5 of
> this document are wrong and are superseded by
> `docs/handback-reconciliation-corrected.md` and by the rebuilt
> `docs/roadmap-reconciliation-gate.md`.** They are left standing rather than edited,
> because a narrative is a record of what was believed at a time and correcting it in
> place would hide the error rather than answer for it. Every figure in sections 4 and
> 5, including the line count, the ten "unrecoverable" titles, the substitute journeys
> and the conclusion about engineering time, should be read only as evidence of what
> the rejected version claimed.

---

## 1. What this handback answers, item by item

| Codex item | Status returned |
| --- | --- |
| 1. Finding 203, engineering-complete, awaiting interactive deployment verification | Unchanged and correctly held. Still "Fixed and awaiting interactive deployment verification" in the findings register. The one session that closes it is item 5 of the recommended sequence below |
| 2. Finding 117, owner-blocked on the Supabase migration and four artefacts | Unchanged and correctly held. Action card at `docs/owner-actions-adv-1c1.md` section 4 |
| 3. Finding 193, ruling O18 to be recorded now, implementation not to begin until the reconciliation establishes its position | **Recorded.** Position established: O18 clause 1 only, sequenced sixth. See section 2 |
| 4. ELITE-1 outreach not released; correct the recruitment kit first, on three counts | **All four corrections applied** across three files. See section 3 |
| 5. One no-code roadmap reconciliation gate before any further broad package | **Delivered** as `docs/roadmap-reconciliation-gate.md`, 331 lines, sections A to H. See section 4 |

---

## 2. Item 3: ruling O18 recorded, and its position established

The ruling is recorded in three places, in the form Codex gave it and without
smoothing.

`docs/decision-register.md` moves O18 into the closed table carrying all four clauses:
the cryptographically strong one-time withdrawal token displayed once at confirmation
and stored only as a hash for new anonymous requirements; the manual privacy-request
route for existing requirements and lost-token recovery, available once the approved
privacy contact surface exists; dashboard-managed withdrawal in the mature organisation
workflow; and the refusal of reference-code-plus-email authentication. The register
states plainly where the ruling and this builder's earlier recommendation differ,
rather than quietly adopting the ruling as though it had always been the proposal, and
the original analysis is preserved under a heading that says it is kept as filed.

`docs/findings-register.md` row 193 records the ruling and **explicitly withdraws its
own earlier sentence**, which had named the now-refused reference-code-plus-email
mechanism as the smallest complete remedy. A register that quietly deletes a
recommendation a ruling overturned is a register that cannot be audited.

`docs/status-ledger.md` section 7 restates the four clauses and the sequencing
condition. Finding 193 stays open, and the reason for staying open has changed: it is
no longer waiting on an unanswered owner question, it is waiting on sequence.

**The position the reconciliation establishes.** Implement clause 1 only, and sequence
it sixth. Clause 1 is the one part of finding 193 that depends on nothing external: a
token generated, hashed, stored and shown once needs no counsel memorandum, no privacy
contact surface and no organisation workflow. Clause 2 waits on O5, because a manual
privacy-request route needs a lawful contact surface and O5 is the memorandum that
establishes one. Clause 3 waits on the mature organisation workflow, which does not
exist. Clause 4 is a refusal and needs no build at all. Clause 1 is sequenced sixth
rather than first because five owner actions ahead of it each unblock more than it
does, and because building a withdrawal path for anonymous requirements is worth more
after real people have created some.

---

## 3. Item 4: the four recruitment kit corrections

Three files changed: `docs/research/elite-1-recruitment-sheet.md` (438 lines),
`docs/research/elite-1-instrument-en.md` (745 lines) and
`docs/research/elite-1-instrument-ar.md` (628 lines). The two instruments are at full
parity; every change below landed in both.

### 3.1 Mobile coverage is now an allocation, not an accident

The sheet previously said a mobile session was worth more than a cancelled one and
pointed at the observation sheet's device column. That is coverage by chance, and
Codex was right to refuse it. Those sentences are deleted.

Three of the ten demand-and-supply seats now carry a device requirement decided
**before** outreach:

| Mobile seat | Seat it occupies | Device and browser | Language | Substitutable |
| --- | --- | --- | --- | --- |
| M1 | D1 | iPhone, Safari | Arabic | No |
| M2 | D5 | Android, Chrome | Either | Yes, to another demand seat |
| M3 | S3 | Either handset, whichever the participant carries | Either | Yes, to another supply seat |

M1 is declared non-substitutable and the reason is stated rather than asserted:
Arabic on a small screen is where RTL layout, Arabic line breaking, the font stack and
touch-target spacing fail together, and neither a desktop Arabic session nor an English
mobile session tests that combination.

Four rules follow. **A physical handset, not a resized window**, with the difference
enumerated: a 390px desktop window has a mouse pointer, a hardware keyboard, no
on-screen keyboard, no address bar that grows and shrinks, no thumb reach, no iOS
Safari form behaviour and no real network. The automated reflow and responsive probes
already cover 320, 360, 390 and 430; what they cannot cover is the reason these seats
exist. **How a handset session is observed**: the participant shares their phone
screen, the fallback is a laptop for audio with a camera pointed at the phone, and the
facilitator does not drive. **The tasks do not change**: same scripts as far as
possible, and a task that cannot be attempted is recorded as not attempted with the
reason, and that record is itself a finding. **The gate**: the round does not close
with fewer than 3 mobile sessions and does not close without M1.

The seat tracker gained a "Device required" column so the requirement is visible at the
point of scheduling rather than buried in prose.

### 3.2 The assistive-technology round is separate and required

ELITE-1-AT is now a **separate required round**, minimum one session, seat A1, and the
claim of stage E1 does not stand without it. Three reasons it is separate rather than a
seat inside the main round: a different recruiting channel, a different scope, and a
different failure mode.

| Seat | Who | Technology | Scope |
| --- | --- | --- | --- |
| A1 | A daily screen-reader user, using their own configuration and their own speech rate | VoiceOver on iOS Safari, or NVDA on Windows Chrome | Public path only |

Public path means home, the listings index with one filter applied, one listing detail
with its Evidence Passport, and the requirement form up to but not through submission.
Registration, the Listing Studio and the dashboard are out of scope for this round
because 22 accessibility findings there are recorded and not independently verified;
sending a screen-reader participant into known-broken surfaces tests the participant's
patience, not the product. A1's exclusion criteria drop the CRE-experience requirement,
because the question being asked is different.

### 3.3 The recording policy is corrected: round one is notes only

Codex offered two ways out of the contradiction. The choice made is the first one.

**Round one is notes only. No audio, no video, no screen capture, on any of the eleven
sessions including A1.**

The reasoning is on the page rather than in a commit message. Defining an explicit
recording position properly means naming a storage location, a retention date, a named
access list, a deletion method and a lawful processor. `docs/status-ledger.md` section
7 records the enterprise AI agreement and processing terms as not signed, so there is
no approved processor a recording could lawfully be sent to. The sheet states it
directly: *"Rewording the claim while keeping the recording would have removed the
contradiction from the page and left it in the round. Removing the recording removes it
from both."*

The prohibition on unapproved external AI transcription is explicit and is not treated
as a formality: the call platform's automatic transcription, meeting summary and AI
notetaker are switched off **before** every session rather than after it starts, and the
facilitator's own typed notes are not pasted into any service the owner has not
recorded. Whether a later round may record, and on what terms, is now **decision O19**
in `docs/decision-register.md`, carrying the seven data-protection elements that would
have to be settled first.

A1 is notes-only for an additional reason stated separately: a screen reader's speech
output is a recording of the participant's own assistive configuration, their voice
choice, speech rate, verbosity settings and navigation habits. That is personal data
about a disability-related setup, and it is not captured here at all.

### 3.4 The "nothing personal is retained" claim is gone

Replaced by a section that says what is actually true. The research record is
**pseudonymous, not anonymous**: a round of ten in a market this size is re-identifiable
from a role and a city. The recruitment list with real contact details stays with the
owner on the owner's own device and never enters the repository. No commit may carry a
participant's name, employer, phone number or email. Notes are kept as long as the
findings they support are open, and a participant may ask for their row to be struck.
Written consent forms and longer retention are an O5 counsel item, whose absence does
not block a notes-only round but whose presence would be required before any round that
records.

### 3.5 The four downstream costs of notes-only, handled rather than hidden

Removing the recording breaks four things elsewhere in the instruments. All four were
fixed at parity rather than left as silent inconsistencies.

Task times previously came from the recording; they now come from a timer the
facilitator starts as each task is read and stops when the participant is done, and the
instrument states the precision cost out loud: a few seconds at each end, so task times
in this round are compared against each other and are not reported to the second. The
observation sheet header field "recording consent yes or no" became "consent script read
yes or no", and "device and viewport" became "device class and viewport, whether the
device was a physical handset or a desktop browser". The findings template's "while the
recordings are still worth watching" became a notes-legibility clause that adds the part
that actually matters: under a notes-only round there is nothing to go back to, so write
up between sessions rather than at the end. The round summary's "sessions recorded
against sessions run" became "sessions run against seats offered", plus a device split
naming the three mobile seats and stating any shortfall rather than absorbing it, plus
whether ELITE-1-AT has run.

Both invitation templates, EN and AR, now say the call is not recorded. Owner time rose
from about 12 hours over 10 sessions to about 13 hours over 11 sessions of 45 minutes,
with the note that notes-only does not reduce that figure, it moves it.

---

## 4. Item 5: the roadmap reconciliation gate

`docs/roadmap-reconciliation-gate.md`, 331 lines, no code, no package proposed.

### 4.1 Two inputs this repository does not contain, stated first

A reconciliation that quietly invents what it cannot find is worse than one that comes
up short, because the invention outlives the gap.

**Ten of the 37 workstream titles are unrecoverable.** A `WS<nn>` token search across
every markdown file in the repository returns 27 distinct numbers. WS21, WS22, WS24,
WS25, WS26, WS27, WS32, WS33, WS35 and WS37 appear nowhere. They are carried as rows
marked "Not started, title unknown", because a workstream whose title is unknown is
still a workstream, and deleting the row would be the same act as labelling it Dropped.
A numbering-band clustering is offered as a signal only, and names none of them.

**The six-journey list is not recorded.** Four journeys are named once, at
`docs/accessibility-elite-4.md` line 90. Five independent searches are enumerated in the
document with their null results. Rather than invent two, part D reconciles the four
named ones and proposes two candidates read off the product's own surfaces, labelled as
candidates.

### 4.2 The 37 workstreams, split as Codex asked

Split on the outcome rather than on the effort: a workstream is visible if a person
using the product would notice its absence, and foundational if they would not.

**Visible product work, 15 rows.** Complete: WS07, WS08, WS10, WS11, WS16, WS17, WS23.
Partial: WS09 (physical-handset evidence missing), WS12 (noindex), WS14, WS15, WS19
(Map Phase 2 deferred; owner ruling 5 closed at `b3e2dfa`), WS31 (O4). Blocked: WS28,
WS29 (O1). WS28 is named as the single largest visible gap between this product and the
stated objective of a transaction operating system, because no deal workspace exists.

**Foundational work, 12 rows.** Complete: WS01 to WS06, WS34. Partial: WS13 and WS18,
both on O16. Blocked: WS20 (O10 and O13), WS30 (O5, flagged as the highest-value owner
unblock in the document), WS36 (the missing `workflow` token scope).

**The ten unrecorded, 10 rows**, as described above.

### 4.3 The journeys, ledger and findings register

The four named journeys are all Partial, carrying their ELITE-4 defect counts: J1
authentication and organisation onboarding at 30, J2 Listing Studio and inventory
management at 29 with two of the three ledger conditional acceptances living there, J3
search, listing detail and Evidence Passport at 44 and the worst of the four with the
observation that it is the most built so it is the most inspected, and J4 requirement
creation and matching at 23. Two candidates are proposed and labelled: C5 market
intelligence and research, blocked on O10, O13 and the unsigned AI agreement; C6
transaction preparation, not started, blocked on O14, O12 and O5. Replacing either
candidate costs one sentence from the owner and nothing else, because no work is
sequenced against them.

The ledger is reconciled across O1 to O19 with a cost-of-leaving-it column. The three
conditional acceptances are restated, with the note that none of the three is a defect:
all three are evidence this environment cannot produce, because the only live channel
here is unauthenticated GET.

The findings register is reconciled at 205 rows, 126 closed and 79 open by the ledger's
own parse. P0 6 open, with the honest note that these are not six live defects. P1 19
open, which reduces to 13 genuine P1 engineering items once owner-ruling and
verification-gated rows are subtracted. P2 53 open. P3 0. P1 fell from 55 to 19 across
PKG-A11Y-1, which carried 47 rows and raised 13 new findings of which 8 closed inside
the package. A package that raises findings while closing them is working correctly.

### 4.4 The displacement question, answered directly

Codex asked whether design, discovery, conversion, workspace, matching, notifications
and mobile experience are being displaced by governance and hardening. The answer given
is **yes, recently, and for defensible reasons that have now run their course**, with
the early visible-outcome majority named against the recent governance sequence, and
with two explicit exemptions: PKG-ELITE-E1 slice E and PKG-A11Y-1 slices B to R are
visible product work by any honest reading, and finding 203 sits closer to the line
because bilingual refusal messages are hardening by motivation and visible by effect.

Then the inversion, which is the finding the gate exists to produce:

> **Every single visible workstream still marked Partial or Blocked is waiting on
> something other than engineering time.**

WS09 and WS14 on mobile evidence, which waits on outreach authorisation. WS12 and WS15
on owner ruling 1. WS28 on O14. WS29 on O1. WS31 on O4. WS20 on O10. Not one is waiting
for a builder to be free. The risk is therefore not that governance is eating the
roadmap; it is that there is very little unblocked visible work left at E0, and that
opening another broad package would mean building depth into journeys no external person
has ever attempted. The product has 50 preview listings, 6 requirements and 0 registered
interests. The E0 to E1 gate is a design-partner alpha, and nobody has been contacted.

### 4.5 The recommended sequence

1. Authorise ELITE-1 outreach. The kit is corrected and ready. Unblocks WS09, WS14 and
   the verification half of all four named journeys at once.
2. Rule O1, O4, O15 and O16 in one sitting. None requires counsel or a purchase.
3. Commission the counsel memorandum, O5. Highest leverage and slowest, so it starts
   now rather than later. It also unblocks O18 clause 2.
4. Apply the finding 117 migration and collect the four artefacts.
5. Run the one interactive Arabic session that closes finding 203.
6. Implement O18 clause 1 only.
7. Then the next broad package, chosen from what ELITE-1 actually found.

Items 1 to 5 are owner actions. Item 6 is the only engineering work the document
recommends, it is small, and it is deliberately the sixth thing rather than the first.

---

## 5. Owner inputs the gate could not supply

1. The ten unrecorded workstream titles: WS21, WS22, WS24, WS25, WS26, WS27, WS32,
   WS33, WS35, WS37. Ten titles, or a statement that the original enhancement plan is
   lost and the numbering should be re-based.
2. The authoritative six-journey list. Four are named; two are proposed and labelled.
3. Decision O19, whether a later ELITE round may be recorded and on what terms. Round
   one is notes only and needs nothing.
4. Whether any row should be labelled Dropped. None is, and none will be without
   explicit approval.

---

## 6. Gates run before this handback shipped

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean, exit 0 |
| `npm test` | 1679 tests, 1679 pass, 0 fail. Unchanged, because no source file was touched |
| `npm run ar-lint` | `ar-lint: clean` |
| `node scripts/prose-scan.mjs` | GATE 0 hardcoded prose strings in 0 files. BASE 372 in 16 files and NOTE 1781 remain deferred and out of scope |
| Em dash count on every touched document | 0 on all seven files |
| Vercel READY at the shipping SHA | Confirmed by reading `meta.githubCommitSha`, recorded in ledger section 1 |

The reflow and radio probes were not re-run. No rendered surface changed in this batch;
every file in it is documentation. That is stated rather than omitted.

---

## 7. Files in this batch

| File | Change |
| --- | --- |
| `docs/decision-register.md` | O18 closed with all four clauses and the difference from the earlier recommendation stated. O19 opened |
| `docs/findings-register.md` | Row 193 records the ruling and withdraws its own superseded recommendation |
| `docs/status-ledger.md` | Section 1 position refreshed to `77f26a5`. Section 2 gains this batch. Section 7 rewritten for finding 193 and design-partner recruitment |
| `docs/research/elite-1-recruitment-sheet.md` | Device coverage allocated, ELITE-1-AT added, recording position corrected, retention claim replaced, seat tracker extended |
| `docs/research/elite-1-instrument-en.md` | Notes-only conversion, mobile and ELITE-1-AT standing constraints, four downstream consistency fixes |
| `docs/research/elite-1-instrument-ar.md` | The same, at full parity |
| `docs/roadmap-reconciliation-gate.md` | New. The no-skip reconciliation, sections A to H |
| `docs/handback-recruitment-kit-and-reconciliation.md` | New. This document |

---

## 8. What happens next, and what does not

Recruitment may now run in parallel with the next approved user-facing package, as
Codex stated, once the owner authorises outreach.

**No new implementation package has been started, and none is proposed here.** The next
engineering action this builder recommends is item 6 of the sequence, O18 clause 1, and
it waits behind five owner actions by design.

---

*Written under the Codex review of 2026-08-02. Returned as one handback, as instructed.*
