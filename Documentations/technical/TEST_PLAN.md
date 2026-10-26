# Test Plan

## Test levels

- Unit: transition guards, route selection, deadline threshold calculation, idempotency-key creation, permission checks and audit mapping.
- Integration: commands update state and audit together; rule evaluation creates action/outbox entries; duplicate events are safe; evidence verification cannot bypass role checks.
- UI/component: field validation, empty/error/loading states, role-aware controls, filters and accessible labels.
- End-to-end: full representative application journey, compliance/document lifecycle, EVC scheduling and repeat automation cycle.
- Security: forbidden object access, unauthorized transitions, role privilege escalation, upload misuse and secret leakage.
- Regression: route profile changes, timezone/daylight boundary, due dates at 0/1 threshold days and escalation ladder windows.

## Required negative tests

1. Attempt stage completion when prerequisites are missing → blocked, state unchanged, explain reason.
2. Return for deficiency with blank reason → blocked.
3. Resubmit a case without an existing deficiency request → blocked.
4. Institution user attempts evidence verification → forbidden.
5. Case with route not requiring EVC attempts schedule → blocked.
6. Run the same automation event twice → one action per idempotency key.
7. Run the cycle at threshold boundary → correct inclusive/exclusive behavior specified by rule.
8. A notification provider failure → persisted action and failed/retry state remain visible.
9. Change a rule version mid-cycle → each action references the exact evaluated version.
10. Attempt final decision from a non-competent role → forbidden.

## Manual smoke checklist

- [ ] Fresh open shows demo disclaimer and seeded data.
- [ ] Search/filter applications works and case details match list state.
- [ ] Valid stage completion changes only the allowed stage and creates audit event.
- [ ] Deficiency reason validation, return, resubmission and resume are correct.
- [ ] EVC eligibility, scheduling and report status are distinct.
- [ ] Evidence submission is pending verification until an authorized review action.
- [ ] Renewal submission remains unverified until a reviewer action.
- [ ] First automation cycle generates seeded matches; second adds no duplicates.
- [ ] Every action has a visible source rule and audit reference.
- [ ] Reset restores a known demo state.
- [ ] Mobile width has usable navigation/tables/buttons.
- [ ] Demo labels avoid false claims of live integrations.

## Test evidence record

Record commit SHA, environment/browser, test date, commands, pass/fail count, known failures and screenshots/video. Don't claim a test passed without running it.
