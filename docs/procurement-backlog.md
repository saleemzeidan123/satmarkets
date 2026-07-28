# Contract and procurement backlog (ADV-0)

The register at `docs/regulatory-register.md` states what each permission question is.
This file states what the owner would have to obtain to close it, in the order that
returns the most product per unit of owner effort, and exactly what changes in this
repository on the day an answer arrives.

**Owner ruling 7 of 2026-07-28 governs every line below.** Nothing here is bought,
no vendor is contacted, no agreement is signed, and no entry represents that a right
exists. These are drafted requirements waiting on an owner decision. Until one is
closed with written evidence, the feature it unblocks stays disabled in code, not
disabled by convention.

## How an item closes

An item is not closed by an email that sounds encouraging, by a vendor's marketing
page, or by a reading of a public licence that we found persuasive. It closes when
three things exist together:

1. A written statement of the permission, from the party that holds it.
2. The corresponding `source_registry` row moved to `rights_status = 'evidenced'`
   with the specific policy columns set and `licence_ref` pointing at the document.
3. The code gate that reads that row, or the constant that stands in for it, changed
   in the same commit as the row.

Item 2 without item 3 is a database row that no surface consults. Item 3 without item
2 is a feature that believes in a permission nobody wrote down. The sequencing rule
in ADV-0 is that they move together or neither moves.

## Ordering

The order is not the order of the ADV packages. It is the order of leverage. One
instruction to counsel answers three questions that block four surfaces, so it sits
first even though the surfaces it unblocks belong to later packages. The location
intelligence pilot sits last, not because it is unimportant, but because it is the
only item whose failure mode is a confident wrong number rather than a missing one.

---

## 1. Saudi counsel memorandum

**Question.** Three, in one instruction. First, the activity scope of FAL 1200025510
per surface, as tabulated at register A1: which of the live and planned surfaces sit
inside the licence we hold, and whether the analytics and consultation activity is a
separate licence (O13). Second, the lawful basis for external notification channels
under the electronic communications rules, affirmative opt-in or opt-out, per channel
(O12). Third, the content the legal pages must carry, which is finding rank 9.

**What it costs while open.** The bulletin, the HBU surface, investment scenarios and
public market commentary are all held private or noindex on the narrower reading of
the licence. All external notification channels in ADV-2 stay disabled and only
in-product notification ships. The legal pages stay as placeholders.

**Closes when.** A written memorandum answering the A1 table row by row, with the
stop conditions counsel considers material.

**Repository effect.** Register A1 statuses move from unknown; O12 and O13 close in
`docs/decision-register.md`; `routePolicy.ts` gains or does not gain the affected
routes; the ADV-2 consent model chooses its default from the ruling rather than from
the strictest guess.

**Why first.** It is the only item on this list that is answered by instructing one
party, requires no counterparty negotiation, and unblocks work in three separate
packages.

---

## 2. REGA and Ejar permitted use (O10)

**Question.** Whether SAT Markets may publish values derived from the REGA Rental
Index (Ejar), whether users may export them, whether an assistant may retrieve them,
and what attribution string is required.

**What it costs while open.** `rega_ejar` sits at `rights_status =
'asserted_unverified'` with `derived_display_policy = 'internal'`, so the Rent Index,
which is the highest-value evidence surface in the product, cannot render a derived
figure publicly, cannot be exported and cannot be retrieved by the advisor. The
attribution requirement is separately fixed by owner ruling 2 and does not depend on
this answer: every Rent Index reference retains the REGA Rental Index (Ejar)
attribution whatever else is agreed.

**Closes when.** A written permitted-use statement covering derived values, export,
retrieval and attribution.

**Repository effect.** The `rega_ejar` row moves to `evidenced` with its policy
columns set, and every surface reading `mayDisplayDerived` and `mayExport` opens
without a code change, which is the property the ledger was built for. `mayAiRetrieve`
opens for the advisor only if the statement covers retrieval explicitly.

---

## 3. Enterprise AI agreement

**Question.** Whether a provider agreement exists that covers training exclusion,
retention and deletion, processing region, subprocessor list and change notice,
incident notification, audit rights, and a processing agreement adequate under PDPL.
The full requirement is at register Part D.

**What it costs while open.** `AI_AGREEMENT_IN_FORCE` in `src/lib/aiBoundary.ts` is
false, so no unpublished platform data, no personal data of any party and no
verification evidence reaches an external model. The advisor sends only the user's own
words and counts, which is what `ADVISOR_PROMPT_PARTS` declares and what the tests
assert. ADV-3 agents that would read a document, a deed or an enquiry thread cannot
be built against an external provider until this closes.

**Closes when.** A signed agreement covering Part D, held by the owner.

**Repository effect.** `AI_AGREEMENT_IN_FORCE` flips to true in a commit that names
the agreement, deliberately as a code change rather than an environment variable, for
the reason recorded in that file. The source gate does not move with it: a provider
agreement does not create a licence we never had, and the test suite asserts that
independence in both directions.

---

## 4. SPL National Address

**Question.** The written redisplay terms for the National Address dataset.

**What it costs while open.** `spl_address` sits at `asserted_unverified` with every
policy column at `none`, so address verification cannot render, be derived from, or be
exported.

**Closes when.** Signup completes and the terms are read and recorded, not summarized
from the signup page.

**Repository effect.** The `spl_address` row gains its policies and its `licence_ref`.

---

## 5. Maps and points of interest

**Question.** Nothing to procure yet. Decision D27(a) already closed this harder than
the strategy proposed: no isochrone cache, no Navigation-scoped token. The item is
listed so that a future package does not treat the absence of a contract as an
oversight and go looking for one.

**What it costs while open.** Nothing that is currently planned. Travel-time and
catchment claims are not on any roadmap surface.

**Reopens when.** A package proposes a surface that needs derived travel time, at
which point the provider terms are read before the surface is designed, not after.

---

## 6. Processing agreements

**Question.** Whether every processor that touches personal data is under an adequate
agreement: hosting, database, email, any analytics, any future notification channel.

**What it costs while open.** It is a compliance exposure rather than a feature block,
which is precisely why it is the item most likely to be skipped. Register C1 records
the roles; this item records that the paper has to exist for each of them.

**Closes when.** Each processor is enumerated with its agreement reference.

**Repository effect.** Register Part C gains the reference list.

---

## 7. Contributor agreements (ADV-6)

**Question.** The permission scope, correction obligation, audit right and revocation
mechanics for brokers, landlords, valuers and research partners, including the
question most contributor agreements leave silent: what happens to already-published
material when a contributor revokes.

**What it costs while open.** ADV-6 cannot open a contribution channel. Contributed
material has no registered source row and therefore no permission, which is the
correct fail-closed state and not a gap to be worked around.

**Closes when.** A template agreement exists that answers revocation explicitly.

**Repository effect.** Each contributor class becomes a `source_registry` row with a
revocation-aware `stop_condition`, and the correction history model from ADV-1 becomes
the mechanism the agreement's correction obligation is discharged through.

---

## 8. Location intelligence (ADV-5)

**Question.** Whether any provider, stc Geo Analytics or otherwise, can supply
mobility or visitation data on terms that permit publication. The sufficient-agreement
requirement is at register Part E and is deliberately long: coverage map and gaps,
historical depth, refresh cadence, sample construction and known biases, consent
provenance for the underlying subjects, minimum aggregation threshold, controller and
processor roles, storage location, cross-border basis, audit rights, deletion on
termination, and an explicit prohibition on user-level output.

**What it costs while open.** No mobility, visitation or demographic claim appears
anywhere. Register C2 records that the lawful basis for any such dataset is not
established.

**Closes when.** An agreement answers the full list, and a coverage validation against
known ground truth runs before the first figure is published.

**Repository effect.** ADV-5 builds the provider interface and the controlled pilot
against a disabled source row regardless, so that the interface is testable before any
agreement exists. The row opens only after both the agreement and the coverage
validation.

**Why last.** Every other item on this list fails by withholding a figure. This one
fails by publishing a figure that is confidently wrong because the sample did not
cover the district it described. A missing number is a visible fault. A wrong number
presented as evidence is the failure this whole programme exists to prevent.

---

## What is deliberately not on this list

Sources that are already evidenced and need nothing: GASTAT and SAMA publications, the
REGA permit check, the open Foursquare snapshot, Nafath, Wathq. Their rows carry a
`stop_condition` and are re-read on any release that adds a figure from them.

Broker research (`broker_overlay`) is `prohibited` rather than pending. JLL, CBRE and
Knight Frank each forbid reproduction without written permission, and seeking that
permission is not on this backlog because the product does not need it: the Rent Index
derives from a registered public source, which is a stronger position than licensing
someone else's research.

MOJ and Najiz are not on this list either. Decision D26 records that they are
interactive portals rather than data products and are never scraped, so there is no
procurement question, only a settled prohibition.
