# Development Deployment Architecture and Runbook

## 목적과 독자

이 문서는 Travel Hunter 개발 서버(`https://dev.travel-hunter.co.kr`)가 **어떤 서버에서**, **어떤 Docker 컨테이너로**, **어떤 경로를 통해 외부에 공개되는지**를 팀이 공유하기 위한 배포 구조 설명서이자 운영 Runbook이다.

문서의 1차 독자는 다음 역할이다.

- 개발자: 로컬에서 수정한 코드를 개발 서버에 반영하고 smoke를 확인하는 사람.
- 리뷰어: 현재 개발 서버가 어떤 commit과 runtime 설정으로 동작하는지 확인하는 사람.
- 운영 전환 담당자: 개발 서버에서 검증된 release candidate를 운영 서버로 옮길 때 구조와 체크리스트를 참고하는 사람.

이 문서는 **개발 서버 구조와 운영 전환 기준**을 설명한다. 실제 production 서버 변경, DNS 변경, OAuth provider 운영 설정 변경, production DB migration/seed 실행은 이 문서만으로 수행하지 않는다. Production 변경은 별도 작업명세서와 명시 승인을 먼저 필요로 한다.

## 한 줄 요약

현재 개발 서버는 `deploy@192.168.32.15`의 `/home/deploy/travel-hunter-app` repo에서
`compose.tunnel.yaml` Docker Compose 스택으로 실행된다. 외부 사용자는 Cloudflare Tunnel을 통해 들어오고,
tunnel 뒤의 Caddy가 `/api/*` 요청은 FastAPI backend로, 나머지 화면 요청은 Vite frontend preview 서버로 보낸다.

```text
사용자 브라우저
  -> Cloudflare edge / dev.travel-hunter.co.kr HTTPS
  -> cloudflared 컨테이너
  -> caddy 컨테이너(:80)
  -> /api, /docs, /openapi.json: backend 컨테이너(:8000)
  -> 그 외 SPA 화면: frontend 컨테이너(:4173)
  -> backend는 db 컨테이너(PostgreSQL :5432)에 접속
```

## 현재 개발 서버 기준값

2026-06-12 확인 기준이다. Secret 값은 문서화하지 않는다.

| 항목 | 값 |
| --- | --- |
| 개발 서버 SSH | `ssh deploy@192.168.32.15` |
| 확인된 hostname | `C307-24` |
| 서버 사용자 | `deploy` |
| 서버 repo 경로 | `/home/deploy/travel-hunter-app` |
| 서버 branch | `codex/production-promotion-20260612` |
| 현재 개발 서버 실행 SHA | `b4be808779bd541b048a49487e768631cce834a3` |
| 현재 PR head | `a53c122e8ad8c0925d249e3e60500d03ef7fd5ca` (`docs` evidence-only commit 포함) |
| Compose 파일 | `compose.tunnel.yaml` |
| Runtime env 파일 | `/home/deploy/travel-hunter-app/deploy/.env.prod` |
| Runtime env 권한 | `600`, owner `deploy:deploy` |
| 개발 도메인 | `https://dev.travel-hunter.co.kr` |
| Docker | `Docker 29.5.2` |
| Docker Compose | `v5.1.4` |

주의:

- `deploy/.env.prod`는 서버 runtime 전용 파일이며 git에 포함하지 않는다.
- DB password, OAuth secret, SMTP password, Cloudflare tunnel token, Kakao/Google client secret은 채팅, PR, 로그, 문서에 출력하지 않는다.
- 개발 서버 값과 production 서버 값은 같다고 가정하지 않는다.

## 외부 접속이 되는 방식

`compose.tunnel.yaml`에서는 frontend/backend/db/caddy에 host port를 공개하지 않는다. 즉, `8000:8000`이나 `4173:4173`처럼 서버 외부로 직접 포트를 열어 둔 구조가 아니다.

외부 접속 경로는 다음과 같다.

1. 사용자가 브라우저에서 `https://dev.travel-hunter.co.kr`에 접속한다.
2. DNS/HTTPS 요청은 Cloudflare edge가 받는다.
3. Cloudflare Tunnel 설정에 따라 요청이 개발 서버의 `cloudflared` 컨테이너로 전달된다.
4. `cloudflared`는 같은 Docker Compose network 안의 `caddy:80`으로 요청을 넘긴다.
5. Caddy는 path 기준으로 요청을 분기한다.
   - `/api/*` -> `backend:8000`
   - `/docs*` -> `backend:8000`
   - `/openapi.json` -> `backend:8000`
   - 그 외 모든 경로 -> `frontend:4173`

이 구조 때문에 서버 방화벽/공유기에서 앱 포트를 직접 열지 않아도 외부 HTTPS 접속이 가능하다. Public HTTPS의 앞단은 Cloudflare이고, Docker 내부 reverse proxy는 Caddy가 담당한다.

## Docker Compose 구성

개발 서버의 public runtime은 `compose.tunnel.yaml`이다.

| 서비스 | 이미지/빌드 | 역할 | 외부 공개 |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | PostgreSQL 데이터베이스 | host port 없음, Docker network 내부 `5432` |
| `backend` | `./backend` Dockerfile build | FastAPI API 서버, Alembic migration 실행 대상 | host port 없음, 내부 `8000` |
| `frontend` | `./frontend` Dockerfile build | Vite build 결과를 `vite preview`로 서빙 | host port 없음, 내부 `4173` |
| `caddy` | `caddy:2-alpine` | tunnel 뒤 reverse proxy/path router | host port 없음, 내부 `80` |
| `cloudflared` | `cloudflare/cloudflared:latest` | Cloudflare Tunnel connector | outbound tunnel만 사용 |

Compose project/network 이름은 현재 `travel-hunter-app` / `travel-hunter-app_default`로 관측된다.

현재 개발 서버에서 관측된 컨테이너 이름은 다음과 같다.

```text
travel-hunter-app-db-1
travel-hunter-app-backend-1
travel-hunter-app-frontend-1
travel-hunter-app-caddy-1
travel-hunter-app-cloudflared-1
```

현재 개발 서버에서 관측된 app 이미지 예시는 다음과 같다.

```text
travel-hunter-app-frontend:latest 6f8533afaa93
travel-hunter-app-backend:latest  55f20aa29a4a
```

이미지 ID는 재빌드할 때 바뀔 수 있으므로 상태 확인 evidence로만 본다.

## 어떤 파일이 빌드되는가

### Frontend

파일: `frontend/Dockerfile`

빌드 흐름:

1. `node:22-alpine` 기반 image 사용.
2. `package*.json` 복사 후 `npm ci`로 의존성 설치.
3. build stage에서 다음 build arg를 주입한다.
   - `VITE_API_BASE_URL`
   - `VITE_KAKAO_MAP_JS_KEY`
4. frontend source를 복사한다.
5. `npm run build` 실행.
   - 내부적으로 `npm run typecheck && vite build`가 실행된다.
6. 컨테이너 실행 시 `npm run preview -- --host 0.0.0.0 --port 4173`으로 Vite build 결과를 서빙한다.

중요한 점:

- frontend의 `VITE_*` 값은 build time에 bundle에 반영된다.
- `VITE_API_BASE_URL` 또는 Kakao Maps JS key를 바꾸면 frontend image를 다시 build해야 한다.
- 개발 서버 public 모드에서는 API와 화면을 같은 origin으로 쓰는 구성이 기본이다.

### Backend

파일: `backend/Dockerfile`

빌드 흐름:

1. `python:3.12-slim` 기반 image 사용.
2. `requirements.txt` 설치.
3. `alembic.ini`, `alembic/`, `app/` 복사.
4. 컨테이너 실행 시 `uvicorn app.main:app --host 0.0.0.0 --port 8000` 실행.

Backend는 runtime env에서 DB, auth, OAuth, SMTP, Kakao Local, scheduler 설정을 읽는다. DB schema 생성/변경은 Alembic migration으로만 수행한다.

### Caddy

파일: `deploy/Caddyfile.tunnel`

현재 설정은 `:80`에서 다음처럼 path routing만 수행한다.

```text
/api/*        -> backend:8000
/docs*        -> backend:8000
/openapi.json -> backend:8000
나머지         -> frontend:4173
```

### Database

`db` 서비스는 `postgres:16-alpine`과 named volume `travelhunter-db`를 사용한다. 기존 데이터가 있는 환경에서는 volume 삭제, DB drop/reset, seed 재실행을 임의로 하지 않는다.

## Runtime env 파일의 의미

개발 서버 runtime env 파일은 다음 위치에 있다.

```text
/home/deploy/travel-hunter-app/deploy/.env.prod
```

이 파일은 git에 올리지 않는 secret/runtime 설정 파일이다. 문서에는 key의 의미만 기록하고 실제 값은 기록하지 않는다.

주요 범주는 다음과 같다.

| 범주 | 예시 key | 의미 |
| --- | --- | --- |
| DB | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` | PostgreSQL 생성/접속 정보 |
| Auth | `AUTH_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_*` | JWT/refresh cookie/session 설정 |
| Domain/CORS | `CORS_ORIGINS`, `TRAVEL_HUNTER_PUBLIC_BASE_URL`, `VITE_API_BASE_URL`, `STAGING_DOMAIN` | browser origin, public URL, frontend build 대상 domain |
| SMTP/Brevo | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` | 비밀번호 재설정/일정 초대 email 발송 |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google login/callback |
| Kakao OAuth | `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI` | Kakao login/callback |
| Kakao Maps/Local | `VITE_KAKAO_MAP_JS_KEY`, `KAKAO_LOCAL_REST_API_KEY`, `KAKAO_LOCAL_ENABLED` | 지도 렌더링과 장소 후보 추천 |
| Cloudflare Tunnel | `CLOUDFLARE_TUNNEL_TOKEN` | cloudflared connector 실행 |
| Scheduler/Ops | `NOTIFICATION_*`, `EXTERNAL_COLLECTION_*` | 알림/외부 정책 수집 runtime 동작 |

`STAGING_DOMAIN`이라는 변수명은 tunnel compose가 staging/dev/prod 유사 구성을 공유하면서 남은 legacy 이름이다.
이 이름은 실제 환경이 staging이라는 뜻이 아니며, Caddy/Cloudflare routing 판단 기준도 아니다. 현재 compose에서는
Vite preview의 allowed host에 넣을 public hostname을 전달하는 용도로만 해석한다. 개발 서버에서는
`dev.travel-hunter.co.kr`, production에서는 production domain 값을 넣는다. 다음 runtime config 정리 때는
`PUBLIC_DOMAIN`처럼 중립적인 이름으로 바꾸는 follow-up을 검토한다.

## 개발 서버 배포 절차

일반적인 작업 흐름은 다음과 같다.

1. 로컬 PC에서 코드를 수정하고 테스트한다.
2. GitHub branch/PR에 push한다.
3. 개발 서버에 SSH 접속한다.
4. 개발 서버 repo에서 대상 branch/SHA를 가져온다.
5. Docker image를 build하고 stack을 갱신한다.
6. public URL에서 smoke를 확인한다.

개발 서버 접속:

```bash
ssh deploy@192.168.32.15
cd /home/deploy/travel-hunter-app
```

코드 갱신 예시:

```bash
git fetch origin
git checkout codex/production-promotion-20260612
git pull --ff-only origin codex/production-promotion-20260612
```

Compose 설정 검증:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config --quiet
```

이미지 build:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
```

DB migration:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head
```

Stack 시작/갱신:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

빈 DB에 한해서만 seed를 실행한다.

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend python -m app.db.seed
```

기존 데이터가 있으면 seed/reset/drop/volume 삭제를 하지 않는다. 먼저 backup 필요 여부를 판단하고 migration만 수행한다.

## 배포 후 상태 확인

컨테이너 상태:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml ps
```

최근 로그:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 backend
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 caddy
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 cloudflared
```

공개 health check:

```bash
curl -fsS https://dev.travel-hunter.co.kr/api/health
```

정상 응답 예시:

```json
{"status":"ok","service":"travel-hunter-backend","environment":"staging","database":"connected"}
```

Frontend 응답 헤더 확인:

```bash
curl -fsSI https://dev.travel-hunter.co.kr/
```

현재 확인된 특징:

- `HTTP/2 200`
- `via: 1.1 Caddy`
- `server: cloudflare`

즉, 외부는 Cloudflare를 거치고 내부 reverse proxy는 Caddy가 처리한다.

## Smoke checklist

개발 서버 배포 후 최소 확인:

- [ ] `https://dev.travel-hunter.co.kr/api/health`가 `status: ok`, `database: connected`를 반환한다.
- [ ] `/login`, `/policies`, `/trips`, `/mypage`가 빈 화면 없이 열린다.
- [ ] email/password login/logout/refresh가 동작한다.
- [ ] Google OAuth login/callback/session이 동작한다.
- [ ] Kakao OAuth login/callback/session이 동작한다.
- [ ] 비밀번호 재설정 email 발송과 실제 inbox 수신이 확인된다.
- [ ] 일정 초대 email 발송과 실제 inbox 수신이 확인된다.
- [ ] 정책 목록/상세/검색/저장 flow가 동작한다.
- [ ] 일정 생성/목록/상세/수정 flow가 동작한다.
- [ ] 정책을 일정에 담기/해제가 동작한다.
- [ ] 초대 링크 생성/열기/수락이 동작한다.
- [ ] Kakao Maps 렌더링이 동작한다.
- [ ] Kakao Local 후보 추천이 동작한다.
- [ ] backend/caddy/cloudflared 로그에 secret이 출력되지 않는다.

## Rollback

코드 rollback은 이전 정상 commit으로 checkout한 뒤 image를 다시 build/up 한다.

```bash
cd /home/deploy/travel-hunter-app
git checkout <previous-good-commit>
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

DB migration rollback은 자동으로 가정하지 않는다. 데이터 손실 가능성이 있으면 backup restore 또는 별도 downgrade 계획을 먼저 작성한다.

## 자주 헷갈리는 지점

### `compose.yaml`과 `compose.tunnel.yaml`은 다르다

- `compose.yaml`: 로컬 Docker 개발/검증용. host port를 노출한다.
- `compose.tunnel.yaml`: 개발 서버 public tunnel runtime용. host port를 직접 노출하지 않고 Cloudflare Tunnel과 Caddy를 사용한다.

### public HTTPS는 Caddy가 직접 받는 것이 아니다

브라우저의 `https://dev.travel-hunter.co.kr` HTTPS 요청은 Cloudflare edge가 받는다. 개발 서버의 Caddy는 tunnel 뒤에서 내부 HTTP `:80` reverse proxy 역할을 한다.

### frontend env는 runtime 변경만으로 바뀌지 않을 수 있다

`VITE_*` 값은 frontend build 시점에 bundle에 들어간다. `VITE_API_BASE_URL` 또는 `VITE_KAKAO_MAP_JS_KEY`를 바꾸면 frontend image를 다시 build해야 한다.

### DB data와 Docker volume은 별도 위험 영역이다

`travelhunter-db` volume 삭제, DB drop, seed 재실행은 데이터 손실 가능성이 있다. 기존 DB가 있으면 backup 없이는 실행하지 않는다.

### OAuth 문제는 provider console과 backend 로그를 같이 봐야 한다

OAuth callback 실패는 코드만의 문제가 아닐 수 있다. redirect URI, web platform domain, consent scope, client secret, cookie secure/origin 설정을 함께 확인한다.

## 장애 대응 빠른 기준

| 증상 | 먼저 볼 곳 | 대표 원인 |
| --- | --- | --- |
| 전체 사이트 접속 불가 | `cloudflared` logs, Cloudflare Tunnel status | tunnel token/connector/public hostname 문제 |
| `/api/health` 실패 | `backend` logs, `db` health | DB 연결, migration, backend env 문제 |
| 화면은 뜨지만 API 실패 | Caddy routing, `CORS_ORIGINS`, `VITE_API_BASE_URL` | API base URL/domain mismatch |
| frontend 변경이 반영 안 됨 | frontend image build time, asset hash | image rebuild 누락, build arg 변경 누락 |
| OAuth callback 실패 | provider console, backend logs | redirect URI/domain/scope/client secret mismatch |
| email 미수신 | backend logs, SMTP/Brevo 설정 | sender/domain verification, SMTP credential 문제 |
| Docker build 중 package registry DNS 실패 | Docker daemon DNS, build network | WSL/Docker bridge DNS resolver 문제 |

Docker DNS 관련 상세 진단/수정 evidence는 다음 문서를 참고한다.

- `.omx/evidence/docker-dns-diagnosis-20260612.md`
- `.omx/evidence/docker-dns-fix-20260612.md`

## 운영 전환 담당자에게 넘길 때

개발 서버에서 release candidate가 충분히 검증되면 운영 전환 담당자는 approved `main` SHA를 기준으로 운영 서버에 반영한다.

운영 전환 시 반드시 별도로 확인할 항목:

- production domain: `https://travel-hunter.co.kr`
- production `CORS_ORIGINS`, `TRAVEL_HUNTER_PUBLIC_BASE_URL`, `VITE_API_BASE_URL`
- production Google/Kakao redirect URI
- production Kakao web platform domain
- production SMTP sender/domain verification
- production Cloudflare Tunnel token/public hostname
- production DB backup/migration/seed 정책

운영 전환 담당자용 상세 handoff는 `docs/deployment-cicd/dev-rc-handoff.md`를 따른다.

## 금지선

아래는 이 문서/일반 개발 서버 작업만으로 실행하지 않는다.

- production 서버 직접 변경.
- production DNS/Cloudflare/OAuth provider 설정 변경.
- production DB migration/seed 실행.
- DB volume 삭제, table drop, reset, secret 출력.
- `.env.prod` 값, OAuth secret, SMTP password, tunnel token 문서화.

Production 변경이 필요하면 먼저 작업명세서를 작성하고, 변경 범위와 rollback/no-go 기준을 명시한 뒤 명시 승인을 받아야 한다.
