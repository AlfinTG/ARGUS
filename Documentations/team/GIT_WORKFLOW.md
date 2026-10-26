# Git and Pull Request Workflow

## Initial setup

1. Create or open the team's existing ARGUS repository.
2. Put the contents of this release ZIP at repository root; do not nest the whole folder under an extra `ARGUS_10x_Release/` directory.
3. Commit the baseline documentation and browser prototype before code changes.
4. Create issues from the P0 acceptance criteria and assign owners.

## Branch conventions

- `main`: always the best-known runnable/demoable state.
- `feat/workflow-routing`, `feat/automation-rules`, `feat/compliance-review`, `feat/evc-queue`, `feat/ui-applications`, `test/e2e-p0`.
- Use short-lived branches; avoid multiple people editing the same central file without coordination.

## PR checklist

- [ ] Linked issue and acceptance criteria
- [ ] Scope is small and clear
- [ ] Shared contract and docs updated when field/enum behavior changes
- [ ] Tests actually run and results provided
- [ ] P0 happy path and relevant negative path considered
- [ ] Audit/authorization/idempotency behavior reviewed where relevant
- [ ] No credentials, real institutional data or unverified claims
- [ ] UI clearly labels simulation when appropriate
- [ ] One reviewer approves before merge

## Avoid

- Do not commit `.env`, API keys, tokens, credentials or private source documents.
- Do not use `git push --force` on shared branches.
- Do not merge a branch that breaks the run instructions or changes shared enums without coordinating.
- Do not copy old legacy files with other names/branding into this clean repo.

## Merge rhythm

Integrate at least every 3–4 hours, not just at the end. After every merge, run the short smoke test. Keep a known-good tag/commit for the demo and create a backup copy before the final judging build.
