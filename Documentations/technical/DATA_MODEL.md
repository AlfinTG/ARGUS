# Logical Data Model

This is a logical model; use the existing repository's ORM and conventions where applicable. IDs are stable identifiers, timestamps are UTC instants in production, and all policy/rule references must be versioned.

## Core entities

### ApplicationCase
- `id`, `institution_id`, `application_type`, `region_id`, `route_profile_id`, `route_profile_version`
- `current_stage`, `status`, `assigned_role`, `assigned_user_id` (nullable), `created_at`, `updated_at`
- `current_stage_started_at`, `due_at`, `version` (optimistic concurrency)
- `return_reason` (nullable), `resume_stage` (nullable), `returned_by`, `returned_at`, `resubmitted_at`
- Do not use institution names alone as IDs; avoid real personal data in demo fixtures.

### RouteProfile / RouteStage
- `id`, `name`, `version`, `enabled`, `effective_from`, `effective_to`
- ordered stage nodes with prerequisites, eligible roles, transition guards and next-stage conditions
- policy source/reference and approval/change metadata

### WorkflowEvent
- `id`, `event_type`, `subject_type`, `subject_id`, `actor_type`, `actor_id`
- `occurred_at`, `correlation_id`, `payload_schema_version`, safe structured payload

### RuleDefinition / RuleEvaluation
- `rule_id`, `version`, `enabled`, `configuration`, `effective_from`, `effective_to`
- evaluation result: matched/not matched, condition summary, rule version, target, timestamp and correlation ID
- avoid persisting unnecessary personal data in payload snapshots

### Action / Notification
- `id`, `subject`, `action_type`, `recipient_role`, `recipient_id`, `status`, `severity`, `reason`
- `rule_id`, `rule_version`, `idempotency_key`, `created_at`, `executed_at`, `outcome`, `failure_code`, `retry_count`
- external delivery status is distinct from a generated in-app action/task

### ComplianceObligation / EvidenceSubmission
- obligation: `id`, `institution_id`, `type`, `condition_reference`, `due_at`, `status`, `owner_role`, `reviewer_id`
- submission: `id`, `obligation_id`, `submitted_by`, `submitted_at`, `evidence_ref`, `notes`, `status`
- verification: `verified_by`, `verified_at`, `decision`, `review_note`
- submission and verification are separate entities/states

### DocumentRecord / RenewalSubmission
- document: `id`, `institution_id`, `document_type`, `issued_at`, `expires_at`, `status`, `owner_role`
- renewal: `id`, `document_id`, `submitted_at`, `evidence_ref`, `review_status`, `reviewer_id`, `reviewed_at`, `review_note`
- a metadata expiry alert is not proof of document authenticity or validity beyond the recorded dates

### EVCRecord
- `id`, `application_id`, `eligibility_status`, `queue_entered_at`, `coordinator_id`, `committee_id`, `scheduled_at`, `visit_status`, `report_status`, `report_submitted_at`, `follow_up_due_at`

### AuditEvent
- `id`, `event_id`, `actor_type`, `actor_id`, `action`, `subject_type`, `subject_id`
- `occurred_at`, `correlation_id`, `rule_id`, `rule_version`, `reason`, `result`, minimal metadata
- production design should make audit records append-only for application identities and restrict access based on policy

### User / RoleAssignment / RegionScope
- authentication subject, active status, role(s), institution/region scope, permissions, assignment history
- use least privilege, server-side checks and revocation; never trust the client role selector

## Important relationships

- Institution 1:N ApplicationCase, ComplianceObligation, DocumentRecord.
- ApplicationCase 1:N WorkflowEvent, EVCRecord, AuditEvent.
- ComplianceObligation 1:N EvidenceSubmission.
- DocumentRecord 1:N RenewalSubmission.
- RuleDefinition 1:N RuleEvaluation and Action.
- Each Action and audit event should correlate to the triggering event where available.

## Data quality and retention

Use explicit enums and foreign keys; validate due/expiry dates; retain raw time and source reference for date changes; record who changed a date and why; avoid hard deletes of records that may require audit retention; apply the retention policy only after it is authorized. Encrypt sensitive data in transit and at rest in a production deployment.
