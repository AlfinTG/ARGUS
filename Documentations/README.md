# ARGUS — SIH26262

**Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System**

**Product:** ARGUS — AICTE Approval & Compliance Intelligence Platform  
**Tagline:** *Complete Visibility. Accountable Governance.*

ARGUS is a proposed hackathon solution, not an official AICTE product or an AICTE-endorsed system.

## Start here — required order

1. Read [`docs/PROJECT_CHARTER.md`](docs/PROJECT_CHARTER.md) and [`docs/SOLUTION_SPECIFICATION.md`](docs/SOLUTION_SPECIFICATION.md).
2. Read [`docs/24_HOUR_MVP.md`](docs/24_HOUR_MVP.md) and [`team/TEAM_WORKSTREAMS.md`](team/TEAM_WORKSTREAMS.md); agree on the single end-to-end demo scenario.
3. For backend, real authentication, shared PostgreSQL persistence, worker scheduling, security, tests and deployment, follow [`docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md`](docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md). Treat it as the coding-agent execution contract.
   The same blueprint is available as [`docs/ARGUS_Full_Stack_Implementation_Blueprint.pdf`](docs/ARGUS_Full_Stack_Implementation_Blueprint.pdf); the combined solution dossier PDF includes it as an appendix.
4. Review [`technical/ARCHITECTURE.md`](technical/ARCHITECTURE.md), [`technical/WORKFLOW_AND_RULES.md`](technical/WORKFLOW_AND_RULES.md), [`technical/DATA_MODEL.md`](technical/DATA_MODEL.md), and [`technical/API_CONTRACT.md`](technical/API_CONTRACT.md) before parallel coding.
5. Every coding agent must follow [`AGENTS.md`](AGENTS.md). Read the existing repository before changing its stack or file layout.
6. Open [`prototype/index.html`](prototype/index.html) in a modern browser to inspect and run the local interactive reference prototype.
7. The teammate making slides should use [`docs/PRESENTATION_SOURCE_BRIEF.md`](docs/PRESENTATION_SOURCE_BRIEF.md) as factual input. This repository intentionally includes no PowerPoint deck.

## Why ARGUS is automation-first

The central loop is **event → validated rule → authorized action → idempotency check → audit record → visible follow-up**. A dashboard is useful, but the differentiating demonstration is the system reacting correctly to a completed stage, a deficiency return, an upcoming deadline, an overdue obligation, an EVC scheduling requirement, or an expiring document.

## Current prototype status

The self-contained HTML prototype is a local browser simulation using fictional records and browser-local persistence. It demonstrates interactive workflow actions, configurable demo rule thresholds, simulated reminders/escalations, EVC queue actions, compliance submission/verification separation, document renewal review, and audit logging. It does **not** provide production authentication, server-side authorization, shared/persistent database, real email/SMS, a background scheduler, live AICTE integration, or authoritative regulatory verification.

## Critical safeguards

- Authorized officials retain statutory scrutiny and final regulatory decisions.
- AI/OCR, if added later, is advisory and must provide source-linked findings; it must not independently approve/reject an application.
- Use fictional/synthetic records for the hackathon demo.
- The date thresholds in the prototype are clearly labelled demo configuration, not AICTE-mandated timelines.
- Never claim an integration, legal compliance, document authenticity verification, measured efficiency gain, security certification, or production readiness without evidence.
- Do not commit credentials or real institutional/personal data.

## Repository map

- `docs/` — product charter, solution spec, 24-hour scope, production implementation blueprint, quality gates, demo source brief and validation records.
- `technical/` — architecture, workflow/rule design, data model, API contracts, security, test plan and scenarios.
- `team/` — workstreams, 24-hour plan, Git workflow, demo script, AI handoff and decisions.
- `prototype/` — interactive local simulation, no build system needed.
- `brand_assets/` — ARGUS identity assets.
- `.github/` — issue and pull-request templates.

## Source references

- SIH26262 detailed problem statement: https://zaidsayyed.in/tools/sih-problem-statements/sih26262
- Official AICTE Approval Process Handbook 2024–2027 reference: https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf

**Rule interpretation notice:** verify the currently applicable official handbook, circulars, and authorized procedures before encoding production rules. The handbook link is a reference point, not proof that a particular demo threshold is legally prescribed.
