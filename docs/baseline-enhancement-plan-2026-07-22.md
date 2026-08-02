<!-- BASELINE REFERENCE. DO NOT EDIT THE BODY. -->

# Baseline reference: SAT Markets Complete Enhancement Plan, 22 July 2026

## Why this file exists

This is the preserved, unedited baseline enhancement plan produced by Codex on 22 July 2026 against source snapshot `6c6797e`. It is stored here so that the intended scope of the product can never again be reconstructed from repository numbering, guessed from adjacent code, or declared unrecoverable.

**The current status ledger records present truth. This baseline preserves intended scope and prevents accidental omission.** The two documents answer different questions and neither replaces the other. `docs/status-ledger.md` says what exists today and what is verified. This file says what was intended, in the words of the advisor who specified it. When the two disagree about what a workstream is called, what it must deliver, or what its acceptance condition is, this file is authoritative and the ledger is corrected to match.

## Provenance

| Field | Value |
| --- | --- |
| Author | Codex, acting as independent product, design and technical advisor |
| Document date | 22 July 2026 |
| Source snapshot named in the document | `6c6797e` |
| Original filename given by the owner | `SAT-Markets-Complete-Enhancement-Plan-2026-07-22.md` |
| Owner-side path given by the owner | `C:\Users\salee\OneDrive\Documents\SAT Markets\SAT-Markets-Complete-Enhancement-Plan-2026-07-22.md` |
| Path actually used to obtain this copy | Google Drive file `SAT Markets - Complete Enhancement Plan - 2026-07-22.md`, fileId `1NILly2at_Q8HeIfbMgnGeuukOZYI_YlI` |
| Google Drive view URL | https://drive.google.com/file/d/1NILly2at_Q8HeIfbMgnGeuukOZYI_YlI/view?usp=drivesdk |
| Drive file owner | saleem.zeidan@gmail.com |
| Drive file created | 2026-07-22T17:09:11Z |
| Drive file modified | 2026-07-23T04:55:46Z |
| Bytes retrieved | 105,660 |
| Characters after decoding | 105,630 |
| Lines | 787 |
| Em dashes in the body | 0, verified before commit, so Law 2 needed no exception |

## How this copy was obtained, stated plainly

The owner-side Windows path above could not be read from the build environment. The device bridge that would reach it is not connected: `mcp__remote-devices__get_device_info` returns "The device this session is bound to is not connected to the bridge." Rather than stop and request the file, an authoritative copy of the same document was located through the Google Drive connector, which does work from this environment, under the matching title and date shown in the table above. The Drive copy's title, creation date and size are consistent with the OneDrive filename the owner quoted.

This is disclosed rather than glossed because the instruction was to say so if the environment could not access the file. The environment could not access **that path**. It could access **that document**. Anyone re-checking this baseline should compare it against the OneDrive original and report any difference.

## Scope of the body below

Everything from the horizontal rule onward is the plan exactly as written by Codex, with no edits, no reordering, no summarizing and no corrections. It contains the 37 workstreams with their acceptance conditions, the six user journeys, the eight phases with exit gates, the page-by-page route register, the design-system specification, the device and assistive-mode matrix, the Professional Listing Studio specification, the AI provider workstream, the measurement framework, the accessibility and performance standards, the 24 Definition of Done gates, the recommended next steps, the decisions still needed from the owner, and the caveats.

If a future reader needs to know what a workstream is, they read this file. If they need to know whether it is built, they read `docs/status-ledger.md` and `docs/roadmap-reconciliation-gate.md`.

---

# SAT Markets Complete Enhancement Plan

> Read this second. It converts the audit into the implementation sequence, work packages, measurement framework and release gates.

> Source snapshot: `6c6797e`. Review date: July 22, 2026. Preview: https://satmarkets-sat-markets.vercel.app/

## Executive Summary

**Build the trusted system before polishing the surface.** Claude, your first job is to repair the shared truth, language, typography, taxonomy and environment layers. The strongest visual redesign will fail if an authorized broker is presented as an owner, Q2 becomes Q1 in Arabic, or a preview canonicalizes to a domain Saleem does not own.

**Organize delivery around complete user outcomes.** The product should be rebuilt as six connected journeys: find and enquire, post a requirement, list a property, manage supply and demand, track a deal, and research the market. A page is complete only when it advances one of those outcomes and handles loading, empty, error, stale, permission and mobile states.

**Treat Arabic, mobile and app mode as first-class products.** Arabic is not a translated desktop skin. It needs its own typography, spacing, hierarchy, bidirectional handling and editorial review. The web app should be installable and feel app-native, but a separate native app should wait until real usage proves a need that the responsive PWA cannot satisfy.

**Launch in gated packages.** This plan defines 37 workstreams across 8 phases, covering every one of the 58 route surfaces. Sequence matters. Do not enable indexing, sell plans or promote live-market claims before real inventory, legal approval, domain ownership and measurement are ready.

## The Sequence Reduces Rework

The largest delivery concentration sits in public discovery because that is where trust, conversion, Arabic quality and search visibility meet. The chart shows package count, not calendar duration. Claude should size each package after inspecting the current implementation, then keep the dependency order and exit gates intact.

### Implementation packages by phase

Sequence is authoritative; effort points are relative planning weights and must be sized by Claude against the current code.

| order | phase | package count | effort points | objective | depends on | exit gate |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Phase 0: Control the build | 6 | 5 | Freeze terminology, claims, taxonomy, environments and evidence rules before further polish. | None | One approved product-law register, route inventory, claim ledger and owner for every workstream. |
| 1 | Phase 1: Rebuild shared foundations | 10 | 13 | Repair bilingual typography, design tokens, app shell, metadata factory, data states and shared components. | Phase 0 | Shared components pass EN, AR, RTL, mobile, accessibility and metadata tests. |
| 2 | Phase 2: Perfect public discovery | 12 | 21 | Make Home, search, listings, details, maps, locations and market pages fast, beautiful and trustworthy. | Phase 1 | A first-time user can find, evaluate and enquire about a verified listing on mobile in both languages. |
| 3 | Phase 3: Complete supply and demand conversion | 9 | 18 | Finish posting requirements, listing property, onboarding, verification and contact flows. | Phases 1 and 2 | Every acquisition CTA completes a real persisted task or is explicitly marked Preview. |
| 4 | Phase 4: Complete the workspace | 8 | 16 | Unify dashboard, enquiries, messages, viewings, saved items, deals and documents. | Phase 3 | Authenticated users can complete their primary role journey without dead ends on mobile or desktop. |
| 5 | Phase 5: Trust, legal and index readiness | 7 | 13 | Complete legal content, verification semantics, privacy controls, production domain and crawl policy. | Phases 2 to 4 | Counsel approval, real inventory, domain ownership and zero indexability contradictions. |
| 6 | Phase 6: Hardening and release evidence | 8 | 10 | Enforce accessibility, security, performance, analytics, CI and cross-device quality. | Phases 1 to 5 | All automated and live release gates pass with evidence at required widths and locales. |
| 7 | Phase 7: Launch and optimize | 6 | 8 | Enable production indexing, monitor real behavior and improve conversion from measured evidence. | Phase 6 | Stable production metrics, no critical incidents, controlled experiments and weekly product review. |

## The North-Star Experience

SAT Markets should feel like a premium Saudi commercial-property operating system: calm, exact, fast and evidence-led. The visual character should be modern and memorable through proportion, typography, spatial rhythm, maps, real property imagery and crisp data presentation, not gradients, glass effects, excessive animation or decorative card stacking.

On the first screen, a user should understand four things: what the platform does, which inventory or data is real, what SAT Markets has verified, and what action to take. On every later screen, the next action should remain visible without hiding evidence or turning the interface into a sales funnel.

Use Harbor as the product signature. Use verified green only when an actual verification condition is true. Keep data visuals restrained and comparable. Use Arabic as a designed experience with natural sentence order and enough vertical space.

## Six Journeys Define the Product

Every route, component and event should belong to a user outcome. The journey table prevents page teams from optimizing isolated screens while leaving the flow incomplete. Claude should validate each journey with at least one owner, one licensed-broker and one occupier or retailer fixture, plus empty, stale and permission-restricted states.

### End-to-end user journeys

The plan is organized around complete outcomes across public and authenticated surfaces.

| Journey | Entry | Flow | Success | Recovery |
| --- | --- | --- | --- | --- |
| Find and enquire | Home, listings, map, location or search result | Search or browse; filter; compare context; inspect listing; verify facts; enquire; message; request viewing. | A qualified enquiry is submitted and visible to both authorized parties. | Zero-results alternatives, stale listing warning, retryable submit, saved draft and clear response expectation. |
| Post a space requirement | Home, requirements or campaign link | Choose use; location; area; budget; timing; contact permissions; review; submit; track responses. | A consented requirement is stored and can receive matching responses. | Field-level help, draft persistence, privacy explanation and edit-after-submit rules. |
| List a property | Home, list CTA, broker profile or dashboard | Choose role; identify property; set location kind; enter facts; upload evidence; review; submit; verification; publish. | A complete listing reaches the correct verification queue with no false publication promise. | Autosave, upload resume, duplicate detection, missing-evidence checklist and rejection reason. |
| Manage supply and demand | Dashboard | Review alerts; update listing; answer enquiry; confirm viewing; manage requirement; save or archive. | The next best action is obvious and completed without leaving the workspace. | Empty-state guidance, permission explanations, undo/archive behavior and support route. |
| Track a deal | Qualified enquiry or viewing | Create workspace; confirm parties; record terms; attach documents; review milestones; close or withdraw. | All participants understand status, evidence, responsibility and what SAT Markets does not do. | Version history, document status, unresolved-item list and legal disclaimer. |
| Research the market | Rent Index, market, area, location or Advisor | Choose entity and period; inspect source; compare; ask question; save or share the result. | User receives a source-attributed answer without invented figures or taxonomy ambiguity. | Explain unavailable data, coverage limits, methodology and the next authoritative source. |

## Eight Gated Delivery Phases

Phase 0 and Phase 1 are deliberately foundational. They remove contradictions once, centrally. Public discovery comes next because it establishes the product promise and the shared listing, location, evidence and enquiry patterns. Supply, demand and workspace features follow those contracts. Legal, domain and index activation stay late because they depend on the product becoming truthful and complete.

### Phase plan and dependencies

Eight gated phases. Later work should not bypass an unmet earlier gate.

| # | Phase | Objective | Depends on | Exit gate |
| --- | --- | --- | --- | --- |
| 0 | Phase 0: Control the build | Freeze terminology, claims, taxonomy, environments and evidence rules before further polish. | None | One approved product-law register, route inventory, claim ledger and owner for every workstream. |
| 1 | Phase 1: Rebuild shared foundations | Repair bilingual typography, design tokens, app shell, metadata factory, data states and shared components. | Phase 0 | Shared components pass EN, AR, RTL, mobile, accessibility and metadata tests. |
| 2 | Phase 2: Perfect public discovery | Make Home, search, listings, details, maps, locations and market pages fast, beautiful and trustworthy. | Phase 1 | A first-time user can find, evaluate and enquire about a verified listing on mobile in both languages. |
| 3 | Phase 3: Complete supply and demand conversion | Finish posting requirements, listing property, onboarding, verification and contact flows. | Phases 1 and 2 | Every acquisition CTA completes a real persisted task or is explicitly marked Preview. |
| 4 | Phase 4: Complete the workspace | Unify dashboard, enquiries, messages, viewings, saved items, deals and documents. | Phase 3 | Authenticated users can complete their primary role journey without dead ends on mobile or desktop. |
| 5 | Phase 5: Trust, legal and index readiness | Complete legal content, verification semantics, privacy controls, production domain and crawl policy. | Phases 2 to 4 | Counsel approval, real inventory, domain ownership and zero indexability contradictions. |
| 6 | Phase 6: Hardening and release evidence | Enforce accessibility, security, performance, analytics, CI and cross-device quality. | Phases 1 to 5 | All automated and live release gates pass with evidence at required widths and locales. |
| 7 | Phase 7: Launch and optimize | Enable production indexing, monitor real behavior and improve conversion from measured evidence. | Phase 6 | Stable production metrics, no critical incidents, controlled experiments and weekly product review. |

## Master Enhancement Workstreams

Each workstream is a bounded package Claude can implement, test and hand back for independent review. A package should be small enough to understand in one review and large enough to produce a complete user-facing improvement. Do not combine unrelated routes, a visual redesign and a data-model migration in one unreviewable change.

### Master workstream register

Thirty-seven bounded packages spanning governance through launch operations.

| ID | Phase | Domain | Deliverable | Dependency | Acceptance |
| --- | --- | --- | --- | --- | --- |
| WS01 | Phase 0 | Product governance | One Laws file for claims, language, location types, verification states, FAL, colors, metrics and launch state. | None | No implementation decision contradicts the approved Laws. |
| WS02 | Phase 0 | Claim and evidence ledger | Registry of every public promise with EN, AR, state, source, owner, scope and review date. | WS01 | No public claim ships without a current evidence entry. |
| WS03 | Phase 0 | Route and state map | Canonical map of public, private, alias, prototype, legal-draft and future routes. | WS01 | Sitemap, robots, middleware, navigation and metadata agree. |
| WS04 | Phase 0 | Entity and taxonomy model | Typed district, development, trade area, building, listing, lister, requirement and verification entities. | WS01 | No development is represented or routed as a district. |
| WS05 | Phase 0 | Release-state language | Approved Preview, Sample data, Planned, Available, Needs reconfirmation and Verified labels in EN and AR. | WS02 | A user can distinguish current, planned, sample and stale states instantly. |
| WS06 | Phase 0 | Evidence protocol | Per-package evidence template covering URLs, widths, locales, tests, accessibility, metadata, screenshots and known caveats. | WS01 | Every completed package has reproducible review evidence. |
| WS07 | Phase 1 | Design tokens | Harbor-led semantic color, spacing, type, radius, shadow, motion, layer and breakpoint tokens. | WS01 | No satestate gold; no page-specific visual constants without an approved token. |
| WS08 | Phase 1 | Bilingual typography | Direction-aware English and Arabic body, display, UI, mono, numeral and mixed-direction styles. | WS07 | Arabic uses IBM Plex Sans Arabic, zero tracking and approved sizes across all shared components. |
| WS09 | Phase 1 | Responsive app shell | One adaptive header, side navigation, bottom navigation, command/search entry, notice and footer system. | WS07 | No duplicate navigation, collision, overlap or horizontal page overflow from 320 to 1920 px. |
| WS10 | Phase 1 | Component system | Accessible buttons, fields, selects, chips, cards, tables, dialogs, drawers, toasts, tabs, timelines and data states. | WS07 to WS09 | Components pass keyboard, focus, RTL, touch-size and error-state checks. |
| WS11 | Phase 1 | Content architecture | Centralized bilingual copy, controlled vocabulary, plural handling, punctuation and unit formatters. | WS01 and WS08 | No hardcoded public prose, unapproved English leakage or metric mistranslation. |
| WS12 | Phase 1 | Metadata system | Environment-aware metadata factory for titles, descriptions, canonical, hreflang, x-default, OG, Twitter and robots. | WS03 and WS11 | Every indexable template has unique valid metadata; preview never canonicalizes to an unowned domain. |
| WS13 | Phase 1 | Data-state components | Loading, empty, error, stale, unavailable, sample, planned, permission-denied and partial-data patterns. | WS05 and WS10 | No blank, ambiguous or falsely positive state. |
| WS14 | Phase 1 | PWA and app mode | Installable manifest, app icons, safe service worker, standalone navigation and deep links. | WS09 | Install works on supported mobile browsers; private data is not cached insecurely. |
| WS15 | Phase 2 | Home | Persona-aware search-led hero, trust explanation, live/sample status, featured supply, demand, market evidence and one clear CTA per persona. | WS07 to WS13 | The user understands what SAT Markets is, what is real and what to do next within the first screen. |
| WS16 | Phase 2 | Listings search | Working server-side search, type-aware filters, sort, map/list sync, saved search, clear result counts and zero-result recovery. | WS04 and WS10 to WS13 | Known test queries return correct results and every URL state is shareable and canonicalized correctly. |
| WS17 | Phase 2 | Listing card | High-information card with human title, verified dimensions, price basis, area, place type, freshness and purposeful CTA. | WS04, WS08, WS10 | No internal code, N/A, contradictory geography or ambiguous verification label. |
| WS18 | Phase 2 | Listing detail | Mobile-first decision page with gallery, key facts, source and freshness, lister role, map, documents, enquiry and related supply. | WS16 and WS17 | A user can evaluate trust and submit an enquiry without hidden facts or overlapping controls. |
| WS19 | Phase 2 | Map and location intelligence | Localized controls, clustering, list synchronization, kind-aware entities, keyboard alternative and clear data coverage. | WS04, WS10, WS13 | Map is usable in AR and EN, and every place retains the correct entity kind. |
| WS20 | Phase 2 | Rent Index and market | Source-attributed period-specific data stories with average terminology, methodology, coverage and download/share states. | WS02, WS04, WS11 | Every figure has source, period, unit, population and update date; attribution is REGA Rental Index (Ejar) only. |
| WS21 | Phase 2 | Advisor AI | Bilingual cited answers from approved sources, numeric abstention, result cards, source viewer, feedback and human escalation. | WS02, WS11, WS20 | No invented figure; every factual answer cites an approved retrievable source or explicitly abstains. |
| WS22 | Phase 2 | Brokers and listers | Verified profiles with exact role, licence, service area, inventory and contact permissions. | WS04 and WS10 | Profile claims match verified records and consent. |
| WS23 | Phase 3 | Post a requirement | Short guided form, progress, privacy explanation, matching rules, confirmation and dashboard handoff. | WS10, WS11, WS13 | User completes the task on 390 px in both languages with validation and recovery. |
| WS24 | Phase 3 | Professional Listing Studio | Asset-specific, role-aware submission with reusable building facts, draft persistence, guided media missions, floor plans, documents, AI-assisted factual review, bilingual preview, submission and verification timeline. | WS04, WS10, WS13, WS18, WS22, WS25, WS34 | A lister can produce a tenant-decision-ready commercial listing on mobile or desktop without invented facts, hidden requirements, data loss, misleading media or a false promise of publication. |
| WS25 | Phase 3 | Authentication and onboarding | Accessible login, signup, recovery, role choice, consent and verification initiation. | WS10 and WS11 | Correct autocomplete, safe errors, no account enumeration and full RTL parity. |
| WS26 | Phase 4 | Dashboard and account | Role-adaptive command center showing only actionable current work, status, alerts and next steps. | WS23 to WS25 | Each role sees a focused home with no irrelevant modules or synthetic-live ambiguity. |
| WS27 | Phase 4 | Enquiries, messages and viewings | Unified conversation and viewing timeline with clear actors, status, confirm/decline and reminders. | WS18 and WS26 | Mobile exposes every required decision and private data stays protected. |
| WS28 | Phase 4 | Deal and documents | Evidence-led deal workspace separating user input, SAT verification, generated draft and signed artifacts. | WS27 | No legal-signature, fund-holding or transaction-completion implication beyond actual capability. |
| WS29 | Phase 5 | Pricing and entitlements | Only real plans, entitlements, limits, billing states and support promises, or a clearly labelled concept page. | WS02 and commercial decision | Every CTA and entitlement works exactly as described. |
| WS30 | Phase 5 | Legal and privacy | Counsel-approved Terms, Privacy, Contact, cookies, retention, controller, transfers and liability content. | Saudi counsel and product decisions | Zero placeholders and a documented approval date. |
| WS31 | Phase 5 | SEO and AI discovery | Production domain, clean sitemap, robots, entity pages, structured data, images, Search Console and bilingual crawl monitoring. | Real inventory, WS12, WS20 and WS30 | Only truthful, complete, canonical pages become indexable. |
| WS32 | Phase 6 | Accessibility | WCAG 2.2 AA program plus Saudi DGA-aligned content, keyboard, screen reader, contrast, focus, touch and reduced-motion checks. | All UI workstreams | Zero critical or serious accessibility defects on primary journeys. |
| WS33 | Phase 6 | Performance | Image strategy, font loading, server rendering, bundle control, map deferral, caching and real-user Core Web Vitals. | All public surfaces | At p75: LCP at most 2.5 s, INP at most 200 ms and CLS at most 0.1 on mobile and desktop. |
| WS34 | Phase 6 | Security and privacy engineering | RBAC, Supabase RLS review, rate limits, bot defense, CSP, secure cookies, signed URLs, audit logs and PII minimization. | All private surfaces | No anonymous private access, no high dependency vulnerability without exception, and security headers verified. |
| WS35 | Phase 6 | Analytics and observability | Consent-aware event taxonomy, funnel metrics, error logging, search quality, AI trace quality and release dashboards. | User journeys finalized | Every primary journey and guardrail can be measured without exposing sensitive content. |
| WS36 | Phase 6 | CI and regression prevention | Protected main with typecheck, tests, build, Arabic lint, metadata, schema, accessibility and visual smoke. | WS08 to WS35 | A failed quality gate blocks merge. |
| WS37 | Phase 7 | Launch operations | Go-live checklist, rollback, incident ownership, search submission, monitoring and weekly product review. | All prior phases | Launch can be paused or rolled back without data loss or misleading index exposure. |

## Design System and Visual Direction

The redesign should be distinctive through a disciplined system, not a collection of page-specific effects. Keep Source Serif 4 and Hanken Grotesk for English and IBM Plex Sans Arabic for Arabic. Make tokens direction-aware. Use responsive density: guided, card-led task completion on mobile and efficient tables, split panes and sticky contextual summaries on wide screens.

Avoid generic marketplace patterns that reduce trust: giant empty heroes, fake live counters, decorative verification badges, hidden fees, infinite card grids and map controls that cover results. The most advanced design is the one that exposes evidence, status and action with the least cognitive load.

### Design-system specification

Shared visual and interaction rules for English, Arabic, browser, PWA and large-screen contexts.

| Area | Token | Specification | Usage rule |
| --- | --- | --- | --- |
| Brand color | Primary | Harbor #3A6EA5 | Primary actions, selected state, focus support and key data emphasis. Never use satestate gold #8A7342. |
| Status color | Confirmed | #1B7A50 | Only verified or successfully completed states, never decoration. |
| Status color | Pending | Accessible amber on neutral background | Review, stale or attention-needed states with text and icon, not color alone. |
| Status color | Error | Accessible deep red | Errors, destructive actions and invalid states only. |
| Surface | Canvas | Warm near-white plus cool neutral layers | Premium Saudi institutional feel without beige/gold crossover. |
| Typography | English display | Source Serif 4 | Selective editorial headlines and market stories, not dense product controls. |
| Typography | English UI | Hanken Grotesk | Navigation, forms, cards, tables and buttons. |
| Typography | Arabic | IBM Plex Sans Arabic | All Arabic display, body, UI and form text with direction-aware tokens. |
| Typography | Arabic tracking | 0 | No negative tracking and no uppercase transform. |
| Typography | Body | EN 16/1.55; AR 17/1.75 | Default readable text on all devices. |
| Typography | Small text | EN at least 12 px; AR at least 13 px | Labels and metadata only, never essential instructions below the minimum. |
| Layout | Grid | 4 columns mobile, 8 tablet, 12 desktop | Fluid max width and logical start/end alignment for RTL. |
| Spacing | Scale | 4, 8, 12, 16, 24, 32, 48, 64, 96 | One spacing rhythm for sections, components and touch separation. |
| Shape | Radii | 8 controls, 12 cards, 16 panels, 24 hero media | Avoid excessive pill shapes and nested rounded boxes. |
| Elevation | Shadows | Two subtle neutral elevation levels | Use hierarchy and borders first; no decorative floating-card overload. |
| Motion | Timing | 120 to 240 ms with reduced-motion alternative | State feedback, drawer movement and map/list transitions, never blocking decoration. |
| Controls | Touch target | At least 44 by 44 CSS px for primary controls | Maintain spacing and avoid accidental taps. |
| Focus | Indicator | High-contrast visible outline, never obscured | Keyboard focus must survive light, dark, map and media backgrounds. |
| Data display | Numerals | Western numerals in EN and AR; tabular figures | Isolate mixed-direction prices, dates, references and units. |
| Density | Adaptive | Guided cards on mobile; denser tables and split panes on wide desktop | Do not simply shrink desktop layouts into mobile. |

## Responsive Web, PWA and Device Strategy

Build one responsive web application and make it installable. Use a manifest, icons, standalone display, safe-area handling, deep links and conservative caching. Do not cache private messages, verification evidence or deal documents for offline use without an explicit security design. Push notifications should be opt-in and tied to useful events such as a qualified enquiry or confirmed viewing.

A native iOS or Android app is not the immediate priority. Revisit it only after measured PWA usage identifies a native-only need such as background upload, high-value push engagement, camera-heavy verification or distribution requirements.

### Required device and assistive-mode matrix

A responsive release is validated as distinct experiences, not one shrinking desktop layout.

| Viewport | Mode | Layout rule | Must test |
| --- | --- | --- | --- |
| 320 x 568 | Small mobile browser | One-column, no fixed side panels, compact hero, drawers for filters, sticky primary action only when it does not cover content. | Home, listings, detail, login, post requirement, list property, message composer. |
| 360 x 800 | Common Android browser | Touch-first one-column with 44 px targets and content-first navigation. | All primary journeys in EN and AR. |
| 390 x 844 | Primary mobile and PWA | Bottom navigation for signed-in product areas, full-width sheets, safe-area support, keyboard-aware forms. | Install mode, standalone navigation, map/list, enquiry and viewing decisions. |
| 430 x 932 | Large mobile | Use extra width for two-column fact groups, not desktop navigation. | Listing gallery, data cards, pricing and long Arabic copy. |
| 768 x 1024 | Tablet portrait | Two-pane only where it improves the job; collapsible navigation and persistent summary where useful. | Map/list, dashboard, compare, forms and document review. |
| 1024 x 768 | Tablet landscape | Single desktop-style shell only, never desktop header plus mobile bottom nav together. | Landscape navigation, map, dashboard tables and modal sizing. |
| 1280 x 800 | Laptop | 12-column grid, restrained content width, sticky contextual sidebar and efficient keyboard flow. | Search, detail, dashboard, messages, deal and administration. |
| 1440 to 1920 | Wide desktop | Increase information density and whitespace, not uncontrolled line length or oversized hero copy. | Market dashboards, compare, operations and multi-column entity pages. |
| Assistive and zoom | Keyboard, screen reader, 200% zoom, reduced motion | Logical DOM order, visible focus, no trapped dialogs, semantic landmarks, localized names and reflow. | Every launch-critical journey and error state. |

## Page-by-Page Enhancement Register

The route table is the complete implementation map. Claude should attach every changed route to one journey, phase and acceptance rule. Public pages require metadata and evidence. Private pages require role, authorization and task-completion proof. Alias pages require clean redirects. Internal and prototype pages require real restriction, not only a noindex hint.

### Every route in the enhancement sequence

All 53 substantive route templates and 5 aliases are assigned to a phase, journey and acceptance rule.

| Route | Phase | Journey | Experience target | Enhancement | Acceptance |
| --- | --- | --- | --- | --- | --- |
| / | Phase 2 | Find and enquire | Immediate comprehension, trust and persona routing | Fix Arabic font and tracking, qualify sample and verification claims, align Q2 period, unique home schema and metadata. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /about | Phase 2 | Trust and company | Clear bilingual purpose, evidence and next action | Replace broad verification promise with badge-specific scope; publish legal identity only when verified. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /admin | Phase 6 | Operations | Fast, protected, mobile-first task completion | Enforce auth, Arabic font and role/status vocabulary; do not expose operational data. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /admin/accounts | Phase 6 | Operations | Fast, protected, mobile-first task completion | Localize role, status, dates and empty states; verify table behavior in RTL mobile. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /admin/signups | Phase 6 | Operations | Fast, protected, mobile-first task completion | Localize review actions and error states; define the evidence required for approval. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /advisor | Phase 2 | Research the market | Source-led market intelligence | State AI limitations, source each answer, align reporting periods and never generate a figure. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /agent | Phase 1 | Routing | Invisible routing hygiene | Use one permanent locale-preserving redirect and exclude the alias from sitemap. | One permanent redirect preserves locale and query, and the alias is absent from navigation and sitemap. |
| /area | Phase 2 | Find and enquire | Source-led market intelligence | Add hreflang and x-default, label Al Olaya as trade area, remove unsupported representative figures. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /bilingual | Phase 1 | Routing | Invisible routing hygiene | Preserve locale and query parameters; exclude alias from sitemap. | One permanent redirect preserves locale and query, and the alias is absent from navigation and sitemap. |
| /brokers | Phase 2 | Find and enquire | Clear bilingual purpose, evidence and next action | Use licensed real estate broker terminology and separate sample profiles from verified live members. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /building/[id] | Phase 2 | Find and enquire | Clear bilingual purpose, evidence and next action | Add unique bilingual metadata, x-default, images, Place/Building schema and kind-correct location hierarchy. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /compare | Phase 1 | Routing | Fast, protected, mobile-first task completion | Remove from sitemap; use average and median correctly; make the comparison table usable on 390 px screens. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /contact | Phase 5 | Trust and company | Clear bilingual purpose, evidence and next action | Replace counsel placeholders, identify the real contact controller and publish only approved response commitments. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /dashboard | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize KPIs, time periods and empty states; maintain parity without exposing sample data as live. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/enquiries | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Use enquiry consistently, localize status labels and retain usable table/card actions on mobile. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/enquiries/[id] | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Protect personal data, localize timeline actions and distinguish message, enquiry and deal states. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/listings | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize status, verification and permit states; avoid district/development conflation. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/listings/[id] | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Remove the em dash placeholder, localize every state and ensure listing verification labels match source fields. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/new | Phase 3 | Professional Listing Studio | Fast, protected, mobile-first creation of a tenant-decision-ready listing | Replace the single generic form with the WS24 adaptive task flow: building reuse, asset and condition-specific facts, guided media mission, public/private document separation, autosave, factual AI review and exact EN/AR preview. | Authentication and noindex are enforced; a 390 px user can pause, resume, capture or upload evidence, understand every requirement, preview both languages and submit without data loss or unsupported claims. |
| /dashboard/profile | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize identity and licence terminology; explain which fields are public and which are verification-only. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/requirements | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Use space requirement consistently and localize matching, status and privacy language. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /dashboard/viewings | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Restore status plus confirm and decline actions on mobile; localize date, time and decision states. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /deal | Phase 4 | Track a deal | Fast, protected, mobile-first task completion | Replace full deal claims with deal workspace language and state exactly what SAT Markets records. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /deal/termsheet | Phase 4 | Track a deal | Fast, protected, mobile-first task completion | Treat every term as draft, show who supplied each figure and prevent accidental legal-signature implication. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /docs | Phase 4 | Track a deal | Fast, protected, mobile-first task completion | Localize document status and permissions; distinguish generated draft from signed document. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /find | Phase 4 | Routing | Fast, protected, mobile-first task completion | Make query behavior real, source results and provide Arabic empty/error states. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /go | Phase 1 | Routing | Invisible routing hygiene | Preserve locale and destination safely; exclude from sitemap. | One permanent redirect preserves locale and query, and the alias is absent from navigation and sitemap. |
| /hbu | Phase 4 | Research the market | Fast, protected, mobile-first task completion | Replace الاكتتاب الاستثماري, label scenarios as estimates and never present unsourced values as market facts. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /invest | Phase 4 | Research the market | Fast, protected, mobile-first task completion | Separate verified inputs, user assumptions and calculated outputs in both languages. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /list | Phase 3 | Professional Listing Studio entry | Explain the value and start the correct real workflow | Replace the concept-only fake uploader with a truthful entry surface that explains verification, shows what to prepare and offers the three supported starts: guided capture, brochure-assisted draft or manual/reused-building entry. | Every visible action enters a real persisted workflow or is clearly unavailable; no simulated upload or publication control remains. |
| /lister/[id] | Phase 2 | Find and enquire | Clear bilingual purpose, evidence and next action | Add reciprocal alternates and x-default; display owner, broker and SAT roles precisely. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /listings | Phase 2 | Find and enquire | Fast relevant discovery with transparent filters | Fix query filtering, canonicalize filter states, make location kind explicit and localize all controls. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /listings/[id] | Phase 2 | Find and enquire | Complete decision confidence and conversion | Replace code H1 and N/A metadata, correct verification badges, freshness, units, map labels and geography. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /listings/[id]/flyer | Phase 2 | Find and enquire | Complete decision confidence and conversion | Localize units and legal state, remove absent fields, add source and generated date, test Arabic PDF layout. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /locations | Phase 2 | Find and enquire | Clear bilingual purpose, evidence and next action | Use kind-aware routes for districts, developments and trade areas; shorten metadata and add entity schema. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /login | Phase 3 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize errors, password assistance and consent; keep 44 px controls and correct autocomplete. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /map | Phase 2 | Find and enquire | Clear bilingual purpose, evidence and next action | Add page metadata, localize map controls, ensure keyboard access and keep sample geography explicit. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /market | Phase 2 | Research the market | Source-led market intelligence | Label sample versus live figures, attach period and source to each metric and reconcile claims. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /me | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Clarify identity, account and public-profile states in both languages. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /messages | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize timestamps, composer, delivery states and safety reporting; protect personal information. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /neutrality | Phase 5 | Trust and company | Clear bilingual purpose, evidence and next action | Define the relationship between SAT Markets and SAT Real Estate without overstating independence. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /notifications | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize event actors, status and relative time; do not expose internal codes. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /ops | Phase 6 | Operations | Clear bilingual purpose, evidence and next action | Do not expose synthetic operational data publicly; enforce access beyond metadata. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /post-requirement | Phase 3 | Post a requirement | Fast, protected, mobile-first task completion | Replace the unclear owner/broker/SAT sentence, state privacy and matching behavior, validate Arabic form parity. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /pricing | Phase 5 | Trust and company | Clear bilingual purpose, evidence and next action | Fix average translation, use plan not grade, label concept pricing and make every CTA truthful. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /privacy | Phase 5 | Trust and company | Clear bilingual purpose, evidence and next action | Resolve controller, hosting, transfers, retention, DPO and cookie details with Saudi counsel. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /proto | Phase 6 | Operations | Clear bilingual purpose, evidence and next action | Keep out of public navigation and search; use only for internal validation. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /rent-index | Phase 2 | Research the market | Source-led market intelligence | Use REGA Rental Index (Ejar) attribution only, average terminology, one Q2 period and shorter descriptions. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /requirements | Phase 2 | Post a requirement | Clear bilingual purpose, evidence and next action | Add metadata, protect requester identity, state verification scope and distinguish sample from current demand. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /requirements/[id] | Phase 2 | Post a requirement | Clear bilingual purpose, evidence and next action | Create human titles, redact personal data, add expiry and prevent stale demand from appearing current. | Unique EN and AR H1 and metadata, correct entity truth, 320 to 1440 reflow, accessible controls and one clear primary job pass. |
| /saved | Phase 4 | Manage supply and demand | Fast, protected, mobile-first task completion | Localize empty states and remove ASCII comma from Arabic copy. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /search | Phase 1 | Routing | Invisible routing hygiene | Preserve q and filters in the permanent redirect; verify the destination search actually filters. | One permanent redirect preserves locale and query, and the alias is absent from navigation and sitemap. |
| /signup | Phase 3 | List a property | Fast, protected, mobile-first task completion | Localize role choice, consent, licence evidence, errors and success states. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /terms | Phase 5 | Trust and company | Clear bilingual purpose, evidence and next action | Resolve contracting entity, address, liability, commission and effective-date placeholders with counsel. | The surface is visibly truthful about its state, cannot be indexed accidentally and completes only real actions. |
| /thinking-map | Phase 1 | Routing | Invisible routing hygiene | Preserve locale and exclude the internal naming alias from sitemap and public links. | One permanent redirect preserves locale and query, and the alias is absent from navigation and sitemap. |
| /verify | Phase 3 | Professional Listing Studio verification | Fast, protected, mobile-first task completion | Add explicit auth and response noindex; show evidence completeness, media issues, permit state and a traceable decision without exposing private documents. robots.txt alone is insufficient. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions, least-privilege evidence access and safe errors pass. |
| /verify/signups | Phase 3 | Professional Listing Studio verification | Fast, protected, mobile-first task completion | Protect identity and authorization evidence, localize decision reasons and create an audit trail for approval, rejection or requested correction. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |
| /verify/viewings | Phase 4 | Track a deal | Fast, protected, mobile-first task completion | Protect participant data, localize states and prevent internal workflow exposure. | Authentication or noindex is enforced; EN and AR task parity, keyboard access, mobile actions and safe errors pass. |

## Professional Listing Studio and Asset-Specific Publishing

This is the detailed product specification for WS24. It is deliberately queued for Phase 3 and must not interrupt Claude's current package sequence. The purpose is not to collect as many fields or photographs as possible. It is to help an owner or licensed broker create a professional, factual commercial-property listing that answers a tenant's practical questions while making submission fast, clear and satisfying.

### Evidence behind the design

The mechanism combines five evidence streams:

- Saudi REGA rules require accurate property identification, description, condition, location, material information, associated services and rights, valid advertising authority and non-misleading content.
- Leading property portals measure listing quality through complete facts, accurate location, diverse high-resolution images, non-duplicate media, image relevance, verification and floor-plan availability.
- Commercial platforms distinguish building-level media from space-level media and support photography, documents, floor plans, video, 360 tours and brochure-assisted entry.
- Commercial occupier research repeatedly highlights arrival, access, parking, floor configuration, frontage, loading, power, building experience and surrounding connectivity as decision factors.
- Proven form patterns reduce abandonment through focused questions, progressive disclosure, clear optionality, autosave, persistent back navigation, accessible uploads and precise error recovery.

Research links and the date reviewed are recorded in Source Links. These external patterns inform the experience but do not override Saudi law, SAT terminology or the evidence available for a specific property.

### Product model: decision readiness, not form completion

The listing workflow should measure whether a prospective tenant can make a sensible next-step decision. It should not award a mysterious marketing score. Show a transparent **Tenant-ready checklist** with six independent dimensions:

1. Identity and location.
2. Commercial terms and availability.
3. Asset-specific decision facts.
4. Visual coverage.
5. Plans and supporting information.
6. Authenticity, rights and freshness.

Each dimension must show exactly what is complete, what is missing, why it matters and how to resolve it. Paid promotion must never alter completeness or verification. A listing can be submitted only when every required item has one explicit state: provided, legitimately not applicable, unavailable with reason, or waived by an authorized reviewer.

Use two levels of completion:

- **Publish-ready:** the minimum truthful evidence needed for review and publication for that asset, condition and transaction.
- **Make it exceptional:** optional improvements such as professional photography, a measured plan, a continuous walkthrough, 360 tour, additional technical schedule or bilingual brochure.

The second level encourages quality without blocking a legitimate listing or exhausting the lister.

### Separate the building from the offered space

The current model should not require every office or retail unit in the same building to upload the same exterior, lobby and lift photographs.

- **Building record:** exterior, entrance, lobby, vertical transport, shared amenities, parking approach, accessibility, common-area facts, building documents and last-confirmed date.
- **Space or listing record:** unit entrance, internal condition, fit-out, floor, area, dedicated facilities, views, floor plan, video, price basis, availability and transaction terms.
- **Verification record:** ownership or authorization evidence, identity, advertising licence, reviewer decisions and audit history. Private evidence never becomes public media.
- **Public listing composition:** combines approved current building evidence with approved space evidence and visibly preserves their origin and freshness.

If a verified building record already exists, the lister selects it, reviews changed facts and reuses approved media. SAT must preserve the original contributor's rights, permitted reuse scope and last-confirmed date. The lister cannot silently copy another party's private or rights-restricted material.

### Three low-friction ways to start

1. **Guided mobile capture:** the lister walks through a short asset-specific shot mission using the phone camera. The experience gives framing, orientation and privacy guidance and saves after every item.
2. **Start from a brochure or PDF:** the lister uploads an existing brochure, schedule or floor plan. AI extracts a draft with a source chip beside every proposed fact. Nothing becomes confirmed or public until the lister accepts or corrects it.
3. **Manual or reusable entry:** the lister enters facts directly, duplicates a previous space, or starts from a verified building record. Only changed or space-specific items are requested.

Users can combine the three modes, pause on one device and continue on another. Never force the lister to restart because a document, camera permission or network connection is unavailable.

### Adaptive task flow

The Studio should use a persistent task list with a clear current step, not one overwhelming form and not dozens of artificial single-question pages. Ask one focused question at a time where the answer changes later requirements. Use compact grouped entry where facts naturally belong together.

| Stage | What the lister does | Product behavior |
| --- | --- | --- |
| 0. Eligibility and identity | Selects owner or authorized broker, transaction, asset type, location and existing building if applicable; supplies the advertising licence and authority evidence. | Explain public versus private data, verify the licence state where an approved integration exists, and do not imply approval before review. |
| 1. Property and offered space | Confirms the building, unit, floor, completion and fit-out state. | Reuse eligible building data, then generate only the questions and media categories relevant to this space. |
| 2. Tenant decision facts | Adds the asset-specific dimensions, access, services, constraints, availability and price basis. | Show examples and why each fact matters; allow unknown only where lawful and display the resulting information gap honestly. |
| 3. Media mission | Captures or uploads required visual categories, chooses the current-condition cover and resolves quality issues. | Classify, check, deduplicate and sequence media while preserving originals and requiring human confirmation. |
| 4. Plans and documents | Adds floor or site plan, brochure, specification, tour and public supporting files; submits private verification evidence separately. | Label every file public or private before upload, scan safely, create accessible previews and prevent accidental publication of identity or authorization documents. |
| 5. Commercial terms and contact | Confirms rent or sale basis, service charge where known, availability, contact route and viewing rules. | Use typed units and bases, show calculation inputs and block contradictory or incomplete price claims. |
| 6. Factual and bilingual review | Reviews contradictions, missing evidence and AI-drafted EN and AR copy. | Generate copy only from confirmed facts, attach fact sources, highlight low-confidence issues and require the lister to confirm both languages. |
| 7. Exact preview and submit | Inspects phone and desktop previews, verification labels, unavailable items and declarations, then submits. | Render the real listing components, state what happens next and provide a correction timeline rather than promising immediate publication. |

Autosave every confirmed change. Provide save status, retry, version recovery and safe cross-device resume. After a valid draft exists, let the user finish optional enhancements later rather than holding the entire session open.

### Dynamic requirement engine

Requirements are generated from:

- Asset type.
- Transaction type.
- Whole building, floor, unit, land parcel or business operation.
- Existing, under construction or planned state.
- Fitted, shell and core, partially fitted or operating condition.
- Shared versus exclusive facilities.
- Saudi regulatory and SAT verification rules.
- Whether equivalent current building evidence is already approved.

Every requirement must be versioned and explainable. Do not hardcode one generic minimum photo count across all assets. Count alone cannot prove useful coverage. The engine should require meaningful categories, then recommend a sensible number of non-duplicate views within each category.

### Asset-specific visual missions and decision facts

The following matrix is a product baseline for research, design and implementation. “Required” remains conditional on the property's real state and accessibility. If a feature does not exist, is unfinished or cannot legally be photographed, the lister records the reason instead of uploading a substitute or misleading image.

| Asset template | Guided visual coverage | Tenant decision facts and supporting items |
| --- | --- | --- |
| Office and business centre | Building exterior and entrance; completed lobby or reception; lift or access arrival where relevant; unit entrance reference; wide unit views from useful angles; current fit-out or shell condition; windows, views and natural-light context; exclusive pantry or washroom where present; floor plan or test fit. | Floor and zone, net lettable area, divisibility, fit-out, floor plate, ceiling, raised floor where present, power and data provision, HVAC arrangement and hours if known, access hours, lift service, parking allocation or ratio, shared amenities, availability and price basis. |
| Retail, showroom and food-and-beverage space | Street or mall approach; frontage and entrance; full facade or signage zone; visibility from customer route; interior overview; columns and ceiling context; back of house or storage; loading or service access; customer parking and access where useful; floor plan. | Frontage width, customer and service access, signage rights, loading, storage, utilities, extract, grease trap or drainage only where verified, opening constraints, shell or fit-out condition, and permitted or previous use with the correct qualification. |
| Warehouse, industrial and self-storage | Exterior, gates and fencing; internal views from useful corners; clear-height context; dock or grade-level doors; truck court, yard and access road; columns and floor condition; fire and life-safety equipment; office or staff areas; site and floor plan. | Clear height, floor load, column grid, dock and door counts and dimensions, truck-court depth, power, fire suppression, ventilation or HVAC, yard, parking, utilities, office proportion, access constraints and verified use classification. |
| Land | Street approach; access point; boundary views from multiple corners; present condition and topography; road frontage; adjacent-use context; verified utility connection points where safe; survey or site plan. | Parcel area, coordinates, boundary dimensions, frontage, access, topography, title or rights status, verified zoning or use, utilities, subdivision state and material constraints. Never infer development potential from images alone. |
| Medical and clinic | Building entrance and accessibility route; reception and waiting; consultation, treatment or procedure areas where fitted; circulation; support and sanitary areas; lift or access route; parking, drop-off and service access; floor plan. | Existing and future permitted use must be separate; room mix, accessibility, HVAC, power, drainage, medical gas only if verified, parking, fire and life safety, availability and fit-out condition. |
| Hospitality and serviced accommodation | Facade and arrival; reception; representative room or unit types; corridors; food and beverage; amenities; back of house and service access; parking; plans and approved tour. | Key or unit count, room mix, operating state, branded or unbranded status, facilities, access, service areas and any performance figure only when an approved source and permission exist. |
| Worker housing | Exterior, entrance and security context; representative rooms; shared kitchens and washrooms; circulation; recreation or common areas; bus and parking provision; fire-safety evidence; plans. | Licensed or verified capacity only, room and bed configuration, shared facilities, transport access, utilities, management arrangement, availability and material occupancy constraints. |
| Education | Arrival, entrance and controlled access; classrooms; labs or activity spaces; circulation; outdoor areas; drop-off, bus and parking; fire and life-safety routes; plans. | Previous and permitted use, verified capacity only, room mix, accessibility, outdoor provision, transport circulation, utilities and availability. |
| Wedding hall and entertainment | Entrance and arrival; main hall; stage or focal area; representative seating layout; kitchens and service areas; washrooms; parking and drop-off; exits and life-safety context; plans. | Verified capacity only, hall dimensions, divisible areas, service access, kitchen provision, parking, accessibility, operating constraints and permitted use. |
| Gas station | Site approaches and entry or exit; canopy and forecourt; convenience retail; service areas; internal circulation; safe external views of safety systems; site plan. | Verified use and licensing state, plot and built areas, access directions, fuel or service scope only where approved, retail area, circulation and material constraints. Do not expose sensitive security details. |
| Mixed-use or whole building | Building context plus representative current media for every offered use, common areas, vertical circulation, parking, service access, roof or plant only where safe, stacking and site plans. | Use mix, floor schedule, offered areas, shared systems, access separation, parking, service routes, availability by component and source-linked building facts. |

Serviced offices follow the office template with added service inclusions and access rules. A showroom follows the retail template unless its industrial servicing needs activate the warehouse requirements. The engine can combine templates, but the public page must still use one clear primary asset type.

### Media mission interaction

Each media category appears as a task card with:

- A plain-language purpose, for example “Show the building entrance so a visitor can recognize arrival.”
- A visual example or framing guide designed for that category.
- Camera, file upload and reuse-existing-media choices.
- Recommended orientation and minimum technical quality.
- Privacy prompts for people, vehicle plates, access codes, identity documents and security-sensitive areas.
- “Not available” with an explicit reason such as under construction, landlord work incomplete, restricted access or not applicable.
- Immediate quality feedback and a clear retry or keep-original option.

The lister should never need to understand image compression, formats or transcoding. Accept a documented safe set, create responsive derivatives in the background, preserve the original, show progress for each file and make failed uploads resumable on unstable mobile networks.

Suggested public sequence:

1. Building context.
2. Arrival and common areas.
3. Offered-space overview.
4. Space details and condition.
5. Functional or technical areas.
6. Plans, video and tours.

AI may suggest the cover and order. The lister confirms the final sequence, and SAT review can reject an irrelevant or misleading cover.

### Media quality and truth assistant

Automated checks should identify, with confidence and human override:

- Blur, darkness, severe glare, poor orientation and insufficient resolution.
- Duplicate and near-duplicate images.
- Collages, screenshots, third-party watermarks and probable unrelated images.
- Faces, vehicle plates, badges, access codes and likely private documents.
- Image category, building versus unit scope and likely mismatch with the selected asset type.
- Whether visual condition appears inconsistent with the selected shell, fitted, completed or under-construction state.
- Missing coverage categories and an unhelpful cover image.

Permitted assistance includes rotation, bounded crop, straightening, compression and conservative lighting correction while preserving the original. AI must never add or remove architectural features, views, finishes, furniture, defects, access, parking or surrounding context.

If virtual staging is offered later:

- Keep it separate from current-condition photography.
- Retain the original beside it.
- Label it visibly in EN and AR as virtually staged.
- Never use it as the only evidence of current condition.
- Do not let staging change structure, dimensions, windows, services or view.

Every public visual has a typed label: current photo, indicative image, developer render, virtually staged image, floor plan, site plan, video or 360 tour. Record rights confirmation, contributor, building or space scope, capture date where available, upload date, last-confirmed date and moderation state.

### Floor plans, video, tours and documents

**Floor and site plans:** strongly recommend a plan whenever layout materially affects a tenant's decision, including offices, retail, medical, education, hospitality, full floors, warehouses and land. Accept image or PDF first, with secure conversion to a public preview. Later support for CAD should be an explicit technical and security decision. AI may extract area labels, room names and dimensions for confirmation, but an image alone never becomes an authoritative measurement. Label each plan as as-built, proposed, test fit, indicative or not to scale.

**Video walkthrough:** provide a short guided capture path that starts with identity or arrival, moves continuously through the offered space and ends with a relevant functional area. Prefer a clear truthful walkthrough over a promotional montage. Transcode safely, create a thumbnail and provide captions or a transcript in EN and AR. Do not invent a translation for unclear speech.

**360 and external tours:** accept only approved domains and clearly state whether the tour is current, indicative or externally hosted.

**Drone media:** optional only where lawful, safe, rights-cleared and materially useful. It is never a universal requirement.

**Documents:** separate public brochure, plan and specification from private identity, authority, ownership and licence evidence at the data and interface level. The user must see the classification before upload. Public documents receive safe previews and accessibility treatment. Private documents use least-privilege access, signed URLs, retention rules and audit logs.

### AI-assisted factual composition

AI should make the work easier without becoming the source of truth.

- Extract candidate facts from a brochure, plan, image metadata or structured document.
- Show the exact source beside each candidate and a confidence state.
- Ask one simple follow-up when confidence is low or sources disagree.
- Detect contradictions among title, asset type, condition, area, plan, price basis, map, geotag, permit, building media and space media.
- Draft a concise EN title, Arabic title, structured highlights and description only from lister-confirmed facts.
- Preserve one language-neutral fact model; generate both languages from it so the entity, figure, unit, availability and verification meaning cannot diverge.
- Recommend missing evidence based on the tenant-ready checklist.
- Never publish, verify, approve authority, infer legal use, calculate an unsupported figure or silently overwrite a confirmed value.

High-risk evidence and every consequential contradiction go to a human reviewer. Private documents and personal data cannot be sent to an external model until the provider-specific privacy review in the AI workstream permits it.

### Data and technical architecture

The current single listing row and browser-written form are not sufficient for this workflow. Claude should design the migration before implementation and preserve existing drafts safely.

Minimum domain objects:

- `buildings` and reusable building attributes.
- `spaces` or a clearly separated listing-space layer.
- `listings` for transaction-specific state and commercial terms.
- `listing_template_versions` for asset, condition and transaction rules.
- `listing_requirement_states` for provided, not applicable, unavailable with reason or reviewer-waived outcomes.
- `media_assets` with entity scope, category, kind, original, derivatives, contributor, rights, capture and confirmation dates, public or private classification, moderation state, AI flags and sort order.
- `documents` with public or private classification, type, version, expiry, access policy and review state.
- `extracted_fact_candidates` with source reference, confidence, proposed value, reviewer or lister decision and timestamp.
- `quality_assessments` with rule version, dimension, finding, resolution and human override.
- `media_verification_events`, submission versions and a complete audit log.

Use server-controlled drafts, validated server actions or APIs, signed resumable uploads, virus and unsafe-file handling, least-privilege Supabase RLS and background media processing. Provider keys, moderation credentials and storage credentials remain server-side. Original media must not be publicly addressable merely because a derivative is public.

### Responsive and accessible experience

- At 320 to 430 px, use a stable single-column task flow, native camera and file controls, sticky but non-obstructive save or continue action, upload queue, clear retry and an exact listing preview.
- On tablets, allow the task and evidence guidance to share space without shrinking controls.
- On wide screens, use a two-pane composition with the task on one side and live listing preview or evidence checklist on the other.
- Preserve focus, values and scroll position after errors and back navigation.
- Use at least 44 px touch targets, visible focus, text alternatives, keyboard-operable reordering and an alternative to drag and drop.
- Mirror layout behavior for RTL, but do not mirror media, floor plans, numbers, technical units or physical direction meaning blindly.
- Localize every asset type, media category, error, permission explanation, processing state and reviewer reason. Western numerals remain required in Arabic.
- Degrade gracefully on poor connections. Metadata can save before large media completes, and each upload resumes independently.

### Review, publication and listing presentation

Submission creates a reviewable version, not an immediate publication promise. The reviewer sees:

- Identity, authorization and advertising-licence state.
- Tenant-ready dimensions and unresolved reasons.
- Building versus space media and their provenance.
- AI quality findings, contradictions and human overrides.
- Public versus private document boundaries.
- Exact EN and AR public previews.
- Differences from the previous submission.

The published detail page should expose useful structured facts, not a wall of prose. It should show building context, offered-space evidence, price basis, current condition, availability, plans and documents, source and freshness, lister role, verification dimensions and a purposeful enquiry action. Missing information must remain visibly unavailable rather than being filled by generic copy.

### WS24 queued subpackages

These are subpackages of WS24, not new phases. Claude should implement them as coherent, build-gated batches after the current planned sequence reaches Phase 3.

| ID | Deliverable | Exit gate |
| --- | --- | --- |
| LST-0 | Research reconciliation, Saudi counsel and operations decisions, asset taxonomy, building-versus-space model and versioned requirements matrix. | Every requested fact, document and media category has a lawful purpose, owner, public or private state and asset-condition rule. |
| LST-1 | Draft architecture, secure upload pipeline, autosave, pause and resume, server validation and safe migration from the existing form. | No draft data loss; authorization, RLS, file safety, upload retry and audit tests pass. |
| LST-2 | Building lookup and reuse, property and space identity, asset-condition branching and tenant-decision facts. | The workflow asks no irrelevant required question for the tested asset and state matrix, and never conflates a development with a district. |
| LST-3 | Guided media mission, mobile capture, upload queue, categorization, ordering, rights and privacy states, floor plans, video and tours. | Required evidence categories are explainable; originals are preserved; public/private scope is safe; 390 px capture and recovery work in EN and AR. |
| LST-4 | Quality assistant, brochure and plan extraction, contradiction engine and source-linked human confirmation. | AI cannot create a confirmed fact, alter physical reality, publish or approve; unsupported candidate values remain unconfirmed. |
| LST-5 | Bilingual factual composer, tenant-ready checklist, exact public preview and submission review. | EN and AR derive from one confirmed fact model; preview equals the real listing components; all absolute SAT laws pass. |
| LST-6 | Reviewer workspace, correction requests, version comparison, verification timeline and publication controls. | Every decision is permissioned, reasoned and auditable; private evidence never appears publicly; publication follows the approved state machine. |
| LST-7 | Analytics, usability testing with Saudi owners and licensed brokers, tenant-quality feedback, operational tuning and launch gate. | No invented performance target; measured drop-off, correction, evidence quality and enquiry usefulness guide improvements before broad release. |

### Measurement and absolute acceptance gates

Instrument completion and friction by section, asset, condition, device, locale and start mode:

- Draft start, valid draft creation, resume and submission rates.
- Time and abandonment by section, excluding user-paused time.
- Upload failure, retry, duplicate and quality-warning rates.
- Required evidence missing, unavailable reasons and reviewer correction categories.
- AI extraction acceptance, correction and rejection rates by field and language.
- EN and AR copy correction rates.
- Submission-to-publication outcome and median review time.
- Tenant interactions with gallery categories, plan, video, facts, enquiry and requests for missing information.
- Qualified enquiry rate and feedback on whether the listing answered the tenant's decision questions.

Do not invent conversion or time targets from mock data. Establish baselines through moderated testing and real preview use, then set product targets. The following gates are absolute:

- Zero AI-invented or silently confirmed public facts.
- 100% of public media has rights acknowledgement, scope and moderation state.
- 100% of required categories has an explicit valid state.
- 100% semantic parity for EN and AR entity, figure, unit, condition, availability and verification meaning.
- Zero private verification document or personal detail exposed in a public listing.
- Zero listing published without the required authority and advertising-licence policy checks.
- Zero destructive media enhancement that changes physical reality.
- Accessible upload, error recovery, pause and resume work at the required device widths.

## AI, Data and Market-Intelligence Architecture

**Advisor:** use retrieval only from approved sources, preserve the retrieved evidence beside the answer, and log whether the model answered, abstained or escalated. The numeric rule is absolute: if a figure is not present in a retrieved approved source or a transparent deterministic calculation, the response must say it is unavailable. Evaluate English and Arabic separately.

**Data provenance:** every market figure needs source, period, unit, geography, entity kind, method and update date. Store averages and medians as different typed metrics. Store asking rents separately from completed transactions. Store user assumptions separately from verified inputs and derived outputs.

**Freshness:** listing availability, permit status, requirements and data publications need explicit current, stale, expired and unavailable transitions. A badge is a computed state, not marketing copy.

**Entity graph:** listings link to buildings, buildings to kind-aware locations, listers to roles and verification records, and market figures to source publications. This graph powers search, metadata, schema, Advisor answers and consistent page titles.

### AI provider and agent workstream, queued without interrupting the sequence

This is a sub-plan of WS21, WS34 and WS35. It does not create a new delivery phase and must not interrupt the current Phase 0 and Phase 1 sequence. Claude should pick it up when WS21 enters the active package queue. The only earlier exception is a provider-continuity defect that could stop the existing Advisor from responding.

**Immediate continuity check:** confirm the model identifier used by the deployed Advisor. The local snapshot inspected on July 23, 2026 defaulted to `deepseek-chat`, while DeepSeek states that this compatibility alias retires on July 24, 2026 at 15:59 UTC. If production still uses it, replace the configured identifier with a supported model such as `deepseek-v4-flash` through the existing environment configuration. Treat this as a narrow continuity correction, not permission to redesign or expand the Advisor.

**Provider decision:** SAT Markets will not commit to Kimi, DeepSeek, OpenAI, Google, Anthropic or any other provider as a permanent product dependency. Select models by measured quality, reliability, privacy and cost per successfully completed SAT task. Model names and prices change too quickly to become product law.

**Provider-neutral architecture:** place every model behind one SAT-owned server adapter with typed request and response contracts, timeouts, retries, fallbacks, streaming controls, token and cost recording, feature flags and a per-task model router. Provider keys remain server-side. No model receives Supabase credentials, unrestricted SQL access or direct write authority.

**Teaching and grounding:** do not teach changing market facts through a system prompt or fine-tuning. Use three controlled layers:

1. Versioned retrieval over approved SAT Knowledge Base content, product laws, methodologies, bilingual terminology and licensed external sources.
2. Typed SAT tools for current listings, listing facts, kind-aware locations, Rent Index averages, requirements, matches, verification scope and user-authorized actions.
3. Deterministic SAT functions for arithmetic, comparison, ranking inputs, units, thresholds and state transitions.

Fine-tuning, if later justified by evidence and supported by the selected provider, may improve tone, classification and bilingual consistency. It must never become the source of live listings, market figures, verification states or legal meaning.

**Where agents add value:** use agent behavior only for bounded multi-step work that benefits from planning and tool use. Priority cases are conversational property discovery, contextual questions on a listing, requirement-to-listing matching with reasons, listing-completeness assistance, bilingual listing drafting from user-supplied facts, approved-source market explanation, document or floor-plan extraction for human review, and operations-queue triage. Search filters, permissions, verification decisions, calculations, publication, offers, legal conclusions and irreversible writes remain deterministic or human-controlled.

**Advisor experience:** AI should be an intelligence layer across the product, not only a floating chat bubble. Provide natural-language discovery on Home and Listings, Ask about this property on listing detail, Explain this result on the Rent Index, Find matches on requirements, Improve this listing in the supply workflow, and recommended next actions in the dashboard. On mobile, use an accessible full-height sheet with structured cards, map handoff, source viewer and clear return to the underlying page. Responses should prefer listing cards, comparison blocks, source chips, reporting period, assumptions and next actions over long prose.

**Model evaluation:** maintain a replaceable candidate set. As of July 23, 2026, sensible candidates include DeepSeek V4 Flash and V4 Pro, Kimi K2.6 or its supported successor, Google Gemini Flash and Flash-Lite tiers, and OpenAI Luna or Terra tiers. This list is not an approval to integrate every provider. Start with the smallest adapter-compatible bake-off and retain only providers that pass.

Evaluate at least the following task classes separately in English and Arabic:

- Saudi commercial-property conversation and natural-language search.
- Correct district, development, trade-area, building and listing classification.
- Average versus median, period, source, unit and geography discipline.
- Tool selection, argument validity, permission handling and recovery from tool failure.
- Numeric abstention and exact claim-to-source support.
- Arabic terminology, Western numerals, grammar, RTL presentation and EN/AR meaning parity.
- Multi-turn instruction retention, prompt-injection resistance and malicious retrieved content.
- First-token latency, completion latency, availability, token use and cost per successful task.

The release gates remain absolute: zero unsupported figures; 100% exact-source coverage for factual quantitative answers; no development represented as a district; no average represented as a median; REGA Rental Index (Ejar) attribution only for the Rent Index; no external write without authenticated authorization and explicit user confirmation.

**Privacy boundary:** until provider-specific contractual, retention, training-use, storage-location and cross-border-transfer terms are approved, external models may receive only public, sample or strongly redacted data. Do not send names, telephone numbers, email addresses, identity evidence, licence documents, private requirements, enquiries, messages, contracts, deal documents or confidential commercial terms. A cheaper model does not justify weaker data protection.

**Queued subpackages:**

| ID | Timing | Deliverable | Exit gate |
| --- | --- | --- | --- |
| AI-0 | Immediate only if continuity is at risk | Confirm deployed model identifier and replace any retired alias without changing product behavior. | Existing Advisor remains available; EN and AR safety behavior is unchanged. |
| AI-1 | At the start of WS21 | Provider-neutral adapter, task router, timeouts, fallbacks, feature flags and privacy-safe cost and latency traces. | A provider can be replaced by configuration and contract tests, with no UI or data-layer rewrite. |
| AI-2 | Before choosing the main Advisor model | Versioned bilingual SAT evaluation corpus and repeatable provider bake-off. | The selected model wins on SAT tasks and passes every absolute law, not merely generic benchmarks. |
| AI-3 | Before open-ended Advisor answers | Approved retrieval index plus typed, least-privilege SAT read tools and deterministic calculation functions. | Every factual answer can preserve the exact retrieved evidence and tool result used. |
| AI-4 | WS21 user-facing package | Advisor V2 and contextual AI surfaces with structured results, citations, feedback, abstention and human handoff. | Primary mobile and desktop journeys complete in EN and AR with no unsupported claim. |
| AI-5 | After core supply and demand flows work | Listing copilot, explainable requirement matching and human-reviewed multimodal extraction. | AI assists real persisted workflows but cannot publish, verify or make consequential decisions. |
| AI-6 | Before production availability | Red-team suite, prompt-injection controls, per-user budgets, provider monitoring, retention policy and incident procedure. | Production approval records privacy terms, operating limits, rollback and provider replacement. |

**Cost control:** optimize cost through routing, compact tool payloads, prompt caching, bounded output, conversation summarization, rate limits and removal of unnecessary agent loops. Judge value using cost per successful search, sourced answer, qualified requirement or completed listing task. Do not weaken Arabic quality, source fidelity or user trust merely to minimize token cost.

## SEO, AEO and AI-Search Enhancement

Google states that its established SEO practices remain the foundation for AI features, with no special AI-only markup requirement. Build excellent canonical pages instead of chasing an `llms.txt` shortcut.

- Keep the Vercel preview noindex.
- Make canonical host environment-aware and use the acquired production domain only after launch setup.
- Add reciprocal `en`, `ar` and `x-default` alternates to every public entity page.
- Keep aliases, filters, private routes, prototypes, drafts and sample entities out of the sitemap.
- Generate unique human H1, title, description, OG and Twitter metadata without internal codes or nulls.
- Use structured data only for visible verified facts. Add WebSite, Organization, BreadcrumbList, RealEstateListing, Offer, Place and Dataset where the page truly supports them.
- Build real kind-aware location and building pages with original sourced content, not thin programmatic shells.
- Give every answerable page concise sections for verification, price basis, location kind, source, period and last checked.

Reference standards: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [structured data quality](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), and [AI features](https://developers.google.com/search/docs/appearance/ai-features).

## Technology and Code Enhancement

1. **Server-first data:** keep direct Supabase reads in server components for public data, but centralize query functions, field selection, error mapping, caching and authorization contracts.
2. **Typed domain layer:** introduce typed enums and formatters for location kind, verification dimension, listing purpose, rent basis, metric type, source type and freshness state.
3. **Component ownership:** shared primitives own accessibility and visuals; domain components own listing, requirement, market and verification meaning; pages compose them without inline style drift.
4. **URL state:** search, filter, sort, locale and selected entity states must be shareable, back-button safe and server-readable.
5. **Performance boundaries:** lazy-load maps and heavy media, use responsive images, subset and preload only necessary fonts, stream stable skeletons and set route-family budgets.
6. **Security:** review Supabase RLS per role and record, protect operations routes, validate server inputs, rate-limit public actions, use signed uploads, add CSP in report-only mode before enforcement, and minimize PII.
7. **Quality automation:** protect main with typecheck, tests, build, Arabic lint, metadata, schema, accessibility and visual smoke. Fix current high and moderate dependency findings or record time-bound exceptions.
8. **Observability:** capture application errors, slow routes, failed search, stale states, AI retrieval and citation quality, but never send message bodies, identity documents or private deal terms to general analytics.

## Measurement Without Invented Targets

Trust and release invariants can have absolute targets now: zero invented AI figures, zero verification-label mismatch, full bilingual parity and no unauthorized exposure. Business conversion targets cannot be responsibly invented from preview and sample data. Instrument them, collect at least four weeks of real traffic where volume permits, segment by locale and role, then set targets from observed baselines and operating capacity.

### Product, trust and release measurement framework

Business targets require real traffic baselines; trust, language, accessibility and AI invariants do not.

| Class | Metric | Definition | Target | Cadence | Guardrail |
| --- | --- | --- | --- | --- | --- |
| Primary outcome | Discovery to qualified enquiry rate | Unique listing-detail sessions that submit a valid enquiry divided by eligible listing-detail sessions. | Instrument first; set target after 4 weeks of real traffic. | Weekly | Spam, duplicate and low-quality enquiries are excluded by a documented rule. |
| Primary outcome | Requirement to qualified response rate | Published requirements receiving at least one eligible owner or licensed-broker response within the service window. | Instrument first; do not set from sample data. | Weekly | Protect requester privacy and exclude synthetic responses. |
| Primary outcome | Submission to verified publication rate | Real listing submissions that pass required verification and publish, divided by eligible submitted listings. | Baseline after real operations begin. | Weekly | Do not improve the rate by weakening verification. |
| Driver | Search success rate | Search sessions with a relevant detail click, save or enquiry divided by completed search sessions. | Baseline by query type and locale. | Weekly | Track zero-result and all-result failure patterns separately. |
| Driver | Median time to verified publication | Median elapsed time from complete submission to verified publish, excluding user-paused cases. | Set after observing operational capacity. | Weekly | Report median only; do not substitute average. |
| Driver | Median first qualified response time | Median time from enquiry or requirement publication to the first eligible response. | Set after baseline. | Weekly | Exclude automated acknowledgements. |
| Trust guardrail | Verification-label accuracy | Audited surfaces whose displayed badge exactly matches the underlying verified dimension. | 100% before launch and continuously. | Every release | Any mismatch is P0. |
| Trust guardrail | Freshness-state compliance | Listings with availability and permit state correctly derived from their timestamps. | 100% before launch. | Daily | Stale records cannot display a current state. |
| Language guardrail | Bilingual semantic parity | Audited EN and AR surfaces with identical entity, period, figure, state and action meaning. | 100% before launch. | Every release | Key parity alone does not count as semantic parity. |
| AI guardrail | Unsupported figure rate | Advisor responses containing a numeric figure without an approved retrieved source. | 0%. | Every release and daily sample | The model must abstain instead of estimating. |
| AI quality | Factual citation coverage | Factual Advisor answers with at least one visible approved source supporting the claim. | 100% for factual answers. | Daily sample | A citation must support the exact claim, not merely the topic. |
| Accessibility | Critical accessibility defects | Critical or serious defects across launch-critical journeys at required devices and assistive modes. | 0 before launch. | Every release | Automated scans do not replace keyboard and screen-reader review. |
| Performance | Core Web Vitals good experience | 75th percentile real-user LCP, INP and CLS for mobile and desktop. | LCP at most 2.5 s; INP at most 200 ms; CLS at most 0.1. | Daily and weekly | Track by route family and locale, not only sitewide average. |
| Reliability | Primary task error-free completion | Eligible primary task attempts completed without application error, dead action or data-loss event. | Baseline in preview; no known P0 defect at launch. | Daily | Separate user validation errors from system failures. |
| SEO guardrail | Indexability consistency | Submitted sitemap URLs that return 200, canonicalize correctly, remain indexable and have reciprocal localized alternates. | 100% before enabling indexing. | Every release and weekly | Do not measure indexed count as a guarantee of ranking. |
| Content guardrail | Unsupported public claims | Material claims without a current evidence-ledger entry. | 0. | Every release | Superlatives and future-domain claims are included. |
| Security guardrail | Unauthorized private-route exposure | Private routes or records accessible without the required authorization. | 0. | Every release and continuous monitoring | Robots exclusion is not access control. |
| Operations | Release evidence completeness | Shipped packages with required EN, AR, viewport, automated, accessibility and metadata evidence. | 100%. | Every release | No done status based on code review alone. |

## Instrument the Journey, Not the User's Private Content

Analytics should explain where users succeed or fail without becoming a second uncontrolled copy of personal or commercial data. Use stable event names, safe categorical properties, consent-aware identity and short retention. Product analytics and the verification audit log are different systems with different access.

### Privacy-aware event taxonomy

Events measure the journey without copying messages, documents, personal details or sensitive commercial terms into analytics.

| Event | Surface | Safe properties | Privacy rule |
| --- | --- | --- | --- |
| search_submitted | Listings and global search | locale, query class, filter count, result count, device class | Do not store free-text if it can contain personal data without a reviewed policy. |
| filter_applied | Listings, map and market | locale, filter name, safe value class, result count | Avoid raw identifiers where an aggregate category is enough. |
| listing_viewed | Listing detail | listing id, locale, entry surface, verification state, freshness state | Use internal opaque ids; no contact details. |
| enquiry_started | Listing detail | listing id, locale, signed-in state | No message text. |
| enquiry_submitted | Enquiry form | listing id, locale, success, validation error class | No contact data or message body in analytics. |
| requirement_started | Post requirement | locale, entry surface | No budget or location detail until policy approval; prefer buckets. |
| requirement_submitted | Post requirement | locale, success, completeness band | No requester identity. |
| listing_submission_started | List property | role, locale, entry surface | No evidence-document content. |
| listing_submitted | Listing review | role, locale, completeness band, success | No ownership or licence document identifiers. |
| verification_state_changed | Verification operations | entity kind, from state, to state, reason class | Audit log is access-controlled; analytics gets only safe aggregates. |
| viewing_requested | Listing and enquiry | listing id, locale, channel, success | No participant names or selected exact time in general analytics. |
| deal_workspace_created | Deal | origin, role mix, locale | No terms, values or documents in product analytics. |
| advisor_question_submitted | Advisor | locale, topic class, retrieval result count, abstained | Store raw question only under an approved privacy and retention policy. |
| advisor_citation_opened | Advisor | locale, source type, response id | No source credentials or private document paths. |
| language_switched | Global | from locale, to locale, route family | Anonymous until consent and account policy permit linkage. |
| pwa_install_accepted | Install prompt | locale, device class, browser class | Consent-aware aggregate only. |

## Accessibility and Performance Standards

Use WCAG 2.2 AA as the product baseline and align the Arabic and assistive-technology program with the Saudi Digital Government Authority's current version 2.0 guidance, which also covers WCAG 2.2. Test keyboard, screen reader, 200% zoom, reflow, target size, focus visibility, reduced motion and localized accessible names.

For real-user performance, use the current Core Web Vitals good thresholds at the 75th percentile: LCP at most 2.5 seconds, INP at most 200 milliseconds and CLS at most 0.1. Measure mobile and desktop by route family and locale. A fast home page does not compensate for a slow listing detail or map.

Official references: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Saudi DGA accessibility guidance](https://dga.gov.sa/en/digital-knowledge/web-accessibility-disabilities-and-elderly-people), and [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds).

## Definition of Done and Launch Gates

Claude, code completion is only the middle of the work. A package is done after automated checks, live EN and AR validation, mobile and desktop evidence, and independent review. If a gate cannot pass because the feature is planned, sample-led or awaiting counsel, keep the surface noindex and label its state. Do not weaken the gate to create a green status.

### Definition of done and launch gates

A code-complete feature is not complete until its live English and Arabic evidence passes.

| # | Gate | Requirement | Required proof |
| --- | --- | --- | --- |
| 1 | Product law | FAL only 1200025510; Harbor #3A6EA5; no satestate gold; no em dash; no invented AI figure; approved taxonomy and metric terms. | Automated forbidden-term tests plus reviewed live copy. |
| 2 | Dictionary parity | Every public and product string is centralized or explicitly allowlisted with exact EN and AR key parity. | Dictionary parity and hardcoded-prose scan. |
| 3 | Arabic rendering | Correct Arabic family, zero tracking, Western numerals, Arabic units and no unapproved English leakage. | Computed-style and DOM text checks on all representative pages. |
| 4 | Responsive layout | No global horizontal overflow, clipped dialog, overlapping floating action or duplicated navigation from 320 to 1920 px. | Automated screenshots plus targeted live review at the device matrix. |
| 5 | Touch and keyboard | Primary touch targets at least 44 px; logical focus order; visible focus; no keyboard traps. | DOM measurement and manual keyboard walkthrough. |
| 6 | Accessibility | WCAG 2.2 AA with no critical or serious issue on primary journeys. | Automated scan, screen reader sample, zoom, contrast and reduced-motion review. |
| 7 | Functional truth | Every visible CTA completes the stated job or is labelled Preview or Planned. | End-to-end tests and live role-based walkthrough. |
| 8 | Verification truth | Ownership, licence, authorization, SAT-listed and identity states render independently and correctly. | Fixture matrix and database-to-UI trace. |
| 9 | Data freshness | Availability, permits, requirements and market periods expose current, stale, expired or unavailable states correctly. | Boundary-date fixtures and live record checks. |
| 10 | Search correctness | Query and filter combinations return relevant counts, stable URLs, clear empty states and accessible alternatives. | Integration query suite including KAFD and Arabic examples. |
| 11 | Metadata integrity | Unique H1, title and description; correct canonical host; en, ar and x-default; no N/A or internal code. | Rendered-head crawler against all public templates. |
| 12 | Crawl consistency | No sitemap URL redirects, noindexes, authenticates or contradicts canonical policy. | Sitemap crawl and response-header audit. |
| 13 | Structured data | Schema matches visible verified facts and passes validators without irrelevant or hidden content. | JSON-LD snapshot tests and Rich Results Test samples. |
| 14 | Legal readiness | Terms, Privacy and Contact contain no placeholders and carry counsel approval. | Counsel sign-off record and live-page text comparison. |
| 15 | AI safety | Advisor cites approved sources, separates fact from assumption and abstains from unsupported figures. | Bilingual evaluation set with numeric, adversarial and no-source prompts. |
| 16 | Performance | Field Core Web Vitals meet good thresholds at p75; preview lab budgets catch regression. | Real-user monitoring plus Lighthouse or equivalent lab smoke. |
| 17 | Security | Private routes require authorization; RLS, rate limits, CSP, cookies, uploads and logs are reviewed. | Security checklist, anonymous access tests and dependency audit. |
| 18 | Observability | Errors, funnel events, search quality, AI quality and release health are measurable without sensitive payloads. | Event schema review and preview telemetry inspection. |
| 19 | Engineering | Typecheck, unit/integration tests, build, Arabic lint, metadata, schema and accessibility checks pass. | Protected CI checks on the release commit. |
| 20 | Live parity | Every changed route is verified live in EN and AR before done. | Live URLs, screenshots and reviewer checklist attached to handover. |
| 21 | Production domain | Domain is acquired, DNS controlled, SSL active, environment URL correct and redirects tested. | External DNS and URL verification. |
| 22 | Index activation | Real inventory and legal pages are ready before ALLOW_INDEX is enabled. | Launch approval record and post-deploy robots/canonical crawl. |
| 23 | Rollback | Release can revert application and indexing state without data loss. | Documented rollback drill. |
| 24 | Advisor audit | Independent review confirms the package evidence and remaining caveats. | Codex sign-off or explicit exception from Saleem. |

## Recommended Next Steps

1. Claude should acknowledge this plan and map the current code to WS01 through WS14 before changing visuals.
2. Saleem should approve the controlled product laws, the preview-state wording, the future production-domain policy and whether Pricing stays hidden or explicitly conceptual.
3. Claude should submit Phase 0 and Phase 1 as small build-gated packages with live EN and AR evidence.
4. Codex should independently re-audit the shared typography, verification semantics, metadata factory and route policy before Phase 2 begins.
5. Public discovery should then proceed in this order: Home, Listings Search, Listing Card, Listing Detail, Locations/Map, Rent Index/Market, Advisor, Brokers/Listers.
6. Do not schedule production indexing until counsel, real inventory, domain ownership, search correctness and launch monitoring are all confirmed.

## Decisions Still Needed From Saleem

- Whether conceptual pricing remains visible during preview.
- The approved neutral relationship statement between SAT Markets and SAT Real Estate.
- Which party owns legal approval and which legal entity will operate the platform.
- The exact verification policy for owner, broker authorization, identity, permit and SAT-listed records.
- Whether requirements may be publicly indexable and what requester information can appear.
- Which real market datasets are licensed for public display, export and AI retrieval.
- Whether the production default locale is English, Arabic or a neutral language selector.
- Whether installable PWA behavior is enough for the first public release.

## Caveats and Assumptions

This is an execution blueprint derived from the current source snapshot and preview. Effort points and package counts express relative planning weight, not a contractual timeline. Claude must size work against current implementation and external dependencies.

Product conversion targets are intentionally deferred until real traffic and real inventory exist. Legal and privacy recommendations require qualified Saudi counsel. Accessibility guidance is used as a strong commercial standard; SAT Markets is not being represented as a government service. No code, data, account, domain or deployment was changed while producing this plan.

## Source Links

External product, regulatory and research references below were reviewed on July 23, 2026.

- [SAT Markets complete bilingual audit, July 22, 2026](https://satmarkets-sat-markets.vercel.app/en)

- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)

- [Saudi Digital Government Authority accessibility guideline, version 2.0](https://dga.gov.sa/en/digital-knowledge/web-accessibility-disabilities-and-elderly-people)

- [web.dev Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)

- [Google Search Central localized page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions)

- [Google Search Central structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

- [Google Search Central AI features and websites](https://developers.google.com/search/docs/appearance/ai-features)

- [Saudi REGA Real Estate Marketing and Advertising Regulations](https://rega.gov.sa/%D8%A7%D9%84%D8%A3%D9%86%D8%B8%D9%85%D8%A9-%D9%88%D8%A7%D9%84%D9%82%D8%B1%D8%A7%D8%B1%D8%A7%D8%AA/%D8%A7%D9%84%D8%A3%D9%86%D8%B8%D9%85%D8%A9-%D9%88%D8%A7%D9%84%D9%84%D9%88%D8%A7%D8%A6%D8%AD-%D9%88%D8%A7%D9%84%D8%A3%D8%AF%D9%84%D8%A9/%D8%A7%D9%84%D9%84%D9%88%D8%A7%D8%A6%D8%AD/%D8%A7%D9%84%D9%84%D8%A7%D8%A6%D8%AD%D8%A9-%D8%A7%D9%84%D8%AA%D9%86%D8%B8%D9%8A%D9%85%D9%8A%D8%A9-%D9%84%D9%84%D8%AA%D8%B3%D9%88%D9%8A%D9%82-%D9%88%D8%A7%D9%84%D8%A5%D8%B9%D9%84%D8%A7%D9%86%D8%A7%D8%AA-%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%B1%D9%8A%D8%A9/)

- [Saudi REGA Real Estate Advertisement Licence Issuance](https://rega.gov.sa/en/rega-services/eservices/real-estate-advertisement-license-issuance/)

- [Saudi REGA Advertisement Licence Inquiry announcement](https://rega.gov.sa/en/media-center/news-announcements/rega-launches-real-estate-advertisement-license-inquiry-service/)

- [Property Finder Listing Quality Score](https://support.propertyfinder.ae/hc/en-us/articles/23314960066834-What-is-Listing-Quality-Score)

- [Property Finder AAA Stock Quality Rules](https://support.propertyfinder.ae/hc/en-us/articles/12169607409682-AAA-Stock-Quality-Rules)

- [Property Finder Listing Verification](https://support.propertyfinder.ae/hc/en-us/articles/12069688916114-Listing-Verification)

- [Bayut TruCheck guidance](https://www.bayut.com/mybayut/expert-advice-trucheck-bayut/)

- [Bayut property-specific verification photographs](https://support.bayut.com/hc/en-us/articles/13338235437330-Why-has-my-TruCheck-verification-failed-for-a-completed-project)

- [Bayut floor-plan quality guidance](https://www.bayut.com/agentportal/announcements/floor-plans-mandatory-to-get-a-perfect-quality-score/)

- [Crexi listing entry and brochure-assisted creation](https://learn.crexi.com/listing-properties-on-crexi-crexi-help-center)

- [LoopNet commercial listing media services](https://www.loopnet.com/solutions/)

- [LoopNet property-level and space-level documents and media](https://broker-ownerhelp.loopnet.com/article/245-how-do-i-add-or-edit-a-document)

- [CBRE 2025 Americas Office Occupier Sentiment Survey](https://www.cbre.com/insights/reports/2025-americas-office-occupier-sentiment-survey)

- [RICS on AI-assisted property listings and human fact checking](https://ww3.rics.org/uk/en/modus/business-and-skills/upskilling/ai-property-listings.html)

- [GOV.UK question-page form pattern](https://design-system.service.gov.uk/patterns/question-pages/)

- [GOV.UK accessible file-upload component](https://design-system.service.gov.uk/components/file-upload/)

- [Baymard required and optional field guidance](https://baymard.com/blog/required-optional-form-fields)

## Advisor Boundary

Codex produced this document as an independent advisor. Claude Cowork remains the implementation owner. No code, database, account, domain or deployment change was made while producing it.
