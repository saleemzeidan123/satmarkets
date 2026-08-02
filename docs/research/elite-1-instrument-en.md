# ELITE-1 research instrument (English)

The first design-partner round for SAT Markets. Prepared under PKG-ELITE-E1 item 4.
The Arabic parity file is `docs/research/elite-1-instrument-ar.md`; the two are one
instrument in two languages, not a document and a translation of its summary. Any
change to one is made in the other in the same commit.

## What this is for

The product is at stage E0, engineering foundation. It has 50 published preview
listings, 6 requirements and 0 registered interests. That is not enough behaviour to
justify building another surface, and it is exactly the condition this round exists
to end: the next build decision should follow from watching 10 people try to do
their own work in the product, not from another round of internal reasoning.

The round is 10 sessions: 5 supply side and 5 demand side. It answers one question
per side.

Supply side: can a person who controls commercial space in Saudi Arabia get a
tenant-ready listing published, on their own, and can they tell what is still
missing and why it matters?

Demand side: can a person looking for commercial space find a candidate, understand
what the evidence behind it does and does not prove, and reach a real next action?

Everything below serves those two questions. A session that produces only "the
interface looks good" has failed, and section 10 is written to make that outcome
hard to reach.

## Standing constraints on this round

These are not preferences. They bound what may be run and what may be written down.

Confidential commercial requirements are not collected unless the participant has
explicitly agreed in the consent step and the storage method has been approved by
the owner. A tenant expansion plan, a rent figure under negotiation, a lease expiry
or a named counterparty is confidential by default. If a participant volunteers one
during a session, it is not written into the observation sheet, not typed into the
product, and not repeated in the findings; the facilitator notes only that a
confidential detail was given and moves on. Where a task needs a requirement, the
participant uses the supplied fictional brief in section 5.

No figure a participant states about their own portfolio is carried into the product
as a fact, into any document, or into any later claim about the Saudi market. This
round produces findings about the product, not market data.

Round one is notes only. No audio, no video and no screen capture is taken in any
session, including the ELITE-1-AT session. A voice or screen recording is personal
data, and this round has no approved storage location, retention date, access list
or lawful processor for one. The call platform's automatic transcription, meeting
summary and AI notetaker are switched off before every session, not after it
starts. The facilitator's typed notes are not uploaded to any transcription or
summarisation service the owner has not recorded. Whether a later round may record,
and on what terms, is decision O19 in `docs/decision-register.md`.

No participant is asked to sign, pay, publish or agree to anything on behalf of
their organisation. Nothing in a session is an offer, and no session creates a
commercial relationship.

Sessions run on the preview deployment, which is noindexed and carries the preview
banner. Nothing a participant types becomes public. Test listings created during a
session are sample data under the existing controls and are removed after the round.

Three of the ten sessions run on a physical handset, not on a desktop browser
narrowed to a phone width. The allocation is M1 on seat D1, iPhone Safari in
Arabic and not substitutable; M2 on seat D5, Android Chrome; M3 on seat S3, either
handset. A mobile seat runs the same task scripts as far as each task is possible,
and a task that cannot be attempted on a handset is recorded as not attempted with
the reason, which is a finding rather than a gap. The round does not close with
fewer than 3 mobile sessions and does not close without M1. The full reasoning is
in `docs/research/elite-1-recruitment-sheet.md` under "Device coverage, which is
not left to chance".

Assistive-technology validation is a separate required round, ELITE-1-AT, and not
an eleventh seat in this one. It is a minimum of one session, seat A1, a daily
screen-reader user on their own configuration, scoped to the public path only: the
home page, the listings index with one filter applied, one listing detail with its
Evidence Passport, and the requirement form up to but not through submission. A1 is
screened on daily assistive-technology use rather than on commercial real-estate
experience, and the task scripts below are applied only within that scope.

A1 validates whether those four public surfaces can be operated with a screen
reader. A1 does not verify the 22 accessibility findings recorded in the private
flows. Those findings are fixed and awaiting independent verification, and must not
be described as known-broken surfaces. Verifying them is a separate authenticated
assistive-technology session, ELITE-1-AT-B, run with a prepared test account
against registration, the Listing Studio and the dashboard, scheduled after this
round's write-up. Until it has run, no document may state that the 22 are closed.

Recruitment itself is an owner item. This instrument is ready to run; naming and
approaching 10 real participants is not something the builder does, and no
participant is contacted until the owner says so.

## 1. Participant criteria and screener

### Who counts

Supply side, 5 participants. Each one must personally control, or administer, at
least one commercial property in Saudi Arabia: office, retail, warehouse, showroom,
light industrial or mixed-use. Three groups qualify.

Landlords and property owners who decide the asking terms for their own space.
Asset managers or portfolio managers responsible for occupancy and income across
more than one asset. Leasing administrators who prepare and maintain the listing
material, whether in-house or at a managing agent.

Target mix across the 5: at least 2 who decide terms themselves, at least 2 who
prepare listing material themselves, at least 1 managing more than 3 assets, at
least 2 whose primary working language is Arabic, at least 1 who has never listed
on any online platform.

Demand side, 5 participants. Each one must have taken part in a decision to acquire
or lease commercial space in Saudi Arabia within the last 24 months, or be doing so
now. Three groups qualify.

Expansion or network managers choosing sites for a retail, food or service brand.
Acquisition or real-estate managers inside a company that occupies its own space.
Leasing or tenant-representation decision makers acting for an occupier.

Target mix across the 5: at least 2 currently in an open search, at least 2 whose
primary working language is Arabic, at least 1 whose search covers more than one
city, at least 1 who has used a Saudi listing portal in the last 12 months.

### Who does not count

Anyone employed by, invested in, or advising SAT. Anyone whose only real-estate
experience is residential. Anyone who cannot describe a specific property or a
specific search in the screener, because the tasks depend on the participant having
a real frame of reference to compare against. Anyone who requires a signed
confidentiality agreement before speaking, until the owner has approved one.

### Screener script

Read or send as written. Six questions, under 5 minutes. Stop at the first
disqualifying answer and thank the person.

1. In the last 24 months, have you personally listed commercial space for lease or
sale in Saudi Arabia, or personally taken part in choosing commercial space to lease
or buy? Which of the two?

2. Tell me about the most recent one in two or three sentences. What kind of space,
which city, and what was your part in it? (Open. Disqualify if the answer is
residential only, or if no specific case can be described.)

3. Who decides the asking terms, or the shortlist? You, someone you report to, or a
committee?

4. How many commercial properties do you handle now? (Supply side. Record the
number; do not disqualify on it.)

5. Which language do you work in for property matters, Arabic or English, and which
would you prefer for this session?

6. Have you used an online property platform for commercial space in the last 12
months? Which, and what did you use it for?

Record for each: side, role group, city or cities, portfolio size or search scope,
session language, prior platform use, device they will join on. That is the full
participant record. No name, employer, phone number or email is written into the
findings file; the recruitment list is kept separately by the owner and is not part
of this repository.

## 2. Invitation template

Sent by the owner, not by the facilitator, and not before recruitment is authorised.

Subject: 45 minutes on how commercial space gets listed and found in Saudi Arabia

Body:

I am building SAT Markets, a verified exchange for Saudi commercial real estate. It
is early and not public. Before building anything further I want to watch a small
number of people who actually do this work try to use it, because I would rather
find out now what does not work.

I would like 45 minutes of your time on a video call. You would use an early version
on your own screen and try a few ordinary tasks while I watch and stay quiet. There
is no presentation and nothing to prepare. There is nothing to buy, sign or agree to,
now or later.

You do not need to share anything confidential. If a task needs property details I
will give you a fictional example to use.

The call is not recorded. There is no audio, video or screen recording, and no
automatic transcript. I take written notes as we go, which means I will be typing
while you work, and the notes carry no name, employer or contact detail.

If you are willing, reply with two or three times that suit you in the next two
weeks and I will send an invitation.

Thank you either way.

## 3. Consent script

Read aloud at the start of every session, before the first task. Do not paraphrase
the third and fourth paragraphs.

Thank you for the time. Before we start, four things.

First, I am testing the product, not you. If something is confusing or you cannot
find something, that is the finding I came for. There is no wrong move here, and if
you get stuck, being stuck is the useful part. Please think out loud as much as you
can.

Second, this is an early version on a private preview. Nothing you do today becomes
public, and anything you create will be removed after this round.

Third, this call is not being recorded. There is no audio, no video, no screen
capture and no automatic transcript, and I have turned off the meeting summary. I
will be typing notes while you work, so if I go quiet and you hear a keyboard, that
is me writing down what you did and not me reacting to it. The notes have no name,
no employer and no contact detail in them, and they are used by me to write up what
I saw and nothing else.

Fourth, please do not tell me anything confidential about your business. I do not
want your actual rents, your tenants, your expansion plans or anyone's name. If a
task needs details I will give you a fictional example to use. If something
confidential comes out anyway, I will not write it down.

You can stop at any point, skip anything, or ask me afterwards to strike what you
said from my notes, and you do not have to give a reason.

Two more things about how I will behave. I will mostly stay quiet, even when it
looks like I could help, because the moment I help I stop learning. And at some
points I will ask what you expected to happen, which is not a hint that something
went wrong.

Any questions before we start?

Closing script, read at the end:

That is everything. Thank you. To confirm, nothing was recorded. What I have is
written notes about what happened on the screen, with no name and no contact detail
in them, and they stay with me. If you change your mind in the next week, tell me
and I will strike your session from them. Is there anything you would rather I did
not use?

## 4. Facilitator guide

### Before the session

Confirm the preview is up and the deployment commit is recorded. Confirm the
participant's test account exists and is signed in, or is ready to be created as
part of task S1. Open the observation sheet with the session identifier, side, role
group, language, device and start time already filled. Have the fictional brief from
section 5 open in a form you can paste into the chat. Close every other application
that can produce a notification.

### During the session

The facilitator's job is to keep the participant working and to record what happens,
in that order. Silence is the default. The facilitator does not point, does not
name a button, does not say "scroll down", and does not explain what the product
intends. Three sentences cover almost everything that needs saying.

"What are you trying to do right now?"

"What did you expect to happen?"

"What would you do if I were not here?"

When a participant asks a direct question, answer it with one of those three, once.
If they ask again, that is a help request: record it, then give the smallest possible
answer and note exactly what was given, because a task completed after help is not
an independent completion and the observation sheet has a separate column for it.

Stop a task at 8 minutes, or earlier if the participant has said twice that they
would give up. Record the stop as an abandonment with the reason. Do not let a
participant grind through a broken task to protect the facilitator's feelings; move
on and keep the session's remaining tasks intact.

If the product errors, breaks or shows something clearly wrong, do not apologise for
it at length and do not explain it. Note it, ask what they expected, and continue.
An apology teaches the participant to be gentle for the rest of the session.

Never say the word "just". "You just click here" is the single most common way a
facilitator destroys a session.

### Language and direction

The session runs in the participant's chosen language, and the product runs in the
same one. An Arabic session uses the Arabic interface throughout, right to left, and
the facilitator speaks Arabic. If a participant switches language mid-session,
record where and why, because a switch is itself a finding about the Arabic surface.

### Timing

45 minutes. Consent and warm-up 5. Tasks 30. Interview 8. Close 2. If tasks overrun,
cut the interview rather than the tasks, but never cut the confidentiality and
notification task on the demand side or the publication-readiness task on the supply
side, because those two carry the questions no other task answers.

### Warm-up, 3 minutes, before any task

Tell me about the last commercial space you listed, or the last one you looked for.
What did you do first? Where did that happen, and what did you use? What was the
most annoying part?

This is not small talk. It gives the comparison the whole session is measured
against, and the last question usually names the problem the product is competing
with.

## 5. Test accounts and data requirements

### Accounts

Ten accounts, one per participant, created before the round on the preview
deployment. Naming: `partner-s1` to `partner-s5` for supply side, `partner-d1` to
`partner-d5` for demand side. Each supply-side account belongs to a fictional
organisation created for the round; no real company name is used. Passwords are set
by the owner and given to the participant at the start of the session if the session
requires a sign-in; a participant is never asked to reuse a password of their own.

Task S1 is organisation registration, so at least 2 of the 5 supply-side accounts are
created live during the session rather than in advance. Which 2 is decided before the
round and recorded, because a participant who registers live and a participant who
starts signed in are not running the same task and their times are not comparable.

### The fictional brief, supply side

Given to the participant at the start of task S2, in their session language.

You manage a commercial building in Riyadh. You want to list one floor of it.

Floor area 640 square metres. Fourth floor. Shell and core, not fitted. Available
from the first of next month. You are asking 1,400 riyals per square metre per year.
Service charge is 120 riyals per square metre per year, on top. Parking: 12 bays
included. The building has two lifts and a backup generator. You have a title deed
and a municipality licence for the building, and photographs on your phone.

You do not have: an occupancy certificate to hand, a floor plan file, or the exact
year the building was completed. Those are the gaps the product should surface, and
the participant is expected to hit them.

### The fictional brief, demand side

Given to the participant at the start of task D1.

You are opening a second office in Riyadh for a company of 45 people. You need
roughly 600 to 900 square metres, fitted or shell, ready within four months. Your
budget is up to 1,600 riyals per square metre per year including service charge.
Parking matters: you need at least 10 bays. You would consider Al Olaya or the
northern ring, and you would not consider anything without a lift.

### Data requirements on the preview

The round cannot run against an empty catalogue. Before the first session, confirm on
the deployed preview, in both languages: at least 20 published listings visible at
`/listings` and at least 8 of them in Riyadh; at least 4 with more than one
photograph; at least 2 with an Evidence Passport carrying a real evidence record;
at least 1 with a visible gap so the demand-side participant can see what an
incomplete record looks like; `/rent-index` loading with its REGA Rental Index (Ejar)
attribution visible in both languages; `/requirements` loading with at least 2
published requirements.

Every one of those is sample data under the existing preview and noindex controls,
and is labelled as such. No participant is shown a figure the product is not
permitted to display. If a check fails, it is fixed before the round rather than
explained away during a session.

### What is never used

No real user, requirement, listing or document data belonging to anyone outside this
round. No participant's own portfolio typed into the product. No screenshot of a
participant's own systems.

## 6. Task scripts

Each task is read aloud as written, then the facilitator stops talking. The success
criterion is what the observer marks against; it is never read to the participant.

### Supply side, 8 tasks

**S1. Register the organisation and role.**

Script: You have decided to put a property on this platform. Start from here and set
yourself up, as far as you can get.

Start: `/` in the session language. Success: the participant reaches an authenticated
dashboard with an organisation and a role recorded, without being told where to go.
Watch for: whether they understand what an organisation is and why it is being asked
for, whether the role options describe what they actually do, and whether they expect
verification at this point.

**S2. Begin and complete a commercial listing.**

Script: Here are the details of the floor you want to list. (Give the brief.) Put it
on the platform.

Start: dashboard. Route: `/dashboard/new`. Success: a saved listing carrying asset
type, area, floor, condition, availability date, asking rent, service charge and
parking, with the figures matching the brief. Watch for: which field they hesitate
on, whether they read the field label above the number or guess from the box, whether
rent per square metre per year is entered as a total by mistake, and whether the
service charge lands in the right place. This is the longest task and the most
important one on this side.

**S3. Understand what is missing and why it matters.**

Script: Without changing anything, tell me what this listing still needs, and what
difference each of those makes.

Start: `/dashboard/listings/[id]`. Success: the participant names at least 3 of the
missing facts the product is showing and can say, for at least 2 of them, why a
tenant would want it. Watch for: whether they read the completeness list as a
requirement, a suggestion or a nag, and whether any item reads as an accusation.

**S4. Add media and place the first map pin.**

Script: Add the photographs, and show me exactly where this building is.

Start: the listing editor. Success: at least 1 photograph attached and a pin placed
whose recorded location the participant accepts. Watch for: whether they understand
that the pin and the recorded location are two different facts, what they do when the
product says the closest location is not the one on file, whether they take the
offered alternative, and whether the wording of a contradiction reads as a correction
or as a rejection. Finding 137 shipped in this area; this task is its first exposure
to a real user.

**S5. Understand verification and evidence.**

Script: This listing shows some things as verified and some not. Tell me what that
means here, and what you would have to do about it.

Start: the listing detail. Success: the participant can state, in their own words,
that a verified item rests on a document SAT has seen, and can name at least 1 thing
they would supply. Watch for: whether they believe verification is automatic, whether
they expect it to cost money or time, and whether they assume unverified means
rejected.

**S6. Preview the public listing.**

Script: Show me what a tenant would see.

Start: the dashboard. Route: `/listings/[id]`. Success: the participant reaches the
public detail page for their own listing without help. Watch for: whether they can
find the way through at all, whether the public page surprises them, and whether
anything they thought was private is visible.

**S7. Correct an error.**

Script: The asking rent is wrong. It should be 1,250, not 1,400. Fix it.

Start: wherever they are. Success: the figure is corrected and the participant is
confident it saved. Watch for: how long it takes to find the way back into the
record, whether they trust that the change took effect, and whether they look for
confirmation that is not there.

**S8. Understand publication readiness.**

Script: Is this ready for tenants to see? How do you know?

Start: the listing. Success: the participant states a position and points at
something in the product that supports it. Watch for: whether readiness is legible at
all, whether they confuse saved with published, and whether they expect SAT to review
it before anyone sees it.

### Demand side, 7 tasks

**D1. Find a suitable commercial space.**

Script: Here is what you need. (Give the brief.) Find me two or three places worth
looking at.

Start: `/` in the session language. Success: at least 2 candidate listings opened
that fit the brief on area and city, reached without help. Watch for: whether they
start from search, from the map or from the browse list, which filter they reach for
first, whether the filters use the words they use, and whether the result count means
anything to them.

**D2. Understand price, area, condition and evidence.**

Script: Take the one you like most. Tell me what it costs, how big it is, what state
it is in, and how much of that you would believe without calling anyone.

Start: `/listings/[id]`. Success: the participant states the rent basis correctly
(per square metre per year against total), the area, the condition, and separates at
least 1 evidenced fact from at least 1 unevidenced one. Watch for: the rent basis
above all. A participant who reads a per-metre rate as a total rent has been misled
by the product, and that is a P0 finding whatever else the session shows.

**D3. Compare options.**

Script: Now compare the two or three you found and tell me which you would take
forward, and why.

Start: wherever they are. Route: `/compare` if they find it. Success: a stated
choice with at least 2 reasons drawn from the records rather than from taste. Watch
for: whether they find any comparison surface, whether they resort to opening tabs
side by side, and what they say is missing from the comparison.

**D4. Create a structured requirement.**

Script: Rather than searching again next week, tell the platform what you are looking
for.

Start: dashboard or `/post-requirement`. Success: a saved requirement carrying area
range, city, budget basis and timing that match the brief. Watch for: whether they
understand who will see it, whether they hesitate to state a budget, and whether the
budget field's basis is unambiguous. Confidentiality anxiety here is a finding, not
an obstacle.

**D5. Understand a proposed match.**

Script: The platform is suggesting this one for your requirement. Would you look at
it, and why is it being suggested?

Start: the requirement's match view. Success: the participant can say at least 1
reason the match was proposed and states a would-look or would-not-look position.
Watch for: whether the explanation is believed, whether it is read at all, and
whether an unexplained match reads as an advertisement.

**D6. Control confidentiality and notification preferences.**

Script: Set this up so it contacts you the way you want, and so that only what you
are comfortable with is visible.

Start: `/notifications` and the requirement's own settings. Success: the participant
reaches both controls and states what is now visible to whom. Watch for: whether
they can tell who sees a requirement, whether the difference between anonymous and
identified is legible, and whether they expect to be contacted by agents. O12 is
unresolved and outbound matching notifications are off; what participants expect here
is direct input into that decision, which is why this task is never cut.

**D7. Progress to a meaningful next action.**

Script: You want to see this one in person. Do whatever you would actually do next.

Start: the listing. Success: the participant takes an action the product supports and
can say what happens after it. Watch for: whether they look for a phone number
instead, whether they trust a platform-mediated request, and what they expect the
response time to be.

## 7. Observation sheet

One sheet per session. The facilitator fills the header before the session and the
task rows during it. Because the round is notes only, times come from a timer the
facilitator starts as each task is read out and stops when the participant says they
are done or gives up. That is less precise than a timestamped replay would be, by a
few seconds at each end, and it is stated here rather than hidden: task times in this
round are compared against each other and are not reported to the second.

Header: session identifier, side, role group, session language, device class and
viewport, whether the device was a physical handset or a desktop browser, deployment
commit, date, facilitator, consent script read yes or no, brief version.

One row per task, with these columns.

Task identifier. Start time and end time. Independent completion: yes, completed
after help, or no. Number of help requests. What help was given, verbatim. Errors:
count of wrong actions the participant had to undo or recover from. Abandonment: yes
or no, with the reason. Verbatim quotes, up to 3, in the participant's own language.
Confidence after the task on a 1 to 5 scale, asked as "how confident are you that
this did what you wanted", recorded as a number and a phrase. Defects observed, one
line each, each with a severity from section 8. Facilitator note.

Two comprehension rows, filled once per session rather than per task.

Verification comprehension: after S5 or D2, the participant's own words for what
verified means here, scored as understood, partially understood or misunderstood,
with the quote that decided it.

Rent basis comprehension: after S2 or D2, whether the participant read the price as
per square metre per year or as a total, recorded as correct, incorrect or unclear.

Rules for filling it. A completion that needed help is never marked complete;
completion after help is its own value and is counted separately in section 9. A
defect is written where it happened, not batched at the end. A quote is recorded in
the language it was said in and translated later, because a translated quote made in
the moment loses the wording that made it a finding.

## 8. Severity rubric

Severity describes the consequence to the participant's work, not how loud the
participant was about it. Assign one severity per defect, from the highest matching
row.

**Critical.** The participant is led to a false belief about a figure, an evidence
claim or the visibility of their own data, and acts on it. A rent basis misread as a
total. A location contradiction that reaches a public surface. Something the
participant believed was private turning out to be visible. A verified marker that
rests on nothing. Any one of these stops the round for that surface until it is fixed.

**High.** The task cannot be completed independently, or is completed with an
incorrect result, and the participant does not notice. Also: a defect that would
prevent a real listing from being published, or a real search from returning a usable
result. Two participants hitting the same high defect makes it the next thing built.

**Medium.** The task is completed independently but with material effort, wrong turns
or expressed frustration, or the participant completes it and is not confident the
result is right. A confidence score of 1 or 2 on a completed task is medium at
minimum whatever else was observed.

**Low.** The task is completed and the participant is confident, but something was
noticed, questioned or worked around. Wording that had to be re-read counts here.

**Cosmetic.** Appearance only, with no observed effect on completion, time,
confidence or comprehension. A cosmetic defect is recorded and is not scheduled
against product outcomes.

Two rules. Severity is assigned by the observer from what happened, not from what the
participant asked for. And a participant's stated preference for a different design
is not a defect at any severity; it is an interview note, and it belongs in section
10, not here.

## 9. Task-success calculation

Every measure below is computed per task and per side, over 5 participants. With 5
participants per side, every rate is a fraction with a denominator of 5 or fewer and
is reported as the fraction as well as the percentage. A round of this size measures
direction, not magnitude, and reporting 4 of 5 as "80 percent" without the fraction
invites a precision the sample does not carry.

**Independent completion rate.** Participants who completed the task with no help
divided by participants who attempted it. This is the primary measure. Completion
after help is reported alongside it and never folded into it.

**Assisted completion rate.** Participants who completed after help divided by
attempts.

**Failure rate.** Participants who neither completed nor abandoned, meaning the task
was stopped at the time limit, divided by attempts.

**Abandonment rate.** Participants who stopped voluntarily divided by attempts.

**Time on task.** Median across participants who completed independently, in seconds,
reported with the range. Times from assisted and failed attempts are listed but never
averaged into it, because the number would then describe a different task.

**Error count.** Median wrong actions per participant per task, with the range.

**Help requests.** Total across the side, and the count of participants who made at
least one.

**Verification comprehension rate.** Participants scored as understood divided by 5,
per side.

**Rent basis comprehension rate.** Participants scored as correct divided by 5, per
side. Any incorrect score is a critical defect by section 8 regardless of the rate.

**Confidence.** Median confidence on independently completed tasks, per task, with
the count of scores of 1 or 2 called out separately. A high completion rate carrying
low confidence is a finding in its own right and is reported as one rather than
averaged away.

**Round thresholds.** A task with independent completion below 3 of 5 is a build
input for the next package. A task at 5 of 5 with median confidence of 4 or better is
considered settled for this stage and is not retested in round 2. Any critical defect
is fixed before round 2 regardless of rates.

## 10. Interview questions

Asked after the tasks, 8 minutes, in the session language. The order matters: the
comparison questions come before any question about the product, so that the answer
is not anchored on what was just seen.

Open, before anything product-specific.

Compared with how you do this today, what was faster, and what was slower?

What would you have had to do outside this platform to finish what you did here?

If this existed and worked, what would you stop doing?

Then, on evidence and trust, which is the product's actual claim.

When something here said it was verified, what did you take that to mean? Who
checked it?

What would you need to see before you believed a figure on this platform enough to
act on it?

Was there anything here you did not believe? What was it?

Then, on the specific side.

Supply side: what would stop you putting a real property on this? Who else in your
organisation would have to agree? What did the platform ask for that you would not
give, and why? If you published something here and nothing happened for a month,
what would you conclude?

Demand side: would you have contacted anyone about what you saw today? What would you
have wanted before contacting them? What would make you put a real requirement in
here rather than calling the people you already call?

Then, one question about what is missing, phrased so that it does not solicit
feature requests.

Think about the last time you did this for real. What happened in that process that
this platform did not touch at all?

Close with the trade question, which is the most useful single question in the set.

If I took this away tomorrow, what would you miss, if anything? Be honest, "nothing"
is a real answer.

Not asked, at any point. Do you like it. Is it easy to use. Would you use it. Do you
like this colour. Which design do you prefer. What would you add. Each of these
produces an answer the participant invents to be helpful, and none of them predicts
behaviour. If a participant volunteers an opinion of that kind, record it as a quote
in the interview notes and do not follow it up with a second opinion question; follow
it up with "when did that get in your way today", which converts an opinion back into
an observation or reveals that it never happened.

## 11. Findings and retest template

One findings file per round, written within 48 hours of the last session, while the
notes are still legible to the person who typed them. Under a notes-only round that
window is the whole record: there is nothing to go back to afterwards, so a note that
made sense at the time and does not a week later is simply lost. Write up between
sessions, not at the end of the round. Findings enter `docs/findings-register.md` under
their own numbers, so a research finding and an engineering finding are ranked
against each other rather than kept in separate lists.

Raw notes are destroyed no later than 90 days after the final session of the round.
After that date only the synthesized findings remain, carrying no participant
identifier, no seat label and no traceable quotation. A finding still open on day 91
is carried by its synthesized form. Any duration other than 90 days is an owner or
counsel decision and is recorded in `docs/decision-register.md` before the round
runs. The full rule is in the recruitment sheet under "What is retained, and by
whom".

### Round header

Round identifier. Dates of the first and last session. Deployment commit under test,
which must be one commit for the whole round; if the product ships mid-round, the
round is split and the two halves are reported separately. Participants by side and
role group, with no names. Sessions run against seats offered. Language split. Device
split, stated as desktop sessions against physical-handset sessions, with the three
mobile seats named and any shortfall against them stated rather than absorbed.
Whether the ELITE-1-AT session has run. Facilitator.

### Per-finding record

Finding number. Side. Task identifier. Severity from section 8. Title, one line,
describing what the participant could not do rather than what the interface looked
like. Frequency, stated as a fraction of participants who met the condition, not of
all 10. Evidence: the observation-sheet rows and at least 1 verbatim quote in the
original language with its translation. What the participant expected. What the
product did. Consequence: the sentence that says what this costs the person or the
business, which is the sentence that decides whether it is worth building. Proposed
change, or "no proposed change yet" where the right response is not obvious, which is
a legitimate and common state after a first round. Retest condition: the exact
measure and threshold that would show it fixed. Status.

A finding is not written for a defect only one participant hit unless its severity is
critical or high. A single medium observation is recorded in the round file as an
observation and waits for a second sighting.

### Round summary, which is the part that is read

Independent completion by task, both sides, as fractions. Verification comprehension
and rent basis comprehension rates. Critical and high findings, listed. The three
things that most reliably stopped people. The one thing that most reliably worked,
because a round that reports only failures will get a working surface rebuilt by
accident. And the explicit next-action record required of every package: whether the
next highest-value action is implementation, design, further user research, data
acquisition, legal work or operational preparation, with the evidence from this round
that decides it.

### Retest protocol

Round 2 runs after the critical and high findings are fixed, with the same tasks and
the same scripts, and with at least 3 new participants per side so that improvement is
not measured only on people who have already learned the product. A returning
participant's times are reported separately and never pooled with a first-time
participant's, because a second visit measures memory rather than design.

A finding is closed when its retest condition is met in a session, not when the code
is merged. A finding whose retest condition cannot be expressed as a measure was
written badly and is rewritten before round 2.

### What this round does not produce

It does not produce market data, demand estimates, pricing evidence or any figure
about Saudi commercial real estate. It does not produce a conformance claim of any
kind. It does not produce a design direction by vote. It produces evidence about
whether 10 people could do their own work, and that is the whole of it.
