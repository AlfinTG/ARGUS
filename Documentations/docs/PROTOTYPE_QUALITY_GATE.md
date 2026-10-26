# Prototype Quality Gate — Target Score 10/10

This is an internal acceptance rubric, not a promise of jury scoring. Each point is earned only when a test or reproducible demo proves it.

| Point | Gate | Evidence needed |
|---:|---|---|
| 1 | Problem fit and scoped product story | Team maps every core screen/action to SIH26262 and avoids invented impact claims |
| 2 | Route-aware workflow | Valid stage completion follows the selected route; invalid/missing prerequisites are blocked |
| 3 | Deficiency loop | Blank reason blocked; reason, resume stage, response submission and return to review are preserved |
| 4 | Automation correctness | Reminder/overdue/expiry rules evaluate exactly at/before/after thresholds using an explicit simulation clock |
| 5 | Idempotency | Re-running unchanged event inputs creates no duplicate action for same subject/rule/threshold window/policy version |
| 6 | EVC lifecycle | Eligibility, scheduling, visit date and report status are distinct; future visit cannot be recorded as already reported |
| 7 | Compliance lifecycle | Submission, pending review, verified/rejected/clarification and resubmission are distinct and auditable |
| 8 | Document lifecycle | Expiry warnings, renewal submission, authorized review and renewal resubmission operate as separate states |
| 9 | Access and auditability | Role controls block prohibited actions in UI; every state change has actor/time/target/rule/outcome/reference; production security limits explained |
| 10 | Reliability and demo readiness | Fresh/reset data works, all P0 scenario checks pass twice, responsive UI is usable, no console errors in the main scenario, limitations stated accurately |

## Pass rule

Target 10/10 requires a checkable evidence item for every row. If a criterion is implemented only in documentation, marked future, or not tested, it does not earn a point. This prevents presentation polish from being mistaken for software completeness.

## Required evidence packet

- Commit SHA and test environment.
- P0 test checklist with pass/fail and reproducible notes.
- Screenshots or recording of route transition, deficiency return/resubmit, first and second automation cycle, EVC schedule/report, evidence verification, document renewal review and audit trace.
- Browser console output or automated test report.
- Limitations statement confirming local data, no production auth, no live AICTE integration and no external notification delivery unless those capabilities were separately built and verified.


## Full-stack extension gate

A high-scoring interactive simulation is not enough to claim a connected multi-user application. For the next implementation phase, follow `docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md` and verify real auth, server-side role/scope enforcement, shared PostgreSQL persistence, migration/seed setup, worker/idempotency, transactional audit/outbox, integration tests and an honest deployment status. Mark missing provider credentials as blocked.
