# Travel Hunter Docker VPS Staging 배포 계획

## Summary

- 목적은 MVP 릴리즈 후보를 내부 테스트용 외부 URL에서 검증하는 것이다.
- 배포 단위는 기존 Docker Compose 서비스 3개(`frontend`, `backend`, `db`)를 유지한다.
- reverse proxy와 HTTPS는 VPS에서 Caddy를 기본 추천으로 둔다.
- 이 문서는 배포 절차와 운영 환경값을 정리하며, 새 기능이나 API 변경을 포함하지 않는다.

## VPS 준비

필수 조건:

- Linux VPS 1대
- Docker Engine 설치
- Docker Compose plugin 설치
- Git 설치
- staging domain 또는 subdomain 1개
- domain A record가 VPS public IP를 가리킴

권장 최소 사양:

- 2 vCPU
- RAM 2GB 이상
- Disk 30GB 이상

## 환경 변수

VPS에서는 local compose 값을 그대로 쓰지 않는다. 다음 값을 staging 기준으로 고정한다.

Frontend build arg:

```env
VITE_API_BASE_URL=https://<staging-domain>
```

Backend environment:

```env
APP_ENV=staging
DATABASE_URL=postgresql+psycopg://travelhunter:<strong-db-password>@db:5432/travelhunter
AUTH_SECRET_KEY=<strong-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14
REFRESH_COOKIE_NAME=travel_hunter_refresh
REFRESH_COOKIE_SECURE=true
CORS_ORIGINS=https://<staging-domain>
```

PostgreSQL:

```env
POSTGRES_DB=travelhunter
POSTGRES_USER=travelhunter
POSTGRES_PASSWORD=<strong-db-password>
```

## 배포 순서

1. VPS에 repo를 clone한다.

```bash
git clone <repo-url> travel-hunter-app
cd travel-hunter-app
git checkout <release-candidate-commit-or-branch>
```

2. staging 환경값을 준비한다.

- 현재 `compose.yaml`은 local compose 기본값을 포함한다.
- 실제 VPS에서는 compose override 또는 서버 전용 env 파일로 secret/domain 값을 주입한다.
- `AUTH_SECRET_KEY`, DB password, domain 값은 repo에 커밋하지 않는다.

3. 이미지를 빌드한다.

```bash
docker compose -f compose.yaml build
```

4. DB를 먼저 시작한다.

```bash
docker compose -f compose.yaml up -d db
```

5. migration과 seed를 적용한다.

```bash
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

6. backend와 frontend를 시작한다.

```bash
docker compose -f compose.yaml up -d backend frontend
```

7. reverse proxy와 HTTPS를 연결한다.

Caddy 권장 방향:

```caddyfile
<staging-domain> {
  handle /api/* {
    reverse_proxy backend:8000
  }

  handle /docs* {
    reverse_proxy backend:8000
  }

  handle /openapi.json {
    reverse_proxy backend:8000
  }

  handle {
    reverse_proxy frontend:4173
  }
}
```

실제 Caddy 실행 방식은 VPS 운영 방식에 맞춰 별도 service 또는 compose service로 결정한다. Caddy를 Docker Compose 내부 service로 실행하면 `frontend:4173`, `backend:8000`을 사용하고, host에 직접 설치하면 `127.0.0.1:4173`, `127.0.0.1:8000`으로 바꾼다.

## Smoke Test

API 확인:

```bash
curl -fsS https://<staging-domain>/api/health
```

브라우저 확인:

- `https://<staging-domain>`
- `https://<staging-domain>/login`
- `https://<staging-domain>/docs`

테스트 계정:

- Email: `test.user@example.com`
- Password: `password123`

필수 수동 플로우:

- 로그인 성공/실패
- 정책 목록 검색/필터
- 정책 상세 진입
- 정책 저장/삭제
- 일정 생성
- 일정 삭제
- 정책을 일정에 담기
- 초대 수락 링크 진입
- 로그아웃

## Rollback

- 기능 코드는 release candidate commit 기준으로 배포한다.
- 문제가 생기면 이전 정상 commit으로 checkout 후 `docker compose build`와 `docker compose up -d backend frontend`를 다시 실행한다.
- DB migration이 변경된 release가 아니라면 DB rollback은 하지 않는다.
- DB snapshot/backup은 공개 테스트 전 별도 운영 기준에서 확정한다.

## Assumptions

- 이번 VPS 배포는 내부 테스트용 staging이다.
- public beta 전에는 개인정보/약관/로그/백업/모니터링 기준을 별도 확정한다.
- `REFRESH_COOKIE_SECURE=true`는 HTTPS가 준비된 staging에서만 사용한다.
- Caddy를 기본 추천하지만, 기존 운영 표준이 있으면 Nginx로 대체할 수 있다.
