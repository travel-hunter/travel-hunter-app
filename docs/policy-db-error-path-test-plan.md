# 정책 DB-backed Error Path 테스트 보강 명세

## Summary

- 기준 커밋: `6f5027d chore: establish db-backed policy baseline`
- 목표: 정책 상세 API가 mock mode와 db mode 모두에서 없는 slug를 안정적으로 404 처리하도록 테스트로 고정한다.
- 범위: backend 테스트와 문서만 수정한다.
- 제외: API 응답 shape 변경, DB schema 변경, Alembic migration 변경, 프론트 UI 변경, 실제 PostgreSQL을 필수 pytest에 연결하는 작업.

## Key Changes

- `backend/tests/test_policy_error_paths.py`를 추가한다.
- Mock mode route 테스트를 추가한다.
  - `/api/policies/local-vacation`은 200을 유지한다.
  - `/api/policies/missing-policy`는 404를 반환한다.
  - 404 body는 `{"detail": "Policy not found"}`로 고정한다.
- DB mode route 테스트를 추가한다.
  - FastAPI dependency override로 fake db session을 주입한다.
  - `policy_service.settings.backend_data_source`를 `db`로 대체한다.
  - repository가 `None`을 반환하면 route는 404를 반환한다.
- DB mode 정상 경로 회귀 테스트를 추가한다.
  - seed-like `PolicyModel`을 repository 반환값으로 사용한다.
  - `/api/policies/local-vacation` 응답에서 `id`, `slug`, `amount`, `documents` 계약 필드를 확인한다.
- Service error path 테스트를 추가한다.
  - DB mode에서 repository miss는 `None`으로 전달된다.
  - DB mode에서 session이 없으면 `RuntimeError`가 발생한다.

## Implementation Notes

- `backend/app/api/routes/policies.py`의 404 문구 `Policy not found`를 테스트 계약으로 사용한다.
- `backend/app/services/policies.py`의 mock/db 분기 방식은 유지한다.
- `backend/app/repositories/policies.py`는 기능 추가가 필요 없으면 변경하지 않는다.
- 실제 PostgreSQL smoke는 선택 검증으로만 수행한다.

## Test Plan

기본 검증:

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config
```

선택 DB smoke:

```bash
docker compose -f compose.yaml up -d db
cd backend
$env:BACKEND_DATA_SOURCE="db"
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
python -m pytest
```

Acceptance:

- backend pytest가 통과한다.
- missing policy slug는 mock mode와 db mode 모두 404를 반환한다.
- known policy slug는 db mode fake repository 기준 200을 반환한다.
- API 응답 필드명은 기존 계약과 동일하다.

## Current Result

- `python -m pytest`: 14 passed
- 추가된 테스트: `backend/tests/test_policy_error_paths.py`
