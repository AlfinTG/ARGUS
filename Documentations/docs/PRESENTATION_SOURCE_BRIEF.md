# Presentation Source Brief — ARGUS / SIH26262

This is factual source material for the teammate creating the PPT. It is not a slide deck. Confirm each claim against the current build before presenting it.

## One-line proposition

ARGUS is an automation-first workflow and compliance intelligence platform that connects approval-stage routing, EVC scheduling, institutional undertakings, document validity, reminders/escalations and audit history in one role-aware console.

## Problem framing

The SIH26262 statement describes coordination challenges in monitoring application movement through scrutiny/re-scrutiny, EVC, SAC/SHC and other applicable stages; tracking pendency; coordinating time-bound undertakings and compliance evidence; and monitoring lease/other document validity. It calls for configurable end-to-end workflows, role-based dashboards, timely alerts, escalations, reports and audit trails.

Do not assert unverified current failure rates or financial savings. The team may include an actual survey/interview only if it was genuinely conducted and the evidence can be shown.

## Solution story

The system watches a defined workflow event, validates context and permission, evaluates configurable rules, creates a permitted next action, protects against duplicate side effects, and records an audit event. This is stronger than a static dashboard because the UI can show an explainable chain from trigger to outcome.

## Key modules

1. Application routing and deficiency loop.
2. Pendency/aging and role-based work queues.
3. EVC eligibility, scheduling, report status and escalation.
4. Time-bound undertaking/compliance evidence with separate submit and verify states.
5. Document expiry and renewal tracking.
6. Configurable reminders/escalations and action queue.
7. Auditable actions, rules and reports.

## Suggested slide sequence

1. Title: ARGUS — Complete Visibility. Accountable Governance.
2. Problem and workflow friction (use problem statement, not invented statistics).
3. Proposed solution: event → rule → authorized action → audit.
4. Workflow / role architecture.
5. Demonstrated automation (route advance + deficiency return + repeat-cycle idempotency).
6. Compliance and EVC / document expiry.
7. Security, human oversight and limitations.
8. Architecture and 24-hour build scope.
9. Demo evidence, next steps and production roadmap.

## Demo evidence to capture

- Case stage before/after a permitted completion event.
- Deficiency return with required reason and resubmission path.
- First and second automation cycle showing no duplicate action.
- EVC queue and scheduling/report state.
- Evidence submission versus authorized verification.
- Expiry/renewal state and audit record.

## Safe language

Say: “The prototype simulates rule-driven reminders and escalations with fictional records.”  
Do not say: “ARGUS is integrated with AICTE,” “the system verifies document authenticity,” “it sends real government alerts,” or “it reduces delay by X%” unless supported by implementation and independent evidence.

Final decision and statutory scrutiny remain with authorized officials; ARGUS supports coordination and traceability.
