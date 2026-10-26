# Workflow State Machine and Rule Catalogue

## Route profiles (configurable examples)

The following are prototype route shapes to demonstrate configuration. Validate actual stage sequences and prerequisites against applicable official procedures before real use.

| Profile | Demo stage sequence |
|---|---|
| Scrutiny only | Initial Scrutiny → Decision Pending |
| Scrutiny + EVC | Initial Scrutiny → EVC Scheduling → EVC Report Review → Decision Pending |
| EVC + SAC/SHC | EVC Scheduling → EVC Report Review → SAC/SHC Review → Decision Pending |
| Only EVC | EVC Scheduling → EVC Report Review → Decision Pending |

`Institution response` is a controlled return state, not a universal route stage. A returned case stores `resume_stage`, the return reason, returning actor and timestamp. On resubmission, the case returns to its stored review stage and the new evidence enters the review queue. `Decision Pending` never auto-approves or auto-rejects.

## Required guards

- Current stage must match the expected state/version.
- Selected route profile must contain the requested next stage.
- Prerequisites must be completed.
- Actor must be allowed for the command and target region/case.
- Deficiency reason must be non-empty and meaningful.
- Evidence submission cannot self-verify.
- EVC task cannot be scheduled before EVC eligibility.
- Duplicate command/event cannot create a second side effect.
- Decision action is restricted to the designated competent-authority permission.

## Rule catalogue

| Rule ID | Trigger/condition | Permitted action | Guard/evidence |
|---|---|---|---|
| WF-01 | A stage completion event arrives and route has next stage | Move to next eligible stage or create next-stage task | Validate actor, preconditions and route; write transition audit |
| WF-02 | Authorized user returns for deficiency | Set Institution Response state and preserve resume stage | Mandatory reason; notify institution (simulated in prototype); audit |
| WF-03 | Institution submits requested response | Restore resume stage and assign reviewer | Record submission reference and actor; not auto-verify response |
| DL-01 | Unresolved item within configured reminder window | Create reminder/task | Threshold is demo config; idempotent per item/rule/window/version |
| DL-02 | Unresolved item past due and not already escalated at that level | Create escalation to configured recipient | Record due date, overdue duration and escalation rung |
| EVC-01 | Route requires EVC and prerequisites are satisfied | Add/update EVC scheduling queue task | Do not create duplicate active queue items |
| EVC-02 | EVC visit date near/past or report outstanding | Create reminder/escalation | Track scheduled date and report status separately |
| CMP-01 | Institution submits evidence | Set Pending Verification and assign authorized reviewer | Submission must not equal verification |
| CMP-02 | Authorized reviewer verifies/rejects evidence | Set result with note and timestamp | Permission + audit record required |
| DOC-01 | Document expiry within configured threshold | Create expiry reminder and renewal task | Rule config is illustrative unless validated |
| DOC-02 | Document expired and renewal not verified | Create overdue alert/escalation | Idempotent; no claim authenticity is checked |
| SEC-01 | Actor attempts a forbidden action | Deny action and record security-relevant audit event where policy permits | Server-side authorization required in production |
| SYS-01 | Any automated action executes | Write correlated audit outcome | Unique idempotency key, rule version, result |

## Idempotency

Construct a unique action key, for example `subjectType:subjectId:ruleId:thresholdWindow:policyVersion`. Store it under a unique constraint before side effects are confirmed. Reprocessing the same event must return the earlier outcome, not send another notification or create a duplicate task. If business rules require a later escalation rung, include the rung/window in the key.

## Rule configuration

Each rule needs: `rule_id`, `version`, `enabled`, `effective_from`, optional `effective_to`, trigger, condition expression or typed fields, action, target role/queue, threshold, working-day/calendar policy, idempotency template, severity, and audit metadata. In production, use typed validated configuration rather than executing arbitrary code supplied by an administrator.

## Demo date policy

Seeded dates and default thresholds exist only to make the demo repeatable. Label them `DEMO CONFIGURATION — NOT AN OFFICIAL AICTE TIMELINE`. Keep all dates in ISO format in data; display them in the user's locale. Tests must cover before/at/after threshold and timezone boundaries.
