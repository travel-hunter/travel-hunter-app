# Travel Hunter 프로젝트 구조 점검

## 기준

- 점검일: 2026-05-11
- 기준 브랜치: `feat/prototype-to-react`
- 현재 route/page 구조는 유지한다.
- 이번 문서는 분석 결과이며, 파일 이동/삭제/리팩터링 실행 계획이 아니다.

현재 미커밋 변경분은 문서/스크립트 정리다.
- `docs/codex-model-workflow.md`
- `docs/current-work-spec.md`
- `docs/next-work-plan.md`
- `scripts/codex-plan.ps1`
- `scripts/codex-implement.ps1`
구조 점검은 위 변경분을 되돌리지 않고 분리해서 판단한다.

## 전체 구조 판단

현재 repo는 큰 범위에서 합리적으로 나뉘어 있다.

```text
backend/   FastAPI, SQLAlchemy, Alembic, backend tests
frontend/  Vite React app, frontend tests, e2e harness
docs/      requirements, implementation status, API contract, deployment/design docs
deploy/    Caddy and environment examples
scripts/   Codex CLI plan/implement/workflow wrappers
.agent/    eval and acceptance references
.github/   issue/PR/workflow collaboration assets
```

`compose.yaml`, `compose.vps.yaml`, `compose.tunnel.yaml`은 local, public VPS, Cloudflare Tunnel 목적이 분리되어 있어 유지한다.

## Frontend

현재 구조:

```text
frontend/src/api         backend API boundary and frontend data types
frontend/src/app         app root, router, session provider
frontend/src/components  reusable UI, layout, cards
frontend/src/data        static display/seed constants
frontend/src/pages       route-level screen components
frontend/src/styles      global CSS, tokens, app styles
frontend/src/test        test helpers
```

이 구조는 현재 규모에서 유지 가능하다. `pages` 파일을 route와 1:1로 나누지 않는 현재 방식도 의도적으로 유지한다.

### 유지할 부분

- `app/App.tsx`가 route 정의를 단일 위치에서 관리한다.
- `api`가 backend 호출 경계를 맡고 있어 runtime mock mode 제거 방향과 맞다.
- `components`와 `styles`가 공통 UI와 시각 토큰을 분리한다.
- `public/manifest.webmanifest`와 `public/icons`는 PWA 정적 산출물 위치로 적절하다.

### 정리 후보

| 우선순위 | 항목 | 이유 | 권장 조치 |
|---:|---|---|---|
| P1 | `frontend/src/pages/ItineraryPages.tsx` 약 706 lines | 일정 생성, 상세, 장소 CRUD, AI 결과, 초대 화면이 한 파일에 모여 있다. | route 구조는 유지하되, sheet/form/helper component를 같은 feature 내부 파일로 분리 검토 |
| P1 | `frontend/src/pages/MyPage.tsx` 약 416 lines | 프로필 편집, 연락처, 알림, 저장 정책이 한 파일에 있다. | mypage 전용 local components를 분리 검토 |
| P2 | `frontend/src/pages/PolicyPages.tsx` 약 404 lines | 목록, 상세, 공유, 일정 담기 sheet가 함께 있다. | policy picker sheet와 detail actions 분리 검토 |
| P2 | `frontend/src/App.test.tsx` 약 749 lines | 모든 frontend smoke가 단일 테스트 파일에 누적되어 있다. | auth/policy/trip/mypage/invite 단위 테스트 파일 분리 검토 |
| P2 | `frontend/src/data/seedData.ts` | mock mode 제거 후에도 static 표시 데이터와 seed성 이름이 섞여 보일 수 있다. | `displayData.ts` 같은 명칭으로 역할 정리 검토 |

## Backend

현재 구조:

```text
backend/app/api           route registration and dependencies
backend/app/core          config and security primitives
backend/app/db            session and seed entrypoints
backend/app/models        SQLAlchemy tables
backend/app/repositories  DB query/update boundary
backend/app/schemas       Pydantic request/response schemas
backend/app/services      business logic and provider adapters
```

FastAPI route, schema, service, repository, model이 분리되어 있어 기본 layered 구조는 합리적이다.

### 유지할 부분

- Alembic migration이 schema source of truth 역할을 한다.
- service와 repository 분리가 trip, auth, notification처럼 복잡한 기능에 맞다.
- notification은 target calculation, scheduler, dispatch, provider, webhook이 파일 단위로 이미 분리되어 있다.
- public API DTO와 DB model이 직접 섞이지 않는 방향을 유지하고 있다.

### 정리 후보

| 우선순위 | 항목 | 이유 | 권장 조치 |
|---:|---|---|---|
| P1 | `backend/app/services/trips.py` 약 403 lines | trip resolver, DTO mapping, place CRUD, invite/policy logic이 밀집되어 있다. | resolver/mapper/place edit helper 분리 검토 |
| P1 | `backend/app/models/tables.py` 약 334 lines | 모든 table이 한 파일에 있어 테이블 증가 시 탐색 비용이 커진다. | 당장은 유지, 15개 이상 테이블이 더 늘면 domain별 model 파일 분리 |
| P2 | `backend/app/db/seed.py` 약 217 lines | seed 데이터와 upsert 절차가 커지고 있다. | policy/trip/user seed block 분리 검토 |
| P2 | `backend/app/api/routes/trips.py` 약 204 lines | trip 하위 endpoint가 많다. | place/invite/policy 하위 route 파일 분리 검토 |
| P2 | notification repository/service | 기능은 잘 분리됐지만 파일 수가 늘었다. | `services/notifications/` package 전환은 후속으로만 검토 |

## Docs and Deploy

현재 docs는 요구사항, 구현 상태, API 계약, 배포, 디자인, 벤치마크로 나뉘어 있다. 삭제보다는 `docs/README.md`의 읽는 순서를 source of truth로 유지하는 방식이 적절하다.

### 유지할 문서 역할

- `docs/requirements.md`: 제품 요구사항.
- `docs/current-work-spec.md`: 현재 구현 명세 요약.
- `docs/feature-implementation-status.md`: 기능별 완료/조건부/미구현 상태.
- `docs/mvp-api-contract.md`: API 계약.
- `docs/deployment-vps.md`, `docs/deployment-tunnel.md`: 배포 runbook.
- `docs/design-system-map.md`, `docs/figma-component-values.md`, `docs/figma-import-checklist.md`: 디자인/Figma reference.
- `docs/benchmark-ildan-checkin.md`: 외부 서비스 벤치마크 참고.

### 정리 후보

| 우선순위 | 항목 | 이유 | 권장 조치 |
|---:|---|---|---|
| P1 | `docs/mvp-api-contract.md` 약 495 lines | API가 커져 문서 탐색 비용이 커졌다. | auth/policies/trips/notifications section anchor를 강화하거나 OpenAPI 기준 보조 문서 검토 |
| P2 | 배포 문서 3종 | VPS, tunnel, inputs가 나뉘어 있어 신규 참여자에게 길 수 있다. | `docs/README.md`에서 목적별 읽기 순서를 계속 명확히 유지 |
| P2 | Figma 문서 3종 | 역할은 분명하지만 장기적으로 중복 가능성이 있다. | Figma 작업 종료 후 최종 handoff 요약본만 남길지 검토 |
| P3 | `benchmark-ildan-checkin.md` | 벤치마크 문서는 시간이 지나면 stale해질 수 있다. | 적용 완료 항목과 후속 후보만 남기고 archive 여부 검토 |

## Safe Local Cleanup

다음 항목은 tracked source가 아니라 로컬 산출물/캐시이므로 별도 승인 후 삭제 가능하다.

```text
frontend/dist
.pytest_cache
backend/.pytest_cache
backend/**/__pycache__
.codex-runs
```

`frontend/node_modules`는 유지한다. 삭제하면 재설치 비용이 크고 구조 정리 목적과 직접 관련이 없다.
`.codex-runs`는 로컬 실행 로그/산출물 보관 목적이면 유지하고, 공간 정리 목적이면 삭제 가능하다.

## Do Not Change Now

- `frontend/src/pages`를 route별 파일로 쪼개지 않는다.
- API endpoint, DB schema, Alembic migration은 변경하지 않는다.
- Docker compose service 구조는 변경하지 않는다.
- `models/tables.py`를 즉시 분리하지 않는다.
- 테스트 파일 분리는 다음 기능 변경과 섞지 않는다.

## 추천 다음 순서

1. 현재 PWA 변경분을 별도 커밋으로 고정한다.
2. 이 audit 문서를 별도 커밋으로 고정한다.
3. 로컬 산출물만 삭제한다.
4. 문서 중복 축소가 필요하면 `docs/README.md` 기준으로 읽는 순서와 역할만 보강한다.
5. 코드 리팩터링은 기능 작업과 분리해서 `ItineraryPages.tsx`, `MyPage.tsx`, `trips.py` 순서로 작게 진행한다.
