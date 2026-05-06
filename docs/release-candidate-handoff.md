# Travel Hunter MVP 릴리즈 후보 인수인계

## 기준

- 기준일: 2026-05-06
- 배포 방향: Docker Compose 기반 staging-ready 구성
- 현재 상태: 런타임 mock mode 제거, DB-backed-only 앱
- 인수인계 방식: 문서 중심

## 포함 기능

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`
- 프로필: 지역/스타일/예산 저장
- 정책: 목록, 상세, 검색/필터, 저장 정책, 공식/신청 URL CTA
- 일정: 목록, 생성, 상세, 정책 담기, 추천 결과 조회
- 초대: 링크 생성, 초대 수락, 일정 참여자 추가

## 실행 모드

### Local backend mode

```powershell
docker compose -f compose.yaml up -d db

cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

다른 터미널:

```powershell
cd frontend
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

확인 URL:

- Frontend dev: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`
- PostgreSQL host port: `127.0.0.1:55432`

### Docker Compose staging mode

```powershell
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml up -d backend frontend
```

확인 URL:

- Frontend preview: `http://127.0.0.1:4173`
- Backend API: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`

## Seed Test Account

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## 환경 변수 기준

Frontend:

- `VITE_API_BASE_URL=http://127.0.0.1:8000`

Backend:

- `APP_ENV=local|staging`
- `DATABASE_URL=postgresql+psycopg://...`
- `AUTH_SECRET_KEY`: staging에서는 강한 랜덤 값 사용
- `REFRESH_COOKIE_SECURE=false` for local compose
- `REFRESH_COOKIE_SECURE=true` for HTTPS staging
- `CORS_ORIGINS`: 배포된 frontend origin

## 검증 결과

- `cd backend && python -m pytest`: 64 passed
- `cd backend && alembic upgrade head --sql`: passed
- `docker compose -f compose.yaml config`: passed
- `cd frontend && npm run typecheck`: passed
- `cd frontend && npm test`: DB-backed Vitest 16 passed
- `cd frontend && npm run test:e2e`: DB-backed Playwright 5 passed
- `cd frontend && npm run build`: passed
- `docker compose -f compose.yaml build`: passed

## 미구현 범위

- 소셜 로그인 실제 연동
- 정책 실시간 수집 API
- 지도/장소 검색/이동 시간 계산
- 실제 AI 추천 엔진
- 초대 이메일/SMS/카카오톡 실제 발송
- 운영 관리자 기능
- AWS/EKS/Argo CD 배포

## 다음 담당자 체크리스트

1. `README.md`에서 실행 순서를 확인한다.
2. `docs/current-work-spec.md`로 현재 구현 범위를 확인한다.
3. `docs/mvp-api-contract.md`로 API shape를 확인한다.
4. Docker Compose staging mode를 재현한다.
5. 실제 staging target이 정해지면 domain, HTTPS, secret, DB 운영 값을 확정한다.
