# ARGUS Solution Specification

## Executive summary

ARGUS is an automation-first approval workflow and institutional compliance console. It combines configurable application routes, case-stage state, EVC scheduling, time-bound undertaking tracking, document validity, alerts/escalations, role-aware work queues and audit records. The product's core value is the closed loop between the event that occurs, the rule that matches, the permitted action that follows and the traceable evidence that the action occurred.

## The operating loop

1. **Capture event:** stage completed, deficiency returned/resubmitted, EVC becomes eligible, evidence submitted, deadline nears/passes, document validity changes.
2. **Validate context:** target record exists; state transition is legal for the configured route; actor has permission; required fields exist; date source is clear.
3. **Evaluate a versioned rule:** inspect route profile, prerequisites, due/expiry dates, owner, configured threshold and escalation ladder.
4. **Prevent duplicates:** create an idempotency key such as `entity_id:rule_id:threshold_window:policy_version`; do not repeat an already processed action.
5. **Plan and authorize:** permitted routing/task/alert actions may run automatically; restricted scrutiny and final decision actions require an authorized human.
6. **Execute:** update case/task state, create in-app notification/task or queue an external notification (production only).
7. **Audit:** record actor/system identity, timestamp, target, event, rule/policy version, outcome, correlation ID, and reason where applicable.
8. **Surface exceptions:** failed actions, missing owner, invalid configuration and retry exhaustion must remain visible instead of disappearing silently.

## Functional modules

### A. Application intake and routing

- Capture synthetic/demo application metadata, institution, application type, region, owner, route profile, current stage, stage due date and status.
- Support route profiles representing applicable combinations, including `Scrutiny only`, `Scrutiny + EVC`, `EVC + SAC/SHC`, and `Only EVC`, plus an extensible configuration model.
- Compute next eligible stage from the selected profile rather than assuming all applications share one linear route.
- Block a transition if prerequisites or role permissions are missing.
- Return for deficiency only with a non-empty reason and record the stage to resume. Resubmission returns to the designated review point rather than silently skipping scrutiny.
- Never auto-complete a final statutory decision. Route to `Decision pending` and expose the decision action only to the competent-authority role.

### B. Pendency and workload

- Display counts by stage/status, age band, region and owner.
- Expose current owner, next action, due date, days pending and whether reminder/escalation has fired.
- Provide case search/filter and an aging/bottleneck view. Metrics use seeded data in the prototype and are not performance claims.

### C. EVC scheduling

- Put a case in the EVC queue only when the selected route requires EVC and configured prerequisites are complete.
- Track coordinator, scheduling state, visit date, panel/committee, report status and next action.
- Generate a scheduling task for eligible but unscheduled cases; remind/escalate if the configured timeline is crossed.
- Keep visit scheduling and report completion separate events.

### D. Undertakings and compliance evidence

- Track obligation name/type, institution, applicable condition, due date, submission status, evidence reference, reviewer and verification state.
- Submission creates a pending-verification state; it must not mark evidence verified.
- Authorized reviewers record verified/rejected/needs-clarification with notes and timestamps.
- Missing, upcoming and overdue obligations participate in rule evaluation.

### E. Document validity and renewal

- Track document type, institution, issue/expiry dates, renewal status and review owner.
- Produce advance expiry warnings and an overdue escalation according to configurable demo policy.
- Treat renewal submission and authorized verification as separate states.
- The prototype does not prove document authenticity; production authenticity checks would require authorized sources and explicit integration.

### F. Alerts and escalations

- Supported demo categories: due-soon reminder, overdue escalation, EVC scheduling task, EVC report follow-up and document-expiry warning.
- Each alert must expose target, rule, reason/trigger, recipient role/owner, severity, status and audit reference.
- External delivery channels remain simulated unless provider delivery is implemented and verifiably tested.

### G. Audit and reports

- Search/filter audit events by record, actor, event type, rule and timestamp.
- Export a CSV for demo review if supported by the application.
- A production event should be append-only, time-stamped, access-controlled and correlated to the triggering event and rule evaluation.

### H. Rules administration

- Configure route profile, reminder threshold, expiry threshold, escalation recipient and stage SLA for the demo.
- Clearly mark example thresholds as `DEMO CONFIGURATION — NOT AN OFFICIAL AICTE TIMELINE`.
- In production, rule changes need authorization, versioning, effective dates, validation, audit and test/sandbox mode before activation.

## Minimum end-to-end demo scenario

1. Open a synthetic case that has reached the scrutiny stage.
2. Complete the permitted stage as a scrutiny officer and show rule-driven transition to the next eligible stage.
3. Return another case for deficiency; omit the reason once to demonstrate validation, then provide a reason and confirm. Show the audit record and resubmission path.
4. Run the automation cycle on seeded deadlines. Show reminders and escalations, then run it again and prove duplicate actions are not created.
5. Show an EVC-required case in the queue, assign a visit and record report status.
6. Submit evidence as an institution user, then switch to a reviewer and verify it; show that submission did not equal verification.
7. Show an expiry warning, submit a renewal, and keep verification pending until an authorized action.
8. Open audit history and trace the events back to the case/rule.
9. Show a `Decision pending` case and explain that the competent authority—not an AI model—makes the final statutory decision.

## Information architecture

- Overview: pendency, due soon, overdue, EVC queue, recent automation events.
- Applications: searchable list and case detail/action panel.
- Compliance: obligations and evidence verification states.
- EVC desk: eligibility, assignment, visit date and report follow-up.
- Documents: validity, renewal state and expiry warnings.
- Alerts: reminder/escalation queue with acknowledgement.
- Audit: chronological trace of user and system events.
- Rules: configurable demo settings and enabled rule catalogue.

## Design qualities

Use professional high-contrast regulatory console styling, legible tables, consistent status chips, clear current/next stages, visible data freshness, empty/error/loading states, responsive behavior and accessible controls. Status must not rely on color alone. All demo data must be identified as synthetic. Avoid decorative AI claims that do not support a user task.
