# Travel Hunter 다음 작업 계획

## 1. 현재 기준점

현재 production 앱은 React/Vite 프론트엔드와 FastAPI 백엔드로 구성되어 있다. 프론트는 production형 반응형 UI와 `AppDataApi` 경계를 갖추었고, 백엔드는 기본적으로 Mock API를 유지한다.

DB 기반은 다음 수준까지 준비됐다.

- SQLAlchemy 2.x sync ORM 도입
- Alembic v0.3 initial migration 추가
- PostgreSQL `postgresql+psycopg://` 연결 방식 정리
- Docker Compose PostgreSQL에서 migration 검증 완료
- host `127.0.0.1:55432` 기준 migration/seed 검증 완료
- 개발 seed script 2회 실행 idempotency 검증 완료
- 정책 목록/상세 API의 DB-backed repository/service 경계 추가

최근 검증 결과는 `CHECKLIST.md`와 `docs/current-work-spec.md`를 기준으로 한다.

## 2. 다음 작업 우선순위

| 우선순위 | 작업 | 성공 기준 |
|----------|------|-----------|
| 1 | 현재 변경분 최종 diff 검수 및 커밋 가능한 기준점 고정 | 변경 목적이 문서, DB foundation, policy DB boundary로 구분되고 검증 결과가 남아 있음 |
| 2 | 정책 DB-backed not-found/error path 테스트 보강 | mock mode와 db mode 모두 unknown policy slug가 404를 반환함 |
| 3 | 인증 DB-backed 구현 계획 확정 | password hashing, JWT access token, refresh token 저장/폐기 흐름이 API 계약과 ERD에 맞게 결정됨 |
| 4 | 일정/trip 계열 DB-backed 전환 계획 확정 | mock id `jeju-3-days` 호환 전략과 numeric DB id 전환 기준이 문서화됨 |
| 5 | 프론트 backend mode CI smoke 강화 | `VITE_DATA_SOURCE=backend` 기준 route smoke가 CI에서 실행 가능함 |

## 3. 1순위 작업 상세

현재 변경분을 하나의 안정 기준점으로 고정한다.

- `git diff`를 목적별로 검수한다: harness 문서, DB 설정, SQLAlchemy model, Alembic migration, seed script, policy DB service, tests.
- 기존 untracked harness 파일은 되돌리거나 삭제하지 않는다.
- `docs/current-work-spec.md`, `docs/mvp-api-contract.md`, `CHECKLIST.md`, `PLANS.md`가 서로 충돌하지 않는지 확인한다.
- 검증 명령과 결과를 `CHECKLIST.md`에 유지한다.

완료 기준:

- backend pytest 통과
- frontend typecheck/test/e2e/build 통과
- compose config 통과
- Alembic offline SQL 통과
- compose DB migration/seed 검증 결과가 문서화됨

## 4. 2순위 작업 상세

정책 API의 DB-backed error path를 보강한다.

- `GET /api/policies/{policySlug}`에서 없는 slug는 404를 반환한다.
- mock mode 기존 동작을 유지한다.
- db mode는 repository/service 경계를 통해 같은 API shape와 error behavior를 유지한다.
- API 응답 shape는 변경하지 않는다.

권장 테스트:

- Mock mode: `/api/policies/missing-policy` 404
- DB service unit: repository가 `None`을 반환할 때 service도 `None` 반환
- DB mode smoke: seeded DB에서 `local-vacation`은 200, 없는 slug는 404

## 5. 이후 작업 방향

인증 구현은 정책 error path 보강 이후 진행한다.

- `users.password_hash`를 실제 password hashing 기준으로 사용한다.
- `auth_refresh_tokens.refresh_token_hash`를 refresh token 저장소로 사용한다.
- 응답에는 `password_hash`, `refresh_token_hash`, `provider_id`를 절대 포함하지 않는다.
- `/api/auth/login`, `/api/auth/signup`, `/api/me`부터 실제 DB-backed로 전환한다.

일정 구현은 인증 기준이 고정된 뒤 진행한다.

- `trips.id`는 DB 내부 id 기준으로 사용한다.
- 현재 mock route의 `jeju-3-days`는 프론트 호환용 임시 id이므로 numeric id 전환 또는 client mapping 중 하나를 별도 계획에서 확정한다.
- `trip_days`, `trip_places`, `trip_members`, `trip_policies`, `trip_invites`, `recommendations` 순서로 전환한다.

## 6. 검증 명령

기준 검증:

```bash
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build

cd ../backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
```

DB 검증:

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

## 7. 리스크와 주의사항

- host `127.0.0.1:5432`는 기존 로컬 PostgreSQL 인증과 충돌할 수 있으므로 compose DB는 host `127.0.0.1:55432`로 사용한다.
- 검증된 DB 경로는 compose 네트워크 내부의 `backend -> db` 연결과 host `127.0.0.1:55432` 직접 연결이다.
- API DTO는 `camelCase`, DB 필드는 `snake_case`를 유지한다.
- 정책 상세는 `policies.slug` 기준을 유지한다.
- Alembic만 schema 생성에 사용하고 SQLAlchemy `create_all()`은 사용하지 않는다.
- `Policy.match`, `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 DB 컬럼이 아니라 계산값 또는 UI 상태로 유지한다.
