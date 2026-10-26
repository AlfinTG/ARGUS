# Requirements Traceability Matrix

Status meanings: **Prototype** = locally demonstrated behavior; **Planned** = specified but not yet implemented in production code; **Out of scope** = explicitly not claimed.

| SIH26262 need | ARGUS requirement | Primary implementation area | Evidence to show | Boundary |
|---|---|---|---|---|
| End-to-end application routing | Route-specific state machine and guarded completion | `prototype/`; `technical/WORKFLOW_AND_RULES.md` | Complete stage, see next route-specific stage and audit record | Route examples need official validation |
| Deficiency return/revert | Reason required; retain resume stage; resubmit to review | Case detail and workflow commands | Blank reason blocked; full round-trip trail | No legal conclusion generated |
| Stage-wise pendency | Due-date status, owner, stage and aging overview | Overview, applications | Filter and sorted due/overdue cases | Demo metrics use synthetic records |
| EVC queue and reminders | Eligibility gate, schedule fields, report status | EVC desk, `EVC-01/02` | Eligible case queued, scheduled, report recorded | External calendar/notification not connected |
| Time-bound undertakings | Obligation, due date, evidence submit/verify states | Compliance module, `CMP-01/02` | Submit leaves Pending Verification; reviewer closes | Evidence authenticity not determined |
| Lease/document expiry | Expiry warning, renewal submit/verify, overdue escalation | Documents, `DOC-01/02` | Expired/upcoming warning and review trail | Recorded dates only; no external validation |
| Notifications and escalations | Configurable demo thresholds, generated in-app queue | Rules, alerts, rule cycle | Run cycle twice; actions and duplicates suppressed | No real email/SMS sent |
| Role-based dashboards/actions | UI role simulation and action gating | Role selector and action controls | Show allowed/blocked controls per role | Production authorization must be server-side |
| Audit trail | Actor, timestamp, target, rule, outcome, correlation | Audit panel and generated events | Trace same ID from event/alert to audit | Production append-only DB not yet present |
| Integration with existing authorized systems | Documented production adapter boundary | `technical/ARCHITECTURE.md`, `API_CONTRACT.md` | Show future integration plan, not a false claim | Out of scope for browser prototype |
| Secure storage and confidentiality | Synthetic data; production security spec | `technical/SECURITY_PRIVACY.md` | Point out trust boundaries | Prototype is not safe for live data |
| Human regulatory oversight | Decision Pending stage; decision action reserved to competent role | Case detail | Show no automatic final decision | Final statutory decision remains human |

## Release evidence checklist

- [ ] Run each P0 scenario in `technical/DEMO_TEST_SCENARIOS.md`.
- [ ] Record browser/version, date and commit SHA.
- [ ] Capture screenshot/video of route transition, deficiency round trip, repeated automation cycle, EVC, evidence verification, expiry and audit.
- [ ] Note every unimplemented feature as planned, not completed.
- [ ] Confirm every rule threshold displayed in the UI is labelled demo-only.
