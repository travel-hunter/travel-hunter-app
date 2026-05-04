# Travel Hunter 현재 작업 명세

## 1. 프로젝트 현재 상태

Travel Hunter production 앱은 React/Vite 프론트엔드와 FastAPI 백엔드로 구성되어 있다. 프론트는 실제 서비스형 반응형 웹 UI와 `AppDataApi` 데이터 경계를 사용하고, 백엔드는 Mock API를 기본값으로 유지하면서 `BACKEND_DATA_SOURCE=db`에서 일부 endpoint를 PostgreSQL-backed로 전환했다.

현재 완료된 DB-backed 범위:

- ERD v0.3 SQLAlchemy model
- Alembic `0001_create_v0_3_schema` migration
- idempotent development seed script
- 정책 목록/상세 repository/service boundary
- 정책 not-found/error path 테스트
- 인증 signup/login/me/refresh/logout foundation

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

인증 구현 기준:

- access token: JWT, JSON `accessToken`
- refresh token: opaque random token, HttpOnly cookie
- refresh token DB 저장: SHA-256 hash
- password hash: Argon2 via `pwdlib`
- JWT library: `PyJWT`
- DB mode `/api/me`: Bearer access token 필요
- Mock mode `/api/me`: 기존 unauthenticated smoke behavior 유지

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

## 6. 실행 및 검증

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm test
npm run test:e2e
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

Compose:

```bash
docker compose -f compose.yaml config
```

최근 통과 검증:

- `python -m pytest`: 26 passed
- `BACKEND_DATA_SOURCE=db python -m pytest`: 26 passed
- `alembic upgrade head --sql`: passed
- `docker compose -f compose.yaml config`: passed
- DB mode auth smoke: login/me/refresh/logout passed
- DB mode policy smoke: list/detail/missing slug passed
- `npm run typecheck`: passed
- `npm test`: 5 passed
- `npm run test:e2e`: 6 passed
- `npm run build`: passed

## 7. 미구현 범위

- 소셜 로그인 실제 연동
- profile style/budget DB persistence
- 정책 실시간 수집 API
- 정책 저장 DB persistence
- 일정/trip 계열 DB-backed 전환
- 지도/장소 검색/이동 시간 계산
- 실제 AI 추천 엔진
- 친구 초대 실제 발송
- backend+frontend 통합 CI smoke
- AWS/EKS/Argo CD 배포

## 8. 다음 작업

다음 작업은 `docs/next-work-plan.md` 기준이다. 현재 추천 1순위는 일정/trip 계열 DB-backed 전환 계획 확정이다.
