# ARGUS — 24-Hour Build Plan

## Operating principle

Build and integrate one real vertical slice first. Aim for `event → rule → permitted state change/task → audit record`. Do not wait until hour 20 to integrate branches.

| Time | Deliverable | Gate |
|---|---|---|
| H0–H1 | Repo audit, dependency baseline, owners, branch plan, demo story | Every person knows files, owner and acceptance criterion |
| H1–H3 | Shared enums/types/contracts, synthetic data and basic app shell | Frontend and backend agree on exact shapes |
| H3–H6 | Application list/detail, route-profile state model, first endpoint/state handler | A case can be read and a permitted transition is represented |
| H6–H9 | Stage completion, blocked transition, deficiency return/resubmit | Reason required; resume stage correct; audit event appears |
| H9–H12 | Rule engine + due date reminders/escalations + idempotency | First cycle acts; second cycle does not duplicate |
| H12–H14 | EVC queue, prerequisites, scheduling, report status | Eligible vs ineligible case behavior shown |
| H14–H16 | Compliance evidence submit/verify and document renewal/expiry | Submit state cannot be mistaken for verification |
| H16–H18 | Role checks, alerts/audit screens, filters | One coherent flow works through UI and data layer |
| H18–H20 | Integration freeze, test all P0 and negative paths | No new P1 work unless all P0 passes |
| H20–H22 | UX polish, responsive check, demo dataset reset, error handling | The demo is repeatable and readable |
| H22–H23 | Two-person rehearsal, capture screenshots/video | Speaker can explain each event and result |
| H23–H24 | Regression, tag/backup, final limitations list | Known issues documented; no misleading claims |

## Scope cuts if late

Cut in this order: fancy charts/animations → nonessential filters → AI/OCR → live messaging → external integrations → extra route variations. Do not cut auditability, reason-required deficiency return, submit/verify separation, idempotency, core automation or role checks.

## Checkpoint rules

- Main must remain runnable and demoable.
- Open a PR as soon as a small vertical slice is reviewable.
- Announce schema or enum changes before merging.
- At H18, freeze the contract. New features require the integration lead's explicit approval.
- Record test commands and results; do not state that the app is production-ready.
