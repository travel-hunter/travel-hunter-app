# Release Readiness Scorecard

Use this scorecard when applying `.agent/skills/qa-release-readiness/SKILL.md`.

## Scoring

| Dimension | Points | Evidence |
|---|---:|---|
| Feature completeness | 20 | Core auth, profile, policies, trips, recommendations, and invite flows work for the current MVP phase |
| API/data contract quality | 20 | `docs/mvp-api-contract.md`, frontend types, backend schemas, tests, and evals agree |
| UI/UX usability | 15 | Public/protected/authenticated routes render, responsive widths are stable, no prototype copy remains |
| Code structure and maintainability | 15 | Frontend uses API boundary; backend keeps route/schema/service/data separation |
| Validation system | 15 | Frontend typecheck/test/e2e/build, backend pytest, and compose config are available and pass or blockers are recorded |
| Documentation | 10 | README/env docs/current plan/checklist explain setup, behavior, and remaining scope |
| Release readiness | 5 | No known release blockers for the current MVP phase |

Total: 100

## Required Output Format

1. Total score.
2. Score by dimension with file or command evidence.
3. Release blockers.
4. Nice-to-have issues.
5. Ready or not-ready judgment.
6. Additional verification recommended.

## Minimum Bar

- 85 or higher: ready for the current MVP phase if no P0/P1 blocker remains.
- 70 to 84: close, but fix listed blockers before release.
- Below 70: not ready.
