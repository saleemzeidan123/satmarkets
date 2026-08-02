"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/satkit";
import { getDictionary } from "@/i18n/getDictionary";
import { assetLabel, dealLabel } from "@/lib/labels";
import { apiErrorMessage } from "@/lib/apiErrors";
import {
  REQUIREMENT_ASSET_TYPES,
  REQUIREMENT_DEAL_TYPES,
  MUST_HAVE_OPTIONS,
  timelineOptions,
  groupLocations,
  locationLabel,
  type IntakeLocation,
} from "@/lib/requirementIntake";

// PKG-DEM1. The public demand form, split out of the route so the page above it
// can read the locations the platform actually holds on the server.
//
// WHAT WAS WRONG WITH THE FORM THAT WAS HERE.
//
// 1. It could not submit. Its move-in options and the route's accepted tokens
//    were two unrelated literals, so two of the four English options and all
//    four of the Arabic ones were refused, and the option it pre-selected for
//    every visitor was one of the refused ones (finding 100).
// 2. It offered five locations, all in Riyadh, hardcoded with their UUIDs, and
//    sent `city: "Riyadh"` regardless. The platform holds seventy seven
//    locations in twenty one cities. A tenant in Jeddah could not post a Jeddah
//    requirement: their brief was filed against a Riyadh district (finding 101).
// 3. Its district names had drifted from the source. It said "كافد" where the
//    board says "واجهة الرياض المالية".
// 4. Locations were multi-select, and only the first reached a structured field.
//    The rest became an English prose note no matcher reads, while the match
//    count on the success card was computed for the first location alone. The
//    record holds one `district_id`, so multi-select was not representable and
//    is now not offered (finding 102). What it would take is recorded in the
//    findings register rather than half built here.
// 5. Its must-have chips stored whichever language the visitor was reading, so
//    "Fitted" and "مجهّز" became two different stored conditions.
// 6. Errors arrived as one server sentence in a card at the foot of the page,
//    with nothing tying it to any of the fourteen controls (finding 28).
// 7. The success card wrote the literal 3 beside "audiences notified" while the
//    real list was rendered directly beneath it.
//
// WHAT IS KEPT. Everything Codex P1-02 repaired: a real `<form>`, labels tied to
// inputs by id, radios that are radios, fieldsets with legends, and an explicit
// consent checkbox that must be ticked before anything is sent.
//
// WHAT IS DELIBERATELY NOT DONE. No option is pre-selected on move-in. The
// column is nullable and the route accepts an empty timeline, and a radio that
// arrives already chosen states a constraint the visitor never gave, on the one
// field that decides whether availability is scored at all.

type Done = { ref: string; match: number; notified: string[]; id: string };

/* ELITE-4 J4-7: consent is a blocking condition, so it is a named field with
   its own error node and its own place in the focus order. */
const FIELD_ORDER = ["title", "location", "size", "name", "email", "consent"] as const;
type FieldKey = (typeof FIELD_ORDER)[number];

export default function RequirementForm({ locale, locations }: { locale: "en" | "ar"; locations: IntakeLocation[] }) {
  const ar = locale === "ar";
  const pr = getDictionary(locale).postReq;

  const groups = useMemo(() => groupLocations(locations, ar), [locations, ar]);
  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const timelines = useMemo(() => timelineOptions(), []);

  const [title, setTitle] = useState("");
  const [asset, setAsset] = useState("office");
  const [deal, setDeal] = useState("lease");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [budget, setBudget] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [musts, setMusts] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState<null | Done>(null);
  const [err, setErr] = useState("");
  const [fieldErr, setFieldErr] = useState<Partial<Record<FieldKey, string>>>({});

  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  /* ELITE-4 J4-7. Two blocking conditions the dictionary has no sentence for.
     Written here, in both languages, rather than added to the locale files. */
  const t = {
    errConsent: ar ? "وافق على النشر قبل الإرسال." : "Agree to the posting terms before sending.",
    errNoLocations: ar
      ? "لا يمكن الإرسال الآن، فقائمة المواقع غير متاحة."
      : "This cannot be sent right now, the location list is unavailable.",
  };

  /* ELITE-4 J4-3: the success card replaces the form, which unmounts the button
     the visitor just pressed and drops focus to the document. Focus is moved to
     the card, which is also a live region, so the outcome is announced whether
     the reader is following focus or listening. Declared above the early return
     so the hook order never changes. */
  useEffect(() => { if (done) doneRef.current?.focus(); }, [done]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  /**
   * Every problem the visitor can fix, named against the control that carries
   * it. The rules mirror the write path's, so the form does not accept what the
   * route will refuse and does not refuse what the route accepts.
   */
  function validate(): Partial<Record<FieldKey, string>> {
    const e: Partial<Record<FieldKey, string>> = {};
    if (!title.trim()) e.title = pr.errRequired;
    if (!districtId) e.location = pr.errLocation;
    const lo = Number(sizeMin), hi = Number(sizeMax);
    if (sizeMin && sizeMax && Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) e.size = pr.errSizeOrder;
    if (!cName.trim()) e.name = pr.errRequired;
    if (!cEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cEmail.trim())) e.email = pr.errEmail;
    // ELITE-4 J4-7. The checkbox used to gate the button instead of the rules,
    // so an unticked box left the visitor with a control they could not focus
    // and no statement of what was wrong.
    if (!consent) e.consent = t.errConsent;
    return e;
  }

  /** Move focus to the first control the visitor has to return to. */
  function focusFirst(e: Partial<Record<FieldKey, string>>) {
    const first = FIELD_ORDER.find((k) => e[k]);
    if (!first) return;
    const id = first === "size" ? "pr-size-min" : `pr-${first === "location" ? "location" : first}`;
    const el = formRef.current?.querySelector<HTMLElement>(`#${id}`);
    el?.focus();
  }

  async function submit() {
    /* ELITE-4 J4-7. The button is focusable and activatable at all times now,
       so the two conditions that used to disable it are guarded here. An empty
       location list is not something the visitor can fix, so it is stated in
       the summary rather than pinned to a control that is not rendered. */
    if (busy) return;
    if (groups.length === 0) { setErr(t.errNoLocations); return; }
    const e = validate();
    setFieldErr(e);
    if (Object.keys(e).length) {
      setErr(pr.errSummary);
      focusFirst(e);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/requirements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          asset_type: asset,
          deal_type: deal,
          district_id: districtId,
          // The city is derived by the write path from the district row. It is
          // sent as a hint only, and no longer invented when it is unknown.
          city: byId.get(districtId)?.city ?? null,
          size_min: Number(sizeMin) || null,
          size_max: Number(sizeMax) || null,
          budget: Number(budget) || null,
          timeline,
          must_haves: musts,
          notes: null,
          contact_name: cName.trim() || null,
          contact_email: cEmail.trim() || null,
          contact_phone: cPhone.trim() || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      // Finding 203. This put the route's own English sentence on screen. Of every
      // site in this finding it is the one that mattered most, because this is the
      // most public write path the platform has: an occupier who has never signed
      // in states what they need and presses one button. Fourteen distinct English
      // refusals could land under an Arabic heading, on an Arabic form, and one of
      // them had the route's own English field name spliced into it.
      //
      // The condition changed with it. It tested the payload rather than the
      // status, which meant a refusal that carried no sentence at all read as a
      // success and moved the form to its confirmation screen. The route states
      // the reason as a stable code now and every refusal it can make is a status.
      if (!r.ok) {
        setErr(apiErrorMessage(j.code, ar, pr.submitError));
        setBusy(false);
        return;
      }
      setDone({ ref: j.ref, match: j.match, notified: j.notified || [], id: j.id || "" });
    } catch {
      setErr(pr.submitError);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div style={{ background: "var(--cool)" }}>
        <div style={{ padding: "40px 24px 56px", maxWidth: 720, margin: "0 auto" }}>
          {/* ELITE-4 J4-3 */}
          <div ref={doneRef} tabIndex={-1} role="status" className="card pad" style={{ boxShadow: "var(--sh-1)", textAlign: "center" }}>
            <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--harbor-d)", color: "var(--on-brand)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.check size={28} /></span>
            <div className="eyebrow" style={{ marginTop: 16 }}>{ar ? `الطلب ${done.ref} مباشر` : `Requirement ${done.ref} is live`}</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-.02em", margin: "8px 0 6px" }}>{pr.successTitle}</h1>
            <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>{pr.successBody}</p>
            {/* Finding 158, journey 4. This success panel sits inside `.card pad` inside a
                720px column with 24px of page padding, so its grid box is 226px at the 400
                percent reference and 266 at 360. That is why this row uses 7rem where the
                dashboard form pairs use 8rem: 8rem would have collapsed a layout that
                renders correctly on a 360px phone. Measured as `req-stats` in
                scripts/reflow-probe.mjs, one column at 320 and two from 360 upward at
                exactly the widths `1fr 1fr` gave. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))", gap: 12, margin: "22px 0" }}>
              <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
                <div className="tnum" style={{ fontSize: "1.625rem", fontWeight: 600, color: "var(--azure-d)" }}>{done.match}</div>
                <div className="muted" style={{ fontSize: "0.75rem" }}>{pr.matchToday}</div>
              </div>
              {/* This was the literal 3, printed beside the real list. */}
              <div className="card pad" style={{ boxShadow: "none", background: "var(--cool)" }}>
                <div className="tnum" style={{ fontSize: "1.625rem", fontWeight: 600 }}>{done.notified.length}</div>
                <div className="muted" style={{ fontSize: "0.75rem" }}>{pr.audiencesNotified}</div>
              </div>
            </div>
            <div className="col gap8" style={{ textAlign: ar ? "right" : "left", maxWidth: 420, margin: "0 auto 22px" }}>
              {done.notified.map((n, i) => (
                <div key={i} className="row gap8" style={{ fontSize: "0.8125rem" }}><span style={{ color: "var(--harbor-d)" }}><Icon.check size={15} /></span>{n}</div>
              ))}
            </div>
            <div className="row gap10" style={{ justifyContent: "center" }}>
              <Link href={`/${locale}/requirements/${done.id}`} className="btn primary lg">{pr.viewReq} <Icon.arrow size={16} /></Link>
              <Link href={`/${locale}/requirements`} className="btn secondary">{pr.allReqs}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fieldNote = (key: FieldKey) =>
    fieldErr[key] ? (
      <p id={`pr-${key}-err`} className="field-err" role="alert">{fieldErr[key]}</p>
    ) : null;

  const describedBy = (key: FieldKey, extra?: string) =>
    [fieldErr[key] ? `pr-${key}-err` : "", extra ?? ""].filter(Boolean).join(" ") || undefined;

  return (
    <div style={{ background: "var(--cool)" }}>
      <div style={{ padding: "36px 24px 48px", maxWidth: 880, margin: "0 auto" }}>
        <div className="eyebrow">{pr.postReqTitle}</div>
        <h1 className="serif" style={{ fontSize: "2.125rem", fontWeight: 500, letterSpacing: "-.02em", margin: "12px 0 6px" }}>{pr.tellMarket}</h1>
        <p className="muted" style={{ fontSize: "0.96875rem", maxWidth: 560, lineHeight: 1.6 }}>{pr.intro}</p>

        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <div className="card" style={{ marginTop: 30, padding: 0, overflow: "hidden" }}>
            <div className="row gap10" style={{ padding: "16px 24px", borderBottom: "1px solid var(--silver)", background: "var(--cool)" }}>
              <span style={{ color: "var(--harbor)" }}><Icon.doc size={18} /></span>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{pr.newReq}</div>
              <span style={{ flex: 1 }} /><span className="tag">{pr.draft}</span>
            </div>

            {/* One summary, announced once, above the fields it is about. The
                per-field messages below are what actually tell the visitor where
                to go; this exists so a screen reader hears that something
                happened at all. */}
            {err ? (
              <div role="alert" className="pad" style={{ borderBottom: "1px solid var(--silver)", background: "var(--red-wash, #FDF2F2)", color: "var(--red)", fontSize: "0.84375rem", padding: "14px 28px" }}>{err}</div>
            ) : null}

            <div className="req-grid" style={{ padding: 28 }}>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="pr-title">{pr.lookingFor}</label>
                <input
                  id="pr-title" name="title" className="input" value={title}
                  onChange={(e) => setTitle(e.target.value)} placeholder={pr.lookingForPh}
                  aria-invalid={fieldErr.title ? true : undefined} aria-describedby={describedBy("title")}
                  style={{ ...inp, textAlign: ar ? "right" : "left" }}
                />
                {fieldNote("title")}
              </div>

              {/* Finding 182. `aria-pressed={asset === a}` described eight independent
                  toggles, when `asset` is one string and choosing a second chip silently
                  unchooses the first. That is a radio group. The register deferred it as
                  "a structural rewrite" needing roving tabindex and arrow keys, and that
                  reasoning was wrong: the correct control is three lines below this one,
                  where transaction type is already a native radio inside a `.seg` label,
                  and a native radio brings roving tabindex, arrow keys, RTL-correct arrow
                  direction and form participation with no JavaScript at all. The inner
                  `role="group"` is gone because the fieldset was already the group and the
                  `name` is what binds the radios. */}
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ padding: 0 }}>{pr.assetType}</legend>
                <div className="row gap8 wrap">{REQUIREMENT_ASSET_TYPES.map((a) => (
                  <label key={a} className={"chip" + (asset === a ? " on" : "")} style={chip}>
                    <input type="radio" name="asset" value={a} checked={asset === a} onChange={() => setAsset(a)} className="sronly" />
                    {assetLabel(a, locale)}
                  </label>
                ))}</div>
              </fieldset>

              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ padding: 0 }}>{pr.transaction}</legend>
                <div className="seg" style={{ alignSelf: "flex-start" }}>{REQUIREMENT_DEAL_TYPES.map((d) => (
                  <label key={d} className={deal === d ? "on" : ""} style={{ cursor: "pointer" }}>
                    <input type="radio" name="deal" value={d} checked={deal === d} onChange={() => setDeal(d)} className="sronly" />
                    {d === "lease" ? pr.lease : pr.buy}
                  </label>
                ))}</div>
              </fieldset>

              {/* One location, from the source, grouped by city. A native select
                  because seventy seven options in a chip row is not a control,
                  and because this one is keyboard and screen reader native at
                  every width without anything being written to make it so. */}
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="pr-location">{pr.location}</label>
                {groups.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.8125rem", lineHeight: 1.6, margin: "6px 0 0" }}>{pr.locationsUnavailable}</p>
                ) : (
                  <>
                    <select
                      id="pr-location" name="location" className="input" value={districtId}
                      onChange={(e) => setDistrictId(e.target.value)}
                      aria-invalid={fieldErr.location ? true : undefined}
                      aria-describedby={describedBy("location", "pr-location-note")}
                      style={{ ...inp, textAlign: ar ? "right" : "left" }}
                    >
                      <option value="">{pr.locationPh}</option>
                      {groups.map((g) => (
                        <optgroup key={g.city} label={g.label}>
                          {g.locations.map((l) => (
                            <option key={l.id} value={l.id}>{locationLabel(l, ar)}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {fieldNote("location")}
                    <p id="pr-location-note" className="muted2" style={{ fontSize: "0.78125rem", lineHeight: 1.6, margin: "6px 0 0" }}>{pr.locationNote}</p>
                  </>
                )}
              </div>

              {/* Finding 181. This was a <div> whose one <label htmlFor="pr-size-min">
                  read the visible caption while the control it named carried an
                  aria-label of "Smallest size", so the accessible name did not contain
                  the visible one. A speech user saying the words printed on the screen
                  addressed a control that does not answer to them, which is SC 2.5.3,
                  and the second input had no visible label associated with it at all.
                  A sweep of src found this one site pair and no other, so it is a
                  defect and not a pattern.
                  Two inputs under one caption are a group. The caption is now a legend,
                  matching the three sibling groups already in this form, and each name
                  begins with the visible caption and then says which end of the range
                  it is. The Arabic uses the Arabic comma. */}
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ padding: 0 }}>{pr.sizeRange}</legend>
                <div className="row gap10">
                  <input
                    id="pr-size-min" name="sizeMin" inputMode="numeric" className="input grow" value={sizeMin}
                    onChange={(e) => setSizeMin(e.target.value)} style={inp}
                    aria-label={pr.sizeMinLabel} aria-invalid={fieldErr.size ? true : undefined} aria-describedby={describedBy("size")}
                  />
                  <span className="muted">{pr.to}</span>
                  <input
                    id="pr-size-max" name="sizeMax" inputMode="numeric" className="input grow" value={sizeMax}
                    onChange={(e) => setSizeMax(e.target.value)} style={inp}
                    aria-label={pr.sizeMaxLabel} aria-invalid={fieldErr.size ? true : undefined} aria-describedby={describedBy("size")}
                  />
                </div>
                {fieldNote("size")}
              </fieldset>

              <div className="field">
                <label htmlFor="pr-budget">{pr.budgetCeiling}</label>
                <input id="pr-budget" name="budget" inputMode="numeric" className="input" value={budget} onChange={(e) => setBudget(e.target.value)} style={inp} />
              </div>

              <fieldset className="field" style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
                <legend style={{ padding: 0 }}>{pr.mustHaves} <span className="hint">{pr.optional}</span></legend>
                <div className="row gap8 wrap" role="group">{MUST_HAVE_OPTIONS.map((m) => (
                  <button
                    key={m.token} type="button" aria-pressed={musts.includes(m.token)}
                    className={"chip" + (musts.includes(m.token) ? " on" : "")} style={chip}
                    onClick={() => toggle(musts, setMusts, m.token)}
                  >{ar ? m.label_ar : m.label_en}</button>
                ))}</div>
              </fieldset>

              <fieldset className="field" style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}>
                <legend style={{ padding: 0 }}>{pr.moveIn} <span className="hint">{pr.optional}</span></legend>
                <div className="seg" style={{ alignSelf: "flex-start" }}>{timelines.map((t) => (
                  <label key={t.token} className={timeline === t.token ? "on" : ""} style={{ cursor: "pointer" }}>
                    <input type="radio" name="timeline" value={t.token} checked={timeline === t.token} onChange={() => setTimeline(t.token)} className="sronly" />
                    {ar ? t.label_ar : t.label_en}
                  </label>
                ))}</div>
                <p className="muted2" style={{ fontSize: "0.78125rem", lineHeight: 1.6, margin: "8px 0 0" }}>{pr.moveInNote}</p>
              </fieldset>

              <div className="field">
                <label htmlFor="pr-name">{pr.yourName}</label>
                <input
                  id="pr-name" name="name" autoComplete="name" className="input" value={cName}
                  onChange={(e) => setCName(e.target.value)} placeholder={pr.fullNamePh}
                  aria-invalid={fieldErr.name ? true : undefined} aria-describedby={describedBy("name")}
                  style={{ ...inp, textAlign: ar ? "right" : "left" }}
                />
                {fieldNote("name")}
              </div>
              <div className="field">
                <label htmlFor="pr-email">{pr.email}</label>
                <input
                  id="pr-email" name="email" type="email" autoComplete="email" inputMode="email" className="input" value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)} placeholder="you@company.com"
                  aria-invalid={fieldErr.email ? true : undefined} aria-describedby={describedBy("email")}
                  style={inp}
                />
                {fieldNote("email")}
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="pr-phone">{pr.phone} <span className="hint">{pr.optional}</span></label>
                <input id="pr-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className="input" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+966" style={inp} />
              </div>
            </div>

            <div style={{ padding: "18px 28px", borderTop: "1px solid var(--silver)", background: "var(--azure-wash)" }}>
              <div className="row gap10" style={{ marginBottom: 12 }}>
                <span style={{ color: "var(--azure-d)" }}><Icon.spark size={18} /></span>
                <div style={{ fontSize: "0.84375rem" }}>{pr.postsToNote}</div>
              </div>
              {/* Real consent, not a badge asserting it. */}
              <label htmlFor="pr-consent" className="row gap10" style={{ alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  id="pr-consent" name="consent" type="checkbox" required checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={fieldErr.consent ? true : undefined} aria-describedby={describedBy("consent")}
                  style={{ marginTop: 3, width: 16, height: 16, flex: "none" }}
                />
                <span style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>{pr.consentLabel}</span>
              </label>
              {/* ELITE-4 J4-7: the reason the visitor cannot post, beside the
                  control that carries it, and the target `focusFirst` returns
                  them to. */}
              {fieldNote("consent")}
            </div>
          </div>

          <div className="row between wrap" style={{ marginTop: 26, gap: 12 }}>
            <span className="muted" style={{ fontSize: "0.78125rem" }}>{pr.privacyNote}</span>
            {/* ELITE-4 J4-7: `disabled` made this unfocusable and unreadable while
                the visitor had no idea what was blocking them. `aria-disabled`
                keeps it in the tab order and lets a press produce the error
                that names the condition. `submit` guards every condition. */}
            <button
              type="submit" className="btn primary lg"
              aria-disabled={busy || !consent || groups.length === 0 || undefined}
              style={busy || !consent || groups.length === 0 ? { opacity: 0.6 } : undefined}
            >{busy ? pr.posting : pr.postReqBtn} <Icon.arrow size={16} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ELITE-4 J4-1: `outline: "none"` used to sit here and was spread onto nine
   controls, leaving a 1.17:1 box-shadow as the only focus affordance. The
   visible ring comes from `.input:focus-visible` in the shared stylesheet, and
   an inline `outline` cannot be overridden by a stylesheet, so it is gone. */
const inp: React.CSSProperties = { border: "1px solid var(--silver)", borderRadius: 9, padding: "10px 12px", fontSize: "0.875rem", color: "var(--ink)", background: "var(--paper)", width: "100%" };
const chip: React.CSSProperties = { cursor: "pointer", border: "1px solid var(--silver)", background: "var(--paper)" };
