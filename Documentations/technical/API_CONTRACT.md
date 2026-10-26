# API Contract Outline

The contract is framework-neutral. Use the naming/serialization conventions of the repository's current backend if already established. Every mutating route needs authentication, permission checks, input validation, transaction boundaries and audit handling.

## Read endpoints

- `GET /api/v1/dashboard/summary?regionId=...` — stage counts, overdue/due-soon counts, EVC queue size; return data timestamp and applied scope.
- `GET /api/v1/applications` — filters: stage, status, region, owner, query, due bucket; return cursor/page and total where practical.
- `GET /api/v1/applications/{id}` — case plus route, next permitted actions, obligations/EVC link and recent audit references.
- `GET /api/v1/evc-queue` — only EVC-eligible cases; filter by scheduling/report status.
- `GET /api/v1/compliance-obligations` — filter institution/status/due bucket/reviewer.
- `GET /api/v1/documents` — filter expiry bucket/renewal state.
- `GET /api/v1/alerts` and `GET /api/v1/audit-events` — authorized filters, pagination and safe projections.
- `GET /api/v1/rules` — active version and authorized rule metadata.

## Commands / mutations

- `POST /api/v1/applications` — create intake record; server calculates route starting state.
- `POST /api/v1/applications/{id}/complete-stage` — body includes expected version, completion summary and optional evidence refs; server validates route and advances to next configured stage.
- `POST /api/v1/applications/{id}/return-for-deficiency` — requires `reason`, expected version and optionally specific missing items; stores resume stage.
- `POST /api/v1/applications/{id}/resubmit` — references the deficiency request and evidence refs; resumes the designated review stage.
- `POST /api/v1/evc-queue/{id}/schedule` — committee/panel, date/time and coordinator; only eligible records.
- `POST /api/v1/evc/{id}/report` — report metadata/evidence reference and submission event.
- `POST /api/v1/compliance-obligations/{id}/evidence-submissions` — institution submission, creates Pending Verification.
- `POST /api/v1/evidence-submissions/{id}/verification` — authorized reviewer decision, note and outcome.
- `POST /api/v1/documents/{id}/renewal-submissions` — submit renewal evidence; status stays pending review.
- `POST /api/v1/renewal-submissions/{id}/verification` — authorized reviewer outcome.
- `POST /api/v1/automation/run` — admin/demo-only trigger; production cycles should normally be scheduled by a worker and run with service identity.
- `POST /api/v1/alerts/{id}/acknowledge` — acknowledgement is not the same as resolving the underlying issue.
- `POST /api/v1/rules/{id}/versions` — privileged change, validation, versioning and audit.

## Common response envelope

Success: `{ "data": ..., "meta": { "requestId": "...", "asOf": "ISO-8601" } }`.

Error: `{ "error": { "code": "INVALID_TRANSITION", "message": "...", "details": { ... } }, "meta": { "requestId": "..." } }`.

Use stable codes such as `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT_VERSION`, `INVALID_TRANSITION`, `PREREQUISITE_NOT_MET`, `DUPLICATE_ACTION`, `POLICY_INVALID` and `TEMPORARY_UNAVAILABLE`.

## Invariants

- `expectedVersion` prevents two concurrent users from silently overwriting stage state.
- Every accepted command returns a correlation/request ID.
- State-changing endpoints emit an audit event in the same transaction or via a reliable outbox.
- Notification sending must not occur before authorization and durable action/audit registration.
- Do not leak evidence/document content in list responses; use authorized time-limited access where storage is involved.
- Avoid status-changing `GET` requests.
- A route response must include allowed next actions and explanation, but server checks the rule again when command is submitted.
