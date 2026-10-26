# Release Manifest — ARGUS Automation-First Starter

## This release includes

- Canonical product charter, solution specification and 24-hour MVP acceptance contract.
- Automation-first technical architecture, workflow/state-machine rules, data model, API contract outline, security/privacy requirements, test plan and deterministic demo scenarios.
- A new self-contained interactive prototype with route-aware actions, reason-required deficiency handling, EVC queue logic, separate compliance/document submission and verification states, configurable demo thresholds, idempotent rule cycle, alerts, audit and reset.
- Team responsibilities, sprint schedule, Git/PR workflow, demo script, presentation source brief and AI coding handoff prompts.
- ARGUS brand assets and a refreshed, correctly formatted 29-page solution dossier PDF with the full-stack implementation blueprint as an appendix.
- Validation record stating what was exercised and what is not production-ready.

## Canonical files to review first

1. `README.md`
2. `AGENTS.md`
3. `docs/PROJECT_CHARTER.md`
4. `docs/SOLUTION_SPECIFICATION.md`
5. `docs/24_HOUR_MVP.md`
6. `docs/PROTOTYPE_QUALITY_GATE.md`
7. `technical/WORKFLOW_AND_RULES.md`
8. `technical/ARCHITECTURE.md`

## Explicitly not included

No PowerPoint deck, no production backend, no credentials, no real institution data, no live AICTE integration and no external notification provider.


## Full-stack implementation update

- `docs/PRODUCTION_IMPLEMENTATION_BLUEPRINT.md` is the mandatory code-agent contract for backend/API, real auth, shared PostgreSQL, authorization, worker/outbox, security, tests and deployment.
- `docs/ARGUS_Full_Stack_Implementation_Blueprint.pdf` is the reading/hand-off PDF version.
- `docs/ARGUS_Project_Solution_Dossier.pdf` is the corrected, rendered 29-page combined dossier. Tables, headings and the appendix structure were checked in the final PDF render.
- `docs/ARGUS_SOLUTION_DOSSIER.md` is the normalized Markdown source used to regenerate the corrected dossier.
