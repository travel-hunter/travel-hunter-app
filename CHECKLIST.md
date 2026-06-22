# CHECKLIST

## Current Status

- Latest implemented scope: C안(요약 프리뷰 포함형) 와이어프레임을 기준으로 온보딩 3단계와 마이페이지 프로필 편집 UI를 다시 폴리시했다. 관심 지역은 17개 광역시도 4열 아이콘 카드(최대 3개), 선택 체크 오버레이, 선택 지역 요약을 제공하고, 여행 스타일/예산은 카드형 선택지로 통일했다. 양쪽 모두 어두운 현재 추천 기준 프리뷰를 표시한다.
- Recommendation behavior: `preferredRegions`가 있으면 legacy `region`보다 우선하며, 2~3개 선택 시 선택 지역별 후보를 먼저 확보한 뒤 점수순으로 채운다. 기존 `region`은 첫 번째 관심 지역으로 자동 파생하지 않는다.
- Profile completion: 관심 지역, 여행 스타일, 예산 중 하나라도 미설정이면 홈 로그인 진입 시 세션당 1회 프로필 완료 안내를 표시한다.
- Home AI itinerary CTA: 관심 지역 1개는 중앙 단일 CTA 카드, 2개 이상은 중앙 스냅/이전·다음 순환을 지원하는 관심지역 전용 카드 캐러셀이다. `인기 국내 여행지` 영역은 기존 인기/혜택 기반 동작을 유지한다.
- Profile preference UX: 온보딩과 프로필 편집 모두 `AppDataApi.getProfileOptions()`로 받은 지역/스타일/예산 옵션만 사용하며, 저장/건너뛰기/API DTO 계약은 변경하지 않았다. 요약/프리뷰는 `preferredRegions`를 우선 표시하고 기존 `region`만 있는 프로필은 임시 표시값으로 일관되게 이어준다.
- Nickname validation remains active: 닉네임은 2~20자이며 한글/영문/숫자/언더스코어/일반 공백을 허용하고 내부 공백을 보존한다.
- API contract/eval sync: `docs/mvp-api-contract.md`와 `.agent/evals/api-contract-golden.json`을 `preferredRegions: string[] | null`, 17개 지역 옵션, 반복 query param 계약, 관리자 CSV 검증 계약에 맞췄다.
- Local-only constraint: 개발서버 배포/원격 빌드 없이 로컬 테스트와 로컬 Vite 빌드만 수행했다.
- Validation date: 2026-06-22.

## Current Source Documents

- Product/status/plan/API: `docs/requirements.md`, `docs/implemented-feature-spec.md`, `docs/next-work-plan.md`, `docs/mvp-api-contract.md`.
- Current task specs: `.omx/specs/deep-interview-onboarding-profile-region-grid-wireframe.md`, `.omx/specs/deep-interview-onboarding-profile-preferences.md`, `.omx/specs/deep-interview-home-recommendation-regions-scroll-cards.md`.
- Current implementation/test plan: `.omx/plans/prd-onboarding-profile-preferences.md`, `.omx/plans/test-spec-onboarding-profile-preferences.md`.
- Deployment/CICD: `docs/deployment-cicd/README.md` and release checklist docs under `docs/deployment-cicd/`.

## Latest Validations

- Backend full suite: `cd backend && .venv/bin/python -m pytest` passed (`511` tests, `1` existing Starlette/httpx deprecation warning).
- Alembic SQL gate: `cd backend && .venv/bin/alembic upgrade head --sql` passed.
- Frontend full suite: `cd frontend && npm test` passed (`191` tests).
- Frontend local build: `cd frontend && npm run build` passed.
- Frontend backend-mode E2E: `cd frontend && npm run test:e2e` passed (`11` tests).
- Compose config: `docker compose -f compose.yaml config` passed.
- 2026-06-19 local max-clean targeted gate: `cd backend && .venv/bin/python -m pytest tests/test_admin_service.py tests/test_profile_db_service.py tests/test_profile_db_routes.py tests/test_region_recommendations.py tests/test_region_recommendation_routes.py` passed (`47` tests, `1` existing Starlette/httpx deprecation warning); `cd backend && .venv/bin/alembic upgrade head --sql` passed; `cd frontend && npm run typecheck` passed; `cd frontend && npm test -- --run src/app/__tests__/home.test.tsx src/app/__tests__/mypage.test.tsx src/components/PreferredRegionSelector.test.tsx src/components/ProfilePreferencePreview.test.tsx src/app/__tests__/invite-oauth.test.tsx` passed (`57` tests); `cd frontend && npm run build` passed; `docker compose -f compose.yaml config` passed; `git diff --check` and `git diff --check -- CHECKLIST.md` passed.
- 2026-06-22 C안 UI polish gate: `cd frontend && npm run typecheck` passed; `cd frontend && npm test -- --run src/components/PreferredRegionSelector.test.tsx src/components/ProfilePreferencePreview.test.tsx src/app/__tests__/onboarding.test.ts src/app/__tests__/mypage.test.tsx` passed (`32` tests); `cd frontend && npm run build` passed. Playwright smoke against local Vite `http://127.0.0.1:5173/profile-setup` confirmed 390px/360px onboarding C안 rendering, 4-column region grid, persisted dark recommendation preview, and no horizontal overflow (`390 rootWidth 375`, `360 rootWidth 345`). Playwright smoke against `/mypage` profile edit confirmed 390px sheet rendering, dark preview, compact 4-column region grid, and no horizontal overflow (`rootWidth 390`).
- Docker preview refresh: `docker compose -f compose.yaml up -d --build frontend` rebuilt/restarted the local frontend container after the running `127.0.0.1:4173` preview was found serving an older bundle. Playwright smoke on `http://127.0.0.1:4173/home` with `test.user@example.com / password123` confirmed the AI area renders the preferred-region carousel only (`제주 → 부산 → 강원 → 제주 → 부산` via next/loop/swipe), with 5 slides including edge clones and no console errors. Follow-up center-alignment smoke confirmed the 390px viewport center is 195px and the active card center is 194.98px after correcting carousel transform math.
- UTF-8/diff hygiene: changed-file UTF-8 scan, `git diff --check`, and `git diff --check -- CHECKLIST.md` passed.

## Remaining Risks

- Admin user management keeps the legacy comma-separated `preferredRegions` UI/API shape, but backend normalization now enforces the same 17-region max-3 rule before public profile parsing.

## Cleanup Policy

- Replace stale validation detail instead of appending chronology.
- Record document removals/replacements in `docs/specs/spec-index.md` when workflow specs are retired.
- Before claiming completion, run `git diff --check`; for Korean-bearing changes, also verify UTF-8 has no `U+FFFD` replacement characters.
