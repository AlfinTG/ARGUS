# 24-Hour MVP and Acceptance Contract

## Objective

Build the smallest credible vertical slice that proves the automation loop. A broad dashboard with inert buttons does not satisfy the MVP.

## P0 acceptance criteria — all are required for a strong demo

| ID | Acceptance criterion | Evidence to capture |
|---|---|---|
| P0-01 | At least five fictional applications have route, stage, owner, due date and status. | Applications list and case detail |
| P0-02 | Completing a permitted stage advances to the route-specific next stage, not a universal hard-coded path. | Before/after stage plus rule/event log |
| P0-03 | Invalid transition or unauthorized role is blocked with an explanatory message. | Negative test |
| P0-04 | Deficiency return requires reason, retains resume stage, and allows resubmission. | Return → response → resume trail |
| P0-05 | Automation cycle creates an upcoming deadline reminder and an overdue escalation from seeded records. | Alert queue and audit events |
| P0-06 | Re-running the same cycle does not duplicate action for the same rule/subject/window. | First cycle vs second cycle counts |
| P0-07 | EVC-required cases are queued after prerequisites; scheduling and report status are separately tracked. | EVC desk |
| P0-08 | Evidence submission creates pending verification; only an authorized reviewer can verify/reject. | Submit as institution role; review as official role |
| P0-09 | Expiring/expired document creates warning/escalation; renewal submission does not silently equal verification. | Document register + audit |
| P0-10 | Each action/alert exposes actor/system, target, timestamp, reason/rule, outcome and correlation/reference ID. | Audit trail |
| P0-11 | Prototype clearly labels synthetic data, demo policy thresholds and simulated notifications. | Persistent disclaimer/README |
| P0-12 | Core flow works from a fresh open/reload; errors, empty states and form validation are understandable. | Smoke-test checklist |

## P1 — do only after P0 works

- Persist demo state locally or through the chosen backend.
- Role-aware landing pages, filters for region/owner/stage/urgency and aging analysis.
- CSV export of audit data and a compact report.
- Rule editor with enabled/disabled rules and a visible policy version.
- Backend API, database migrations, actual auth enforcement and notification provider, only when properly integrated and tested.

## P2 — explicitly future work unless genuinely implemented

Live AICTE integration; official regulatory-rule ingestion; production multi-tenant access control; external notification delivery; official document authenticity verification; AI/OCR; production scheduler/retry queue; deployment/security audit; user research and measured impact.

## 24-hour schedule

- **Hour 0–1:** inspect repository and baseline, agree types, owner roles, acceptance criteria and branch strategy.
- **Hours 1–4:** shared data model, app shell, seeded dataset and application list/detail.
- **Hours 4–8:** route profiles, valid/invalid transitions, deficiency return and resubmission.
- **Hours 8–12:** rule evaluator, due-date reminders, overdue escalations and idempotency.
- **Hours 12–15:** EVC queue, assignment/scheduling and report status.
- **Hours 15–18:** compliance submission/verification and document renewal/expiry handling.
- **Hours 18–20:** audit correlation, filters, role-gating checks and error/empty states.
- **Hours 20–22:** integration freeze, tests, bug fixes and clean demo dataset/reset.
- **Hours 22–23:** rehearsal with exact script and backup screenshots/video.
- **Hours 23–24:** final regression, known-limitations note, branch cleanup and tag/release.

If time slips, cut visual polish before cutting end-to-end logic or auditability. Cut AI/OCR, live messaging and integrations before P0. Keep the main branch demoable.

## Demo readiness gate

Do not declare ready until two people independently perform the scripted flow, a second automation cycle creates no duplicate entries, the deficiency reason persists, evidence cannot be self-verified by the submitting role, all visible dates are consistent, and the team can explain the simulation boundaries in one sentence.
