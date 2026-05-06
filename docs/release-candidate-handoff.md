# Travel Hunter MVP 릴리즈 후보 인수인계

## 1. 릴리즈 후보 기준

- 릴리즈 후보 기준 커밋: `0085235 test: pass docker release gate`
- 기준일: 2026-05-06
- 배포 방향: Docker Compose 기반 staging-ready 구성
- 인수인계 방식: 문서 중심
- 이번 인수인계는 실제 클라우드 배포가 아니라, 현재 MVP를 staging 배포 대상으로 넘길 수 있게 정리하는 단계다.

## 2. 포함된 MVP 기능

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`
- 프로필: 지역, 여행 스타일, 예산 저장
- 정책: 목록, 상세, 공식 안내 URL, 신청 URL fallback
- 정책 탐색: 검색어, 지역, 카테고리 client-side 필터
- 정책 저장: 사용자별 저장 정책 목록 조회와 저장 해제
- 일정: 목록, 생성, 상세, 정책 담기, 추천 결과
- 친구 초대: 초대 링크 생성, 초대 수락, 일정 참여자 추가
- 데이터 모드: mock mode와 PostgreSQL-backed DB mode

## 3. 실행 모드

### Local mock mode

프론트만 빠르게 확인할 때 사용한다.

```powershell
cd frontend
npm install
$env:VITE_DATA_SOURCE="mock"
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

확인 URL:

- `http://127.0.0.1:5173`

### Local backend mode

로컬 FastAPI와 compose PostgreSQL을 함께 확인할 때 사용한다.

```powershell
docker compose -f compose.yaml up -d db

cd backend
python -m pip install -r requirements.txt
$env:BACKEND_DATA_SOURCE="db"
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

다른 터미널에서:

```powershell
cd frontend
$env:VITE_DATA_SOURCE="backend"
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

확인 URL:

- frontend dev: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:8000`
- backend health: `http://127.0.0.1:8000/api/health`
- PostgreSQL host port: `127.0.0.1:55432`

### Docker Compose staging mode

릴리즈 후보 검증과 staging handoff 기준 모드다.

```powershell
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml up -d backend frontend
```

확인 URL:

- frontend preview: `http://127.0.0.1:4173`
- backend API: `http://127.0.0.1:8000`
- PostgreSQL host port: `127.0.0.1:55432`

## 4. 환경변수 기준

Frontend:

- `VITE_DATA_SOURCE=backend`
- `VITE_API_BASE_URL=http://127.0.0.1:8000` for local compose
- 실제 staging domain을 쓰면 `VITE_API_BASE_URL`은 staging backend origin으로 바꾼다.

Backend:

- `APP_ENV=staging`
- `BACKEND_DATA_SOURCE=db`
- `DATABASE_URL=postgresql+psycopg://...`
- `AUTH_SECRET_KEY`: 기본값 사용 금지, 긴 랜덤 값 사용
- `REFRESH_COOKIE_SECURE=false` for local compose
- `REFRESH_COOKIE_SECURE=true` for HTTPS staging
- `CORS_ORIGINS`: 배포된 frontend origin만 허용

## 5. Release Gate Evidence

2026-05-06 기준 통과 결과:

- `cd frontend && npm run typecheck`: passed
- `cd frontend && npm test`: 16 passed
- `cd frontend && npm run test:e2e`: 6 passed
- `cd frontend && npm run test:e2e:backend`: 5 passed
- `cd frontend && npm run build`: passed
- `cd backend && python -m pytest`: 68 passed
- `cd backend && alembic upgrade head --sql`: passed
- `docker compose -f compose.yaml config`: passed
- `docker compose -f compose.yaml build`: passed
- `docker compose -f compose.yaml run --rm backend alembic upgrade head`: passed
- `docker compose -f compose.yaml run --rm backend python -m app.db.seed`: passed twice
- `git diff --check`: passed

## 6. 미구현 범위

- 소셜 로그인 실제 연동
- 정책 실시간 수집 API
- 지도, 장소 검색, 이동 시간 계산
- 실제 AI 추천 엔진
- 친구 초대 이메일/SMS/카카오톡 실제 발송
- 운영 관리자 기능
- AWS/EKS/Argo CD 배포

## 7. 다음 담당자 체크리스트

1. `README.md`에서 문서 읽는 순서를 확인한다.
2. `docs/current-work-spec.md`로 현재 구현 범위를 확인한다.
3. `docs/mvp-api-contract.md`로 API shape를 확인한다.
4. Docker Desktop을 실행하고 compose staging mode를 확인한다.
5. 실제 staging target이 정해지면 domain, HTTPS, secret, DB 운영 값을 확정한다.
6. 배포 플랫폼이 정해진 뒤 platform-specific 문서와 설정을 별도 작업으로 추가한다.
