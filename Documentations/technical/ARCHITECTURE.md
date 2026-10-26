# Architecture and Trust Boundaries

## Prototype now

A single-page vanilla HTML/CSS/JavaScript demo with seeded synthetic data and browser-local state. This is appropriate for a fast, portable interaction demonstration. It is not a secure multi-user architecture and must not be deployed as a live regulatory system.

## Recommended production shape

1. **Web client:** role-aware screens, form validation and evidence submission; client state is not authoritative.
2. **API layer:** authenticated application, workflow, EVC, compliance, document, alert and audit endpoints.
3. **Policy/workflow service:** versioned route profiles, transition guards, permission checks and policy evaluation.
4. **Automation worker:** scheduled due-date scans and event-triggered evaluations; durable queue, retries, dead-letter visibility and idempotency keys.
5. **Relational database:** transactionally store case state, submissions, assignments, rule versions, idempotency records and append-only audit events.
6. **Secure document storage:** least-privilege access, content type/size checks, malware scanning as feasible, retention policy and access auditing.
7. **Notification adapter:** in-app queue first; external channels only via approved provider/configuration with delivery status and retry policy.
8. **Observability:** structured logs, metrics, correlation IDs, health checks, failed job list and alerting.

## Event-to-action path

`command/event` → schema validation → authentication/authorization → load current state/version → validate transition preconditions → evaluate configured rule version → calculate idempotency key → transactionally write state/task/audit → enqueue notification outbox item → worker delivers or records simulated result → monitoring surface exposes outcome.

For external messaging, use a transactional outbox or equivalent reliable delivery pattern. Never send a message and then lose the database record of its result.

## Design principles

- Configuration-driven route profiles, not one global linear route.
- Explicit state machine, allowed transitions and guarded actions.
- Separate case workflow from post-approval obligations and document register.
- Human approval boundary is explicit and enforced in the API.
- Event version/correlation ID supports traceability.
- Idempotent command processing makes retries safe.
- Use soft deletion/archive only where retention policy permits; audit and regulatory retention needs must be confirmed.
- Keep rule configuration versions and effective dates.

## Stack decision for the 24-hour sprint

First inspect the existing GitHub repository and preserve the stack and scripts already in use. If the repository is genuinely empty, use a simple, familiar stack supported by the team; document the chosen frontend, API and database before parallel implementation. Avoid introducing a distributed architecture or an external service just to look sophisticated. The core event/rule/action/audit loop matters more than stack branding.

## Trust boundaries

- Browser state and role dropdowns are untrusted.
- Uploaded evidence is untrusted until checked and reviewed.
- Rule configuration is privileged input and must be validated/versioned.
- Notification provider responses can fail or be delayed.
- AI/OCR results are candidate observations only, never authoritative decisions.
- Any official-system integration requires authorization, documented API access, secure credentials and tested error handling.


## Full-stack implementation execution contract

See [`../docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md`](../docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md) for the actionable implementation plan, recommended defaults if the repository lacks a backend, auth/token verification, database model, worker/outbox, API behaviors, security baseline, deployment variables, acceptance tests and copy/paste coding-agent prompt. That document is the required implementation companion to this overview.
