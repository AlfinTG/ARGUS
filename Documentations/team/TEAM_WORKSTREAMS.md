# Team Workstreams and Ownership

Each workstream has one accountable owner, a clear output and a named integration partner. If the team has only three members, combine Workstreams B/C and assign integration ownership to the repository lead.

## Workstream A — Product, workflow and integration lead

- Own the issue board, acceptance criteria, route/event/status names and merge decisions.
- Maintain docs and resolve conflicts before code is written.
- Review permission boundaries, deficiency return/resubmission and audit completeness.
- Own final end-to-end test and merge to main.

**Done when:** P0 flow runs on main, all events/actions appear in audit, no duplicate automation actions, no known false claims.

## Workstream B — Frontend / user experience

- Build navigation, overview metrics, application list/detail, filters and responsive UI.
- Use the shared data types/API contract; avoid inventing alternative field names.
- Surface state, owner, due date, next action, source rule and audit reference.
- Build clear blocked/empty/error states and visible simulation labels.

**Done when:** every core user task has a working interaction and the UI reflects backend/source-of-truth state rather than local-only guesses.

## Workstream C — Workflow, data and automation

- Implement route profiles, transition guards, required deficiency reason, resume stage, event handling and idempotency.
- Implement deadline/expiry evaluation, EVC queue logic, task/alert creation and rule version references.
- Design persistence/schema and audit transaction boundaries.

**Done when:** positive, negative, boundary-date and duplicate-cycle tests pass.

## Workstream D — Compliance, documents, EVC and QA (or combine with C)

- Implement evidence submission versus verification, renewal versus review, EVC scheduling/report tracking.
- Prepare synthetic cases and automated/manual scenario tests.
- Verify role controls and data flows end-to-end.

**Done when:** all three lifecycle areas are traceable in UI and audit, and a teammate who did not code them can reproduce the demo.

## Cross-team handshake

Before branches diverge, agree on: stage enum, route profile ID, role enum, status enums, due-date format, API response envelope, audit event shape, idempotency key inputs and ownership of each file. Every branch should have an issue, owner, acceptance criteria and integration dependency.
