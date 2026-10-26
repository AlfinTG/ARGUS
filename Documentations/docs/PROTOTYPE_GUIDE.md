# Prototype Guide

## Run

Open `prototype/index.html` in a modern browser. The reference prototype is intentionally self-contained and does not require a server, package install, API key or network connection.

## Prototype capabilities

- Dashboard, applications, compliance, EVC desk, documents, alerts, audit and rules screens.
- Fictional seeded data and a fixed/controllable simulation date for repeatable date-rule tests.
- Role selector for demonstrating role-aware actions. This is UI simulation, not security enforcement.
- Route-specific stage progression, authorized-action affordances, deficiency return with reason and resubmission.
- Rule cycle for reminders, overdue escalations, EVC tasks and document expiry; idempotency keys prevent repeated identical demo actions.
- Compliance evidence submission separated from reviewer verification.
- Document renewal submission separated from verification.
- Local browser persistence for a continuous demo; reset control restores the seeded scenario.
- Audit log for user actions and automation actions.

## Demo operator checklist

1. Open Overview and point out the sample-data/simulation banner.
2. Open Applications; inspect a scrutiny-stage case and complete the permitted stage.
3. Return a case for deficiency, first testing blank-reason validation, then confirm a real demo reason; resubmit and show the resume stage.
4. Open EVC Desk; schedule an unscheduled eligible case and record report state.
5. Open Compliance; submit evidence as institution user, then change to an authorized reviewer and verify it.
6. Open Documents; submit a renewal and show that it remains pending review.
7. Open Rules; confirm example thresholds are demo-only; run automation twice and compare counts.
8. Open Alerts and Audit to trace action, rule ID, subject and outcome.
9. Reset and rehearse again before recording.

## Reset

Use the prototype's **Reset demo** control. It resets browser-local demo data and seeded fixtures only. It does not affect any external system.

## Important implementation boundary

The prototype is a browser demo. Local persistence can be edited by the browser user; role restrictions are not server-secured; notification delivery is simulated; no authoritative AICTE integration exists. For a production design, follow the API, database, security and test specifications in `technical/`.
