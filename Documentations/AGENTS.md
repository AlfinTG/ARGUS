# ARGUS Agent Contract

Before doing work, read `README.md`, `docs/PROJECT_CHARTER.md`, `docs/SOLUTION_SPECIFICATION.md`, `docs/24_HOUR_MVP.md`, `docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md`, and the relevant technical documents. Inspect the existing repository and tests first; preserve its current stack unless a documented reason supports changing it.


## Full-stack implementation directive

- The current browser prototype is not real authentication, server-side authorization, shared persistence, or a scheduled worker. Verify current repository state instead of inferring from the UI.
- If these components are missing, follow `docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md`: implement a backend API, real provider-backed authentication, server-side role and record-scope checks, shared PostgreSQL schema/migrations, durable idempotency, audit/outbox records, worker processing, and connected frontend flows.
- Preserve the current stack if it already provides a functioning equivalent. Do not expose service-role/database credentials to the browser.
- Documentation alone is not completion. Make actual code changes, tests, setup instructions and a truthful validation record. If credentials block a live integration, implement the integration boundary and mark it blocked, not complete.

## Product invariants

1. ARGUS is a proposed AICTE approval and compliance intelligence platform for SIH26262; never call it an official AICTE system.
2. Build automation-first: events and state transitions must trigger rule evaluation, create a permitted task/alert/action, and write an auditable result.
3. Approval routes are configurable. Never hard-code an assumed universal statutory route or timeline as official policy.
4. A deficiency return requires a meaningful reason and must retain the stage to resume after resubmission.
5. Compliance evidence submission and authorized verification are separate states.
6. EVC work must have prerequisites, scheduling status, responsible owner, report status, and an auditable record.
7. Reminder/escalation processing must be idempotent: repeat processing must not create duplicate side effects for the same subject + rule + threshold window.
8. Statutory scrutiny and final decisions remain with authorized officials. AI/OCR results are advisory and source-linked.
9. Use synthetic data only. Do not add credentials, sensitive data, live integrations, or claims of document authenticity unless explicitly implemented and approved.
10. Clearly label simulations and stubs. Never describe simulated alerts as real email/SMS or simulated role selection as security enforcement.

## Engineering approach

- First provide a short repository audit and plan. Then implement in small, testable increments; do not rewrite the whole application without explaining why.
- Keep shared types, API contracts and event names aligned with `technical/` documentation.
- Before opening a PR, run available tests, lint/type checks, build and manual smoke tests. Report commands and exact outcomes honestly.
- Add tests for positive, negative, unauthorized, duplicate/idempotency, and boundary-date cases when relevant.
- Keep `main` in a runnable state; use feature branches and pull requests.
- Never fabricate a passing test or silently change an acceptance criterion.

## Default task response

Return: (1) requirement addressed, (2) files changed, (3) design choice, (4) acceptance criteria, (5) tests actually run and results, (6) known limitations or assumptions, (7) handoff notes for integration.
