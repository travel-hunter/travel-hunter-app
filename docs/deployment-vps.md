# Travel Hunter Docker VPS Staging 배포 계획

## Summary

- 목적은 MVP 릴리즈 후보를 내부 테스트용 외부 URL에서 검증하는 것이다.
- 배포는 VPS 전용 `compose.vps.yaml`을 사용한다.
- 서비스는 `db`, `backend`, `frontend`, `caddy`로 구성한다.
- 외부 공개 포트는 Caddy의 `80`, `443`만 사용한다.
- 새 기능, API, DB schema 변경은 포함하지 않는다.

## 배포 산출물

- `compose.vps.yaml`: VPS 전용 Docker Compose 구성
- `deploy/Caddyfile`: Caddy reverse proxy 설정
- `deploy/.env.staging.example`: staging 환경 변수 예시

실제 VPS에서는 `deploy/.env.staging.example`을 `deploy/.env.staging`으로 복사한 뒤 domain, secret, DB password를 교체한다. `deploy/.env.staging`은 커밋하지 않는다.

## VPS 준비

필수 조건:

- Linux VPS 1대
- Docker Engine 설치
- Docker Compose plugin 설치
- Git 설치
- staging domain 또는 subdomain 1개
- domain A record가 VPS public IP를 가리킴
- repo clone 권한

배포 실행 전에 확정해야 하는 값:

- VPS SSH 접속 정보
- `STAGING_DOMAIN`
- `VITE_API_BASE_URL=https://<staging-domain>`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `AUTH_SECRET_KEY`
- `CORS_ORIGINS=https://<staging-domain>`

권장 최소 사양:

- 2 vCPU
- RAM 2GB 이상
- Disk 30GB 이상

## 환경 변수

VPS에서는 local compose 값을 그대로 쓰지 않는다.

주요 staging 값:

```env
STAGING_DOMAIN=staging.example.com
VITE_API_BASE_URL=https://staging.example.com
APP_ENV=staging
DATABASE_URL=postgresql+psycopg://travelhunter:<strong-db-password>@db:5432/travelhunter
AUTH_SECRET_KEY=<strong-secret>
REFRESH_COOKIE_SECURE=true
CORS_ORIGINS=https://staging.example.com
```

`AUTH_SECRET_KEY`, DB password, domain 값은 repo에 커밋하지 않는다.

## 배포 순서

1. VPS에 repo를 clone한다.

```bash
git clone <repo-url> travel-hunter-app
cd travel-hunter-app
git checkout <release-candidate-commit-or-branch>
```

2. staging env 파일을 만든다.

```bash
cp deploy/.env.staging.example deploy/.env.staging
```

그 다음 `deploy/.env.staging`의 값을 실제 staging domain과 secret으로 교체한다.

3. compose 구성을 확인한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml config
```

4. 이미지를 빌드한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml build
```

5. DB를 먼저 시작한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d db
```

6. migration과 seed를 적용한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend python -m app.db.seed
```

7. 전체 서비스를 시작한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d
```

8. 상태를 확인한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml ps
docker compose --env-file deploy/.env.staging -f compose.vps.yaml logs --tail=100 backend
docker compose --env-file deploy/.env.staging -f compose.vps.yaml logs --tail=100 caddy
```

## Caddy Routing

`deploy/Caddyfile` 기준:

- `/api/*` -> `backend:8000`
- `/docs*` -> `backend:8000`
- `/openapi.json` -> `backend:8000`
- 그 외 모든 요청 -> `frontend:4173`

Caddy는 `STAGING_DOMAIN` 환경변수를 사용해 HTTPS 인증서를 자동 발급/갱신한다. 따라서 domain A record가 VPS public IP를 가리킨 뒤 실행해야 한다.

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

- 문제가 생기면 이전 정상 commit으로 checkout한다.
- 이후 `docker compose --env-file deploy/.env.staging -f compose.vps.yaml build`와 `up -d`를 다시 실행한다.
- DB migration이 변경된 release가 아니라면 DB rollback은 하지 않는다.
- DB snapshot/backup은 공개 테스트 전 별도 운영 기준에서 확정한다.

## Assumptions

- 이번 VPS 배포는 내부 테스트용 staging이다.
- public beta 전에는 개인정보/약관/로그/백업/모니터링 기준을 별도 확정한다.
- `REFRESH_COOKIE_SECURE=true`는 HTTPS가 준비된 staging에서만 사용한다.
- local 개발용 `compose.yaml`은 그대로 유지한다.
