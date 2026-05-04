# Backend

Travel Hunter FastAPI 백엔드입니다. 현재 단계는 ERD v0.3 계약 확정 단계이므로 실제 DB 연결 없이 프론트 연동용 Mock API를 제공합니다.

## 기술 스택

- Python 3.12
- FastAPI
- Pytest
- PostgreSQL 예정

## 구조

- `app/main.py`: FastAPI 앱 생성, CORS, router 등록
- `app/core/config.py`: 환경변수 설정
- `app/api/router.py`: `/api` router 조립
- `app/api/routes`: health, auth, profile, policies, trips endpoint
- `app/schemas`: 프론트 타입과 맞춘 Pydantic request/response schema
- `app/services`: Mock business logic
- `app/data/seed.py`: DB 없이 사용하는 seed data

## 로컬 실행

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

헬스체크:

```bash
curl http://127.0.0.1:8000/api/health
```

## 테스트

```bash
python -m pytest
```

## 현재 범위

- `/health`, `/api/health`
- `/api/auth/login`, `/api/auth/signup`
- `/api/me`, `/api/me/profile`, `/api/profile-options`
- `/api/policies`, `/api/policies/{policySlug}`
- `/api/me/saved-policies/{policySlug}`
- `/api/trips`, `/api/trips/{tripId}`
- `/api/trips/{tripId}/policies/{policySlug}`
- `/api/trips/{tripId}/recommendations`
- `/api/trips/{tripId}/invite`
- `/api/trips/{tripId}/invites`
- `/api/invites/{inviteToken}/accept`

DB schema, Alembic migration, 실제 인증, 정책 실시간 조회, 실제 AI 추천은 ERD/API 계약 확정 이후 단계에서 진행합니다.
