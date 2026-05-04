# Travel Hunter 다음 작업 우선순위

## 1. 현재 기준점

- 기준 브랜치: `feat/prototype-to-react`
- 최근 기준 커밋:
  - `6f5027d chore: establish db-backed policy baseline`
  - `434b6b8 test: cover policy db error paths`
- 현재 앱 상태:
  - React/Vite 프론트는 mock/backend 데이터 소스를 `AppDataApi` 경계로 선택한다.
  - FastAPI 백엔드는 Mock API를 유지하면서 `BACKEND_DATA_SOURCE=db`에서 정책 목록/상세와 인증 foundation을 DB-backed로 처리한다.
  - PostgreSQL schema는 ERD v0.3 기반 SQLAlchemy/Alembic으로 고정되어 있다.

## 2. 다음 작업 우선순위

| 우선순위 | 작업 | 상태 | 성공 기준 |
|----------|------|------|-----------|
| 1 | 인증 DB-backed signup/login/me/refresh/logout 구현 | 완료 | JWT access token, HttpOnly refresh cookie, password hash, refresh token revoke가 동작함 |
| 2 | 일정/trip 계열 DB-backed 전환 계획 확정 | 다음 작업 | mock id `jeju-3-days` 호환 전략과 numeric DB id 전환 기준이 문서화됨 |
| 3 | 일정 목록/상세 DB-backed 1차 구현 | 대기 | seeded DB에서 trips, trip_days, trip_places, trip_members가 기존 Trip DTO shape로 반환됨 |
| 4 | 일정-정책 연결 DB-backed 구현 | 대기 | `POST /api/trips/{tripId}/policies/{policySlug}`가 `trip_policies`를 사용함 |
| 5 | frontend backend mode CI smoke 강화 | 대기 | backend server + frontend e2e가 `VITE_DATA_SOURCE=backend` 기준으로 실행 가능함 |

## 3. 인증 구현 결과

- `POST /api/auth/signup`
  - email lowercase 정규화
  - Argon2 password hash 저장
  - duplicate email은 409
- `POST /api/auth/login`
  - email/password 검증
  - JWT access token 반환
  - refresh token은 HttpOnly cookie로 전달하고 DB에는 SHA-256 hash 저장
- `POST /api/auth/refresh`
  - refresh cookie 검증
  - 기존 refresh token revoke
  - 새 access token과 refresh cookie 발급
- `POST /api/auth/logout`
  - refresh token revoke
  - refresh cookie clear
- `GET /api/me`
  - Mock mode에서는 기존 mock user 유지
  - DB mode에서는 Bearer access token 필요

## 4. 다음 구현 방향

다음 실제 구현은 일정/trip DB-backed 계획 확정부터 진행한다.

- 현재 프론트 route와 mock data는 `jeju-3-days` 문자열 id를 사용한다.
- DB의 `trips.id`는 numeric id이므로, 다음 계획에서 다음 중 하나를 확정한다.
  - 프론트 route를 numeric id로 전환
  - backend에서 임시 compatibility mapping 제공
  - client API layer에서 mock id와 numeric id를 매핑
- 전환 순서는 `trips` → `trip_days` → `trip_places` → `trip_members` → `trip_policies` → `trip_invites` → `recommendations`로 둔다.

## 5. 검증 명령

기본 검증:

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config

cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build
```

DB smoke:

```bash
docker compose -f compose.yaml up -d db
cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
python -m app.db.seed
$env:BACKEND_DATA_SOURCE="db"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
python -m pytest
```

## 6. 주의사항

- host `127.0.0.1:5432`는 기존 로컬 PostgreSQL과 충돌할 수 있으므로 compose DB는 host `127.0.0.1:55432`를 사용한다.
- API DTO는 `camelCase`, DB 필드는 `snake_case`를 유지한다.
- 응답에 `password_hash`, `refresh_token_hash`, `provider_id`를 포함하지 않는다.
- Alembic만 schema 생성을 사용하고 SQLAlchemy `create_all()`은 사용하지 않는다.
- `Profile.style`, `Profile.budget`, `Policy.match`, `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 아직 DB 원본 필드가 아니다.
