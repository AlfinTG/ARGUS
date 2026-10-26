# ARGUS Project Charter

## 1. Mission

Design an integrated, secure, configurable workflow and compliance platform that helps authorized teams track AICTE approval-related applications, scrutiny stages, EVC scheduling, institutional undertakings, evidence review, document validity, deadlines, alerts, escalations and audit history.

## 2. Problem statement fit

SIH26262 identifies fragmented coordination and follow-up across approval stages, stage-wise pendency, EVC work, time-bound undertakings, compliance evidence and prescribed document expiry. ARGUS responds by connecting case state, workflow rules, deadlines, task ownership, notifications and audit history in one workflow-oriented interface.

## 3. Primary users

- Institution user: view applicable cases and obligations, respond to a deficiency, submit evidence and renewal documents.
- Scrutiny officer: inspect case metadata, record observations, advance a permitted stage, or return a case with a reason.
- EVC coordinator/committee member: view eligible queue items, schedule a visit, track report submission and record completion.
- Regional/Bureau officer: monitor pendency and overdue matters, assign follow-up, review evidence and escalate under authorized policy.
- Competent authority: review the case file and record the statutory decision reserved to that role.
- Administrator/policy owner: configure authorized route profiles, demo thresholds, roles and escalation ladders; changes must be versioned and auditable in a production design.

Role labels in the browser prototype are simulated. Real authorization must be enforced server-side.

## 4. Product principle

**Automate coordination, not statutory judgement.** ARGUS can route a case when a configured prerequisite is fulfilled, create reminders, assign work and escalate according to approved rules. It must not autonomously grant/reject approval or substitute for scrutiny, inspection, verification, or a competent authority's decision.

## 5. Outcomes sought

- Clearer current status, owner, next action and due date per case.
- Fewer manually repeated follow-ups through deterministic reminders/escalations.
- Earlier visibility of EVC scheduling and report bottlenecks.
- Traceable compliance evidence submission and authorized verification.
- Advance notice of document expiry and an auditable renewal trail.
- More accountable case movements and policy-driven reporting.

These are intended outcomes, not measured results. No impact percentage should be claimed without evaluation evidence.

## 6. 24-hour prototype goal

Deliver a demo-ready vertical slice with synthetic cases where a user can: inspect a case; advance a permitted stage; return it for deficiency with a required reason; resubmit and resume; create an EVC scheduling task; submit and separately verify compliance evidence; trigger reminder and escalation rules; identify document-expiry risks; and inspect a correlated audit history.

## 7. Explicit non-goals for the 24-hour sprint

- Live AICTE/ERP or government-system integration.
- Production legal-rule engine or authority for statutory timing interpretation.
- Real email/SMS/WhatsApp delivery unless credentials/provider integration are truly configured and tested.
- Production auth, security certification, or multi-tenant production data isolation in a static mock.
- Definitive document-authenticity checking or autonomous AI approval/rejection.

## 8. Success definition

A jury member can follow one case from a clear event, through rule evaluation and a permitted action, to an audit record. The team can show positive and blocked/negative paths, repeat a cycle without duplicate alerts, explain role boundaries, and transparently distinguish what is implemented from what is simulated.
