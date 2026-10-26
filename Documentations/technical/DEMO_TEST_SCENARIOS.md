# Deterministic Demo Test Scenarios

Use only the seeded fictional dataset. The browser prototype includes a reset action so the cases can be replayed consistently.

| Scenario | Actor | Action | Expected result |
|---|---|---|---|
| Happy-path route | Scrutiny Officer | Complete Initial Scrutiny for an eligible case | Moves to next route-specific stage; workflow rule/event and audit entry visible |
| Wrong actor | Institution User | Attempt officer-only stage completion | Denied in demo UI with clear explanation; no state change |
| Deficiency validation | Scrutiny Officer | Return a case without reason | Form blocks action |
| Deficiency round trip | Scrutiny Officer → Institution User → Scrutiny Officer | Return with reason, submit response, resume review | Reason and resume point preserved; each transition audited |
| EVC eligibility | Committee Coordinator | Open EVC desk | Only EVC-route cases in eligible stage are actionable |
| Schedule EVC | Committee Coordinator | Assign date and panel to an unscheduled case | Queue state updates; audit event appears |
| Evidence separation | Institution User → Regional Officer | Submit then verify evidence | Submission status becomes pending; only reviewer can verify; two events recorded |
| Renewal separation | Institution User → Regional Officer | Submit renewal | Expired/expiring document remains pending review until verified |
| Upcoming reminder | System/demo operator | Run cycle with due date inside threshold | Reminder action appears once with source rule and due-date reason |
| Overdue escalation | System/demo operator | Run cycle with unresolved past-due obligation | Escalation appears with recipient role and overdue amount |
| Idempotent repeat | System/demo operator | Run same cycle again without changing input | No duplicate action for same subject/rule/window; audit can show skipped duplicate if designed |
| Rule threshold | Admin/demo operator | Adjust threshold and rerun after reset | Result changes according to configuration; threshold remains labelled demo-only |
| Human decision boundary | Competent Authority / other role | Open Decision Pending case | Only competent-authority role gets decision controls; no automated decision |

For a production implementation, repeat the same scenarios against the real API and database, including concurrency/version conflicts and provider failures.
