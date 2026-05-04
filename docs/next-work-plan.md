# Travel Hunter 다음 작업 우선순위

## 1. 현재 기준점

- 기준 브랜치: `feat/prototype-to-react`
- 기준 커밋: `6f5027d chore: establish db-backed policy baseline`
- 현재 앱 상태: React/Vite 프론트, FastAPI 백엔드, SQLAlchemy/Alembic 기반 v0.3 DB schema, 정책 목록/상세 DB-backed 경계가 준비되어 있다.
- 현재 검증 기준: `CHECKLIST.md`와 `docs/current-work-spec.md`를 기준으로 한다.

## 2. 다음 작업 우선순위

| 우선순위 | 작업 | 상태 | 성공 기준 |
|----------|------|------|-----------|
| 1 | 정책 DB-backed not-found/error path 테스트 보강 | 완료 | mock mode와 db mode 모두 unknown policy slug가 404를 반환하고, 정상 상세 응답 계약이 유지됨 |
| 2 | 인증 DB-backed 구현 계획 확정 | 다음 작업 | password hashing, JWT access token, refresh token 저장/폐기 흐름이 API 계약과 ERD에 맞게 결정됨 |
| 3 | 인증 DB-backed 1차 구현 | 대기 | `/api/auth/signup`, `/api/auth/login`, `/api/me`가 실제 DB user 기준으로 동작함 |
| 4 | 일정/trip 계열 DB-backed 전환 계획 확정 | 대기 | mock id `jeju-3-days` 호환 전략과 numeric DB id 전환 기준이 문서화됨 |
| 5 | frontend backend mode CI smoke 강화 | 대기 | `VITE_DATA_SOURCE=backend` 기준 route smoke가 CI에서 실행 가능함 |

## 3. 1순위 작업 결과

정책 API 실패 경로를 DB 연결 없이도 반복 검증할 수 있게 테스트로 고정한다.

- `GET /api/policies/missing-policy`는 mock mode에서 404와 `{"detail": "Policy not found"}`를 반환한다.
- `GET /api/policies/missing-policy`는 db mode에서도 repository가 `None`을 반환하면 같은 404 응답을 반환한다.
- db mode 정상 상세 경로는 seed-like `PolicyModel` fixture로 `id`, `slug`, `amount`, `documents` 필드 계약을 유지한다.
- service 계층은 db mode에서 repository miss를 `None`으로 전달하고, DB session이 없으면 `RuntimeError`를 발생시킨다.
- 실제 PostgreSQL integration test는 기본 pytest에 넣지 않고, compose smoke 검증으로 분리한다.

상세 명세:

- `docs/policy-db-error-path-test-plan.md`

## 4. 다음 구현 방향

다음 실제 구현은 인증 DB-backed 계획 확정부터 진행한다.

- `users.password_hash`를 실제 password hashing 기준으로 사용한다.
- `auth_refresh_tokens.refresh_token_hash`를 refresh token 저장소로 사용한다.
- 응답에는 `password_hash`, `refresh_token_hash`, `provider_id`를 포함하지 않는다.
- `/api/auth/signup`, `/api/auth/login`, `/api/me`를 DB-backed로 전환하는 순서를 먼저 확정한다.

일정 구현은 인증 기준이 고정된 뒤 진행한다.

- `trips.id`는 DB 내부 numeric id 기준으로 사용한다.
- 현재 mock route `jeju-3-days`는 프론트 호환용 임시 id이므로 numeric id 전환 또는 client mapping 중 하나를 별도 계획에서 확정한다.
- `trip_days`, `trip_places`, `trip_members`, `trip_policies`, `trip_invites`, `recommendations` 순서로 전환한다.

## 5. 검증 명령

기본 검증:

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
```

프론트 변경이 포함될 때 추가 검증:

```bash
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build
```

DB smoke 검증:

```bash
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

## 6. 리스크와 주의사항

- host `127.0.0.1:5432`는 기존 로컬 PostgreSQL 인증과 충돌할 수 있으므로 compose DB는 host `127.0.0.1:55432`로 사용한다.
- 검증된 DB 경로는 compose 네트워크 내부의 `backend -> db` 연결과 host `127.0.0.1:55432` 직접 연결이다.
- API DTO는 `camelCase`, DB 필드는 `snake_case`를 유지한다.
- 정책 상세는 `policies.slug` 기준을 유지한다.
- Alembic만 schema 생성을 사용하고 SQLAlchemy `create_all()`은 사용하지 않는다.
- `Policy.match`, `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 DB 컬럼이 아니라 계산값 또는 UI 상태로 유지한다.
