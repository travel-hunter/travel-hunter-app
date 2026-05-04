# Travel Hunter 현재 작업 명세

## 1. 프로젝트 현재 상태

Travel Hunter production 앱은 React/Vite 프론트엔드와 FastAPI 백엔드로 구성되어 있다. 프론트엔드는 실제 서비스형 반응형 UI와 `AppDataApi` 데이터 경계를 사용하고, 백엔드는 Mock API를 기본값으로 유지하면서 `BACKEND_DATA_SOURCE=db`에서 PostgreSQL-backed service를 선택할 수 있다.

현재 DB-backed 완료 범위:

- ERD v0.3 SQLAlchemy model
- Alembic `0001_create_v0_3_schema` migration
- idempotent development seed script
- 정책 목록/상세 repository/service
- 정책 not-found/error path 테스트
- 인증 `signup/login/me/refresh/logout`
- 일정/trip 목록/상세/생성/정책 연결/추천/초대 repository/service
- trip numeric id와 legacy alias `jeju-3-days` 호환

## 2. 주요 위치

| 구분 | 위치 |
|------|------|
| Production app | `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app` |
| Frontend | `travel-hunter-app/frontend` |
| Backend | `travel-hunter-app/backend` |
| API contract | `travel-hunter-app/docs/mvp-api-contract.md` |
| Next work plan | `travel-hunter-app/docs/next-work-plan.md` |
| Repo DB SQL | `travel-hunter-app/docs/db-schema-v0.3.sql` |
| Prototype archive | `travel-hunter-prototype` |
| ERD source files | `files` |

## 3. Frontend 구현 범위

- Vite + React + TypeScript
- React Router route 구성
- `AppRoot`, `SessionProvider`, `ProtectedRoute`
- `VITE_DATA_SOURCE=mock|backend`
- `AppDataApi`, `mockApi`, `backendApi`
- access token localStorage 저장
- backend mode에서 `Authorization: Bearer <accessToken>` 전송
- refresh cookie 지원을 위한 `credentials: "include"`
- login/signup/logout form flow
- 일정 상세는 route의 `tripId`를 API에 전달
- AI 결과/친구 초대는 `?tripId=<id>` query를 우선 사용하고, 없으면 첫 번째 일정으로 fallback

주요 route:

- `/`, `/onboarding`
- `/login`, `/signup`
- `/profile-setup`
- `/home`
- `/policies`, `/policies/:policySlug`
- `/trips`, `/trips/new`, `/trips/:tripId`
- `/ai-results`
- `/friend-invite`
- `/mypage`

## 4. Backend 구현 범위

- FastAPI route/schema/service/repository/data 계층
- `/health`, `/api/health`
- Mock API endpoint 전체 유지
- SQLAlchemy 2.x sync ORM
- PostgreSQL `postgresql+psycopg://` 연결
- Alembic v0.3 migration
- `python -m app.db.seed` development seed
- `BACKEND_DATA_SOURCE=mock|db`

DB-backed 구현 완료:

- `GET /api/policies`
- `GET /api/policies/{policySlug}`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me` in DB mode with Bearer token
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/{tripId}`
- `POST /api/trips/{tripId}/policies/{policySlug}`
- `GET /api/trips/{tripId}/recommendations`
- `GET /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invites`

## 5. ERD/API v0.3 기준

- `policies.slug` 사용
- `trips.slug`는 만들지 않음
- `trip_invites` 사용
- `users` 통합 구조 유지
- `users.gender` 사용
- 관심 지역은 `users.preferred_regions`
- trip 하위 테이블은 `trip_*` 단수 prefix 사용
- DB schema 생성은 Alembic만 사용하고 `create_all()`은 사용하지 않음
- API DTO는 `camelCase`, DB 필드는 `snake_case`
- 응답에 `password_hash`, `refresh_token_hash`, `provider_id`를 포함하지 않음
- DB mode `Trip.id`는 numeric `trips.id`를 문자열로 반환
- `jeju-3-days`는 seed/prototype 호환용 legacy alias이며 DB 컬럼으로 저장하지 않음
- canonical numeric trip handle은 `^[1-9][0-9]*$`만 허용
- `jeju-3-days` alias는 seed owner email, seed title, date range가 정확히 한 건 매칭될 때만 해석
- alias 조회도 Bearer 인증과 owner/member 접근 권한 검사를 우회하지 않음
- alias 응답 후 프론트는 canonical numeric URL로 replace 정규화
- `people`은 owner 먼저, 그다음 member nickname을 중복 제거해 표시
- `expectedSaving`은 연결된 정책 `benefit_amount` 합계로 계산
- `InviteState.copied`는 서버에서 항상 `false`, 프론트 local state로 관리

## 6. 실행 및 검증

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build
```

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest
alembic upgrade head --sql
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

DB:

```bash
docker compose -f compose.yaml up -d db
cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
alembic upgrade head
python -m app.db.seed
```

최근 통과 검증:

- `python -m pytest`: 39 passed
- `BACKEND_DATA_SOURCE=db python -m pytest`: 39 passed
- `alembic upgrade head --sql`: passed
- `docker compose -f compose.yaml config`: passed
- DB mode auth smoke: login/me/refresh/logout passed
- DB mode policy smoke: list/detail/missing slug passed
- DB mode trip smoke: list/create/numeric detail/missing trip/policy link/recommendations/invite passed
- Legacy alias numeric response is covered by route/service tests
- DB mode strict resolver smoke: `0`, `001`, `1.0`, unknown handle, duplicate seed-like alias rows 404 passed
- `npm run typecheck`: passed
- `npm test`: 5 passed
- `npm run test:e2e`: 6 passed
- `npm run test:e2e:backend`: 3 passed
- `npm run build`: passed

## 7. 미구현 범위

- 소셜 로그인 실제 연동
- profile style/budget DB persistence
- 정책 실시간 수집 API
- 정책 저장 DB persistence
- 지도/장소 검색/이동 시간 계산
- 실제 AI 추천 엔진
- 친구 초대 실제 발송
- 초대 수락의 membership DB 처리
- backend-mode smoke CI 고정
- AWS/EKS/Argo CD 배포

## 8. 다음 작업

다음 작업은 `docs/next-work-plan.md` 기준이다.

## 9. 최신 변경

- frontend backend-mode 통합 smoke가 추가됐다.
- 새 명령은 `cd frontend && npm run test:e2e:backend`이다.
- 이 명령은 compose PostgreSQL `127.0.0.1:55432`, FastAPI `127.0.0.1:8001`, Vite backend-mode `127.0.0.1:5174`, Playwright smoke를 함께 실행한다.
- 현재 다음 1순위는 정책 담기와 일정 생성 UX를 DB 저장 기준으로 보강하는 작업이다.
