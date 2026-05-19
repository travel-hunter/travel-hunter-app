# Travel Hunter App

Travel Hunter는 국내 여행 지원 정책을 찾고, 해당 혜택을 여행 계획과 연결하는 MVP 프로젝트입니다.

현재 구조는 React/Vite 프론트엔드, FastAPI 백엔드, PostgreSQL DB로 구성되어 있습니다. 프론트엔드는 `AppDataApi` 경계를 통해 백엔드 API를 호출하며, runtime mock mode는 제거된 상태입니다.

## 추천 읽는 순서

1. `docs/requirements.md`: 제품 요구사항, 사용자 역할, 기능/비기능 요구사항, 조건부/후속 범위.
2. `docs/current-work-spec.md`: 현재 구현 상태와 작업 기준.
3. `docs/implemented-feature-spec.md`: 실제 구현된 사용자 동작과 API/DB 연결.
4. `docs/mvp-api-contract.md`: API request/response/error 계약.
5. `docs/db-schema-current.md`: 현재 Alembic head 기준 DB schema 문서.
6. `docs/deployment-cicd/README.md`: 팀 배포/CICD 작업 흐름.
7. `docs/next-work-plan.md`: 다음 작업 우선순위.
8. `CONTRIBUTING.md`: 브랜치, PR, 검증, secret 관리 규칙.

## 로컬 개발 실행

자세한 실행 방식은 `docs/local-dev-runtime.md`를 기준으로 합니다. DB와 백엔드 최소 실행 흐름은 다음과 같습니다.

```powershell
docker compose -f compose.yaml up -d db
cd backend
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

다른 터미널에서 프론트엔드를 실행합니다.

```powershell
cd frontend
npm install
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

- 프론트엔드 개발 서버: `http://127.0.0.1:5173`
- 백엔드 API: `http://127.0.0.1:8000`
- 백엔드 API 문서: `http://127.0.0.1:8000/docs`
- PostgreSQL host port: `127.0.0.1:55432`
- seed 테스트 계정: `test.user@example.com` / `password123`

## 배포

- `compose.tunnel.yaml`
- `deploy/Caddyfile.tunnel`
- `deploy/.env.tunnel.example`
- 실행 문서: `docs/deployment-cicd/README.md`

실제 `.env` 파일, DB password, `AUTH_SECRET_KEY`, Cloudflare tunnel token은 repo에 커밋하지 않습니다.

## 검증

빠른 검증:

```powershell
cd frontend
npm run typecheck
npm test

cd ..\backend
python -m pytest
```

릴리스 전 검증:

```powershell
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```

`npm test`와 `npm run test:e2e`는 FastAPI와 PostgreSQL 기준으로 실행됩니다. Runtime mock mode는 제거되었습니다.

## AI/Codex 작업 방식

팀 AI/Codex 작업 규칙은 `docs/deployment-cicd/06-ai-workflow.md`를 기준으로 합니다. 로컬 보조 스크립트는 `scripts/codex-*.ps1`에 있습니다.
