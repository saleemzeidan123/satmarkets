"use client";
import { useState, useEffect, useRef } from "react";

type Step = [string, string, string];
type Task = { icon: string; label: string; sub: string; prompt: string; steps: Step[]; kind: string };

const TASKS: Record<string, Task> = {
  draft: {
    icon: "✦", label: "Draft a listing", sub: "From photos + a CR, write the whole listing",
    prompt: "Draft a listing for my Olaya Tower floor from these 8 photos.",
    steps: [
      ["Reading 8 photos", "vision", "Detected: Grade A office, fitted, raised floor, city view"],
      ["Pulling building data", "tool", "Olaya Tower · Al Olaya · completed 2021"],
      ["Checking REGA permit", "tool", "Permit 7200-AD-118934 · valid"],
      ["Writing EN + AR copy", "write", "Bilingual title + description, glossary-locked"],
      ["Pricing vs index", "tool", "Suggested 1,450 SAR/m² — 2% above median"],
    ], kind: "listing",
  },
  underwrite: {
    icon: "◇", label: "Underwrite a deal", sub: "Plain-language investment analysis",
    prompt: "Should I acquire the Olaya Tower floor at 64.8M? Underwrite it.",
    steps: [
      ["Gathering comps", "tool", "4 verified Olaya transactions, last 6 months"],
      ["Modelling NOI", "calc", "Stabilised 4.40M/yr · 96% occupancy"],
      ["Testing freeze scenario", "calc", "Open first-lease → not capped"],
      ["Computing returns", "calc", "NIY 6.8% · 5-yr IRR 11.2%"],
    ], kind: "underwrite",
  },
  negotiate: {
    icon: "⇄", label: "Negotiate range", sub: "What to offer, and why",
    prompt: "What should I offer on Olaya Tower? I want a 5-year term.",
    steps: [
      ["Reading the listing", "tool", "Asking 1,450 · open · fitted"],
      ["Benchmarking", "tool", "Median 1,420 · 18-day avg time-to-lease"],
      ["Modelling leverage", "calc", "Low vacancy → modest room"],
      ["Building strategy", "write", "Anchor + concessions plan"],
    ], kind: "negotiate",
  },
  watch: {
    icon: "◉", label: "Watch the market", sub: "A standing agent that pings you",
    prompt: "Watch Al Olaya Grade A and alert me on anything material.",
    steps: [
      ["Setting watch", "tool", "Al Olaya · Grade A · office"],
      ["Baselining", "calc", "Median 1,420 · +8.4% YoY"],
      ["Wiring triggers", "tool", "±3% move · new supply · permit changes"],
    ], kind: "watch",
  },
};

function ResultCard({ task }: { task: string }) {
  if (task === "draft") return (
    <div className="rise" style={{ marginTop: 16, background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--z2)" }}>
      <div style={{ height: 120, background: "linear-gradient(165deg,#33455c,#5d7186 60%,#a9b9cb)", position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: 12, background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontFamily: "var(--mono)" }}>✓ Verified · permit 7200-AD-118934</span>
      </div>
      <div style={{ padding: 18 }}>
        <div className="eyebrow">Draft ready · review &amp; publish</div>
        <div style={{ fontSize: 17, fontWeight: 700, margin: "8px 0 2px" }}>Grade A Office Floor, Olaya Tower</div>
        <div className="mono muted" style={{ fontSize: 12 }}>1,450 SAR/m²·yr · 320 m² · bilingual</div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>A fully fitted Grade A floor with panoramic city views, raised access flooring and dedicated lift access. Ejar-ready, ideal for a regional HQ.</p>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn ghost sm">Edit</button>
          <button className="btn primary sm">Publish bilingual listing →</button>
        </div>
      </div>
    </div>
  );
  if (task === "underwrite") return (
    <div className="rise" style={{ marginTop: 16, background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 14, padding: 18, boxShadow: "var(--z2)" }}>
      <div className="eyebrow">Verdict</div>
      <div style={{ fontSize: 17, fontWeight: 700, margin: "6px 0 14px" }}>Acquire — priced fairly, upside is the open lease</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[["6.8%", "Net initial yield"], ["11.2%", "5-yr IRR"], ["4.40M", "Stabilised NOI"], ["+11%", "Yr-5 vs capped"]].map((k, i) => (
          <div key={i}><div className="mono" style={{ fontSize: 20, fontWeight: 500 }}>{k[0]}</div><div className="muted" style={{ fontSize: 11 }}>{k[1]}</div></div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--cool)", borderRadius: 10, fontSize: 12.5, color: "var(--slate)", lineHeight: 1.55 }}>
        It&rsquo;s an <b style={{ color: "var(--ink)" }}>open first-lease</b>, so it re-prices each term — not frozen under the Sept-2025 cap. That re-pricing is the underwriting upside vs. capped stock.
      </div>
    </div>
  );
  if (task === "negotiate") return (
    <div className="rise" style={{ marginTop: 16, background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 14, padding: 18, boxShadow: "var(--z2)" }}>
      <div className="eyebrow">Suggested strategy</div>
      <div style={{ fontSize: 17, fontWeight: 700, margin: "6px 0 14px" }}>Anchor at 1,380, settle near 1,420</div>
      {[["Open at", "1,380 SAR/m²", "3% below ask"], ["Target", "1,420", "at the median"], ["Trade for", "2 months rent-free", "vs. headline cut"], ["Walk above", "1,470", "low-vacancy tax"]].map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: i ? "1px solid var(--silver)" : "none" }}>
          <span style={{ fontSize: 13 }}>{r[0]}</span><div style={{ textAlign: "right" }}><span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{r[1]}</span> <span className="muted" style={{ fontSize: 11 }}>· {r[2]}</span></div>
        </div>
      ))}
      <button className="btn primary sm" style={{ marginTop: 14 }}>Draft the offer →</button>
    </div>
  );
  return (
    <div className="rise" style={{ marginTop: 16, background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 14, padding: 18, boxShadow: "var(--z2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s infinite" }}>◉</span>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>Watch active · Al Olaya Grade A</div><div className="muted" style={{ fontSize: 12 }}>I&rsquo;ll alert you in-app + email on anything material.</div></div>
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {[["±3% rent move", "live"], ["New Grade A supply", "live"], ["Permit / licence changes", "live"]].map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--cool)", borderRadius: 9, fontSize: 12.5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />{r[0]}<span className="grow" /><span className="mono muted" style={{ fontSize: 10 }}>{r[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [task, setTask] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [step, setStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function run(key: string) { setTask(key); setPhase("running"); setStep(0); }

  useEffect(() => {
    if (phase !== "running" || !task) return;
    const t = TASKS[task]; if (!t) return;
    if (step >= t.steps.length) { const id = setTimeout(() => setPhase("done"), 420); return () => clearTimeout(id); }
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 620 : 760);
    return () => clearTimeout(id);
  }, [phase, step, task]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [step, phase]);

  const t = task ? TASKS[task] : null;

  return (
    <div className="poc">
      <div className="pbar">
        <span style={{ width: 26, height: 26, borderRadius: 8, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 }}>✦</span>
        <div><h1>SAT Advisor</h1><div className="sub">Agentic · grounded in the verified index</div></div>
        <span className="grow" />
        {task && <button className="btn ghost sm" onClick={() => { setTask(null); setPhase("idle"); setStep(0); }}>＋ New task</button>}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "26px 30px", display: "flex", flexDirection: "column" }}>
          <div style={{ maxWidth: 720, width: "100%", margin: "0 auto" }}>
            {!task && (
              <div className="rise">
                <div className="eyebrow">What should I do for you?</div>
                <h2 className="serif" style={{ fontWeight: 500, fontSize: 28, letterSpacing: "-.02em", margin: "10px 0 4px" }}>An agent that does the work.</h2>
                <p className="muted" style={{ fontSize: 14, margin: "0 0 24px" }}>Not a search box — pick a job and watch it run, step by step, on verified data.</p>
                <div className="agent-grid">
                  {Object.entries(TASKS).map(([k, v], i) => (
                    <button key={k} className="lift pop" onClick={() => run(k)} style={{ textAlign: "left", background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 14, padding: 18, animationDelay: (i * 60) + "ms" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{v.icon}</span>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{v.label}</div>
                      </div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>{v.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {task && t && (
              <div>
                <div className="pop" style={{ alignSelf: "flex-end", marginLeft: "auto", maxWidth: "78%", background: "var(--ink)", color: "#fff", padding: "12px 16px", borderRadius: "14px 14px 4px 14px", fontSize: 13.5, marginBottom: 20 }}>{t.prompt}</div>

                <div className="rise" style={{ background: "var(--paper)", border: "1px solid var(--silver)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--z1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid var(--silver)" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: "var(--azure-wash)", color: "var(--azure-d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{t.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</span>
                    <span className="grow" />
                    {phase === "running"
                      ? <span className="mono" style={{ fontSize: 11, color: "var(--azure-d)" }}>working… {Math.min(step, t.steps.length)}/{t.steps.length}</span>
                      : <span className="mono" style={{ fontSize: 11, color: "var(--green)" }}>✓ done</span>}
                  </div>
                  <div style={{ padding: "8px 16px" }}>
                    {t.steps.map((s, i) => {
                      const shown = i < step || phase === "done";
                      const active = i === step && phase === "running";
                      if (!shown && !active) return null;
                      return (
                        <div key={i} className="rise" style={{ display: "flex", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--silver)" : "none", alignItems: "flex-start" }}>
                          <span style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: shown && !active ? "var(--green)" : "var(--azure-wash)", color: shown && !active ? "#fff" : "var(--azure-d)", animation: active ? "pulse 1.4s infinite" : "none" }}>{shown && !active ? "✓" : <span style={{ animation: "blink 1s infinite" }}>•</span>}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>{s[0]}<span className="mono" style={{ fontSize: 9, color: "var(--slate-2)", border: "1px solid var(--silver-2)", borderRadius: 4, padding: "1px 5px", textTransform: "uppercase" }}>{s[1]}</span></div>
                            {(shown && !active) ? <div className="muted fade" style={{ fontSize: 12, marginTop: 3 }}>{s[2]}</div> : <div className="sk" style={{ height: 9, width: "60%", marginTop: 7 }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {phase === "done" && <ResultCard task={task} />}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 30px 18px", background: "var(--paper)", borderTop: "1px solid var(--silver)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--azure)", borderRadius: 12, padding: "10px 14px", boxShadow: "var(--glow)" }}>
          <span style={{ color: "var(--harbor)", fontSize: 16 }}>✦</span>
          <span className="muted" style={{ flex: 1, fontSize: 13.5 }}>Ask the agent to do something else…</span>
          <button className="btn primary sm">Send</button>
        </div>
      </div>
    </div>
  );
}
