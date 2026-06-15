# CHECKLIST

## Current Status

- Latest validated scope: policy source expansion for the development-server release candidate.
- Approved source: `2026 섬 방문의 해 — 섬 여행비 지원`, implemented as existing `regional_benefit` source category after user approval `A 승인` on 2026-06-15.
- Current implementation status: parser, collection registry, promotion, classifier, trip recommendation changes, development-server deploy/smoke, and final independent review gate all passed for the current release candidate.
- Keep this file slim: current status, recent validation evidence, and active risks only. Historical release/deployment detail belongs in git history, source-specific docs, or `.omx/evidence/*`.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Policy source expansion plan/evidence: `.omx/plans/prd-policy-source-expansion-20260612.md`, `.omx/plans/test-spec-policy-source-expansion-20260612.md`, `.omx/plans/policy-source-candidate-approval-20260612.md`.
- DB schema: `docs/db-schema-current.md`, `docs/db-schema-current.sql`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and linked deployment guides.

## Latest Validations

- 2026-06-15 source approval recorded: `.omx/plans/policy-source-candidate-approval-20260612.md` now records `A 승인`, approved source `2026 섬 방문의 해`, and `regional_benefit` category reuse with no new DB schema or public DTO field.
- 2026-06-15 latest official-source live fetch passed locally: `https://www.visitisland.kr/brd/notice` returned 9 parsed `2026 섬 방문의 해` active `regional_benefit` records for 경기, 인천, 충남, 전북, 전남, 광주, 경북, 경남, 제주; existing TravelMonth regional source returned 16 active records; traffic source remained optional 404.
- 2026-06-15 targeted backend validation passed: `cd backend && .venv/bin/python -m pytest tests/test_visitisland_parser.py tests/test_external_benefit_collection.py tests/test_external_source_repository.py tests/test_policy_normalization.py tests/test_policy_category_classifier.py tests/test_ops_routes.py tests/test_trip_db_service.py -q` → `115 passed, 1 warning`.
- 2026-06-15 full backend verification passed: `cd backend && .venv/bin/python -m pytest` → `464 passed, 1 warning`; `cd backend && .venv/bin/alembic upgrade head --sql` passed; `git diff --check` passed locally.
- 2026-06-15 development deploy/smoke passed on `https://dev.travel-hunter.co.kr`: remote compose build/up, Alembic migration, public `/api/health`, admin `/api/ops/external-collection`, `/quality`, `/run`, and public `/api/policies` + `/api/policies/{policySlug}` smoke all passed; the run returned 9 public island policies and temp admin cleanup reverted successfully.
- 2026-06-15 final review follow-up and cleanup validation passed locally: VisitIsland parser literal typing and source URL normalization satisfy scoped `pyright` checks, `/api/ops/external-collection/run` per-source results include `sourceName`/`sourceUrl`, admin UI renders per-source run results, source identity metadata is centralized behind stable `sourceKey` resolution, admin summary grouping uses concrete source identity types, targeted backend suite passed (`128 passed, 1 warning`), frontend `npm run typecheck` passed, `vitest src/pages/admin/AdminPages.test.tsx` passed (`9 passed`), `git diff --check` passed, UTF-8 replacement-character scan passed, and independent subagent review closed with `code-reviewer=APPROVE` plus `architect=CLEAR`.
- 2026-06-15 local WSL Docker verification passed: Docker CLI/Compose are available (`Docker version 29.2.1`, `Docker Compose version v5.1.0`), Docker Desktop-backed daemon responds to `docker info`, and `docker compose -f compose.yaml config` passed.
- 2026-06-15 commit-prep release verification passed locally: `cd backend && .venv/bin/python -m pytest` → `466 passed, 1 warning`; `cd backend && .venv/bin/alembic upgrade head --sql` passed; `cd frontend && npm run typecheck && npm test && npm run build` passed (`19` frontend test files, `165` tests, production build passed); `cd frontend && npm run test:e2e` passed (`10` Playwright backend-mode tests); `docker compose -f compose.yaml config` passed; `git diff --check` and UTF-8 replacement-character scan passed.

## Remaining Risks

- The new source uses the public category `regional_benefit`; ops run `sources[]` can contain more than one `regional_benefit` entry because TravelMonth regional benefits and 2026 섬 방문의 해 are distinct official pages under the same public source category.
- `2026 섬 방문의 해` notice pages publish eligible island lists as images/downloads; the first implementation intentionally parses the stable notice list/region counts rather than OCRing individual island names.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md`.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
