# Decisions, Assumptions and Open Questions

## Decisions locked for the prototype

1. Project name: **ARGUS**. Tagline: **Complete Visibility. Accountable Governance.**
2. Positioning: proposed AICTE Approval & Compliance Intelligence Platform; not official or endorsed by AICTE.
3. Main differentiator: event/rule/action/audit loop, not dashboard-only CRUD.
4. Rule thresholds and dates are configurable demo data, never represented as actual AICTE mandates.
5. The workflow may auto-route only across a configured path after prerequisites; no automatic final grant/reject decision.
6. Deficiency return needs a reason and stores a resume stage.
7. Evidence submission and authorized verification are separate actions.
8. EVC eligibility, scheduling, visit and report status are tracked as separate steps.
9. Renewal submission and document review are separate states.
10. Prototype uses synthetic records and a browser simulation; no production credentials/integration.
11. Integrate early and preserve a demoable main branch.

## Assumptions for the demo

- The named route profiles are examples of the workflow configurations described in SIH26262, not authoritative mappings for every application type.
- The simulation date defaults to 26 October 2026 so test cases are repeatable; the operator can change it in the demo settings.
- In-app alerts represent notification intent, not successful external delivery.
- Browser localStorage preserves only local demo state and is neither secure nor shared across teammates.
- UI role switching is instructional and cannot replace server-side authentication/authorization.

## Open questions before production design

- Which exact current APH/circulars and office procedures define every route, prerequisite, SLA, escalation rung and allowed stage action?
- What user identity provider and authorized AICTE/ERP interfaces are available, and what approvals are required to connect them?
- What document/evidence retention, access, export, and deletion policies apply?
- What are the authoritative definitions of the roles, regions, committees and case ownership scopes?
- Which notification channels are authorized, and what delivery receipts/retries are required?
- What user research or baseline data can support a real impact claim?

## How to resolve a conflict

Record the conflicting files/requirements, impact, owner and a proposed decision in an issue. Product/integration lead chooses the canonical definition, updates the relevant source documents, then asks all coding agents to re-read the updated section. Do not silently pick the easiest interpretation.
