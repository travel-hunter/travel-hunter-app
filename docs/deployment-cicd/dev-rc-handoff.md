# Development Server RC Handoff

## 목적

이 문서는 Travel Hunter를 운영 서버에 직접 배포하기 위한 실행서가 아니라, **개발 서버에서 초기 배포 가능한 release candidate를 검증하고 운영 전환 담당자에게 넘기기 위한 인수인계 문서**다.

현재 운영 방침:

- 개발 서버와 운영 서버는 분리되어 있다.
- 현재 Codex/개발 작업 범위는 개발 서버 release candidate 완성과 검증이다.
- 운영 서버 동기화와 운영 배포는 운영 전환 담당자가 담당한다.
- 이 문서는 운영 전환 담당자가 운영 서버에 반영할 때 확인해야 하는 구조, 설정 항목, 검증 증거, 남은 위험을 정리한다.

## 현재 개발 서버 기준값

| 항목 | 값 |
| --- | --- |
| 개발 서버 SSH | `ssh deploy@192.168.32.15` |
| 확인된 hostname | `C307-24` |
| 개발 서버 repo 경로 | `/home/deploy/travel-hunter-app` |
| 개발 서버 compose 파일 | `compose.tunnel.yaml` |
| 개발 서버 runtime env | `/home/deploy/travel-hunter-app/deploy/.env.prod` |
| 개발 서버 도메인 | `https://dev.travel-hunter.co.kr` |
| 개발 서버 배포 기준 SHA | `b4be808779bd541b048a49487e768631cce834a3` |
| main promotion PR | <https://github.com/travel-hunter/travel-hunter-app/pull/52> |

주의:

- `deploy/.env.prod`는 서버 runtime 전용 파일이며 git에 포함하지 않는다.
- secret, DB password, OAuth secret, SMTP password, Cloudflare tunnel token은 채팅, PR, 로그, 문서에 출력하지 않는다.
- 개발 서버 경로와 운영 서버 경로/계정은 같다고 가정하지 않는다.

## 개발 서버에서 검증된 범위

2026-06-12 기준 개발 서버 또는 개발 서버 기준 release gate에서 확인된 항목:

- Cloudflare Tunnel 경유 `https://dev.travel-hunter.co.kr` 라우팅.
- `/api/health` DB 연결 정상.
- Google OAuth 브라우저 로그인 성공.
- Kakao OAuth 브라우저 로그인 성공.
- Kakao OAuth `account_email` scope 기반 세션 복구.
- Brevo SMTP 비밀번호 재설정 email 발송과 실제 Gmail inbox 수신.
- Brevo SMTP 일정 초대 email 발송과 실제 Gmail inbox 수신.
- Kakao Maps 화면 smoke.
- Kakao Local 후보 smoke.
- 정책 목록/상세, 저장, 일정 연결.
- 일정 생성/상세/수정.
- 친구 초대 링크/수락 flow.
- 관리자 외부 정책 수집 health/quality/manual run smoke.
- Docker default bridge/build DNS root fix 후 package registry DNS probe 통과.

세부 증거는 로컬 OMX evidence에 기록되어 있다.

- `.omx/evidence/dev-server-runtime-deploy-20260612.md`
- `.omx/evidence/dev-server-runtime-gates-20260612.md`
- `.omx/evidence/docker-dns-diagnosis-20260612.md`
- `.omx/evidence/docker-dns-fix-20260612.md`
- `.omx/evidence/production-preflight-20260612.md`
  - 단, 이 파일의 production preflight는 이후 운영 서버 직접 배포 범위가 아닌 **운영 전환 담당자 인수인계 준비 증거**로 해석한다.

## 코드 release gate 상태

PR #52는 개발 서버 RC를 main으로 승격하기 위한 보호 브랜치 경로다.

- Branch: `codex/production-promotion-20260612`
- Base: `main`
- PR: <https://github.com/travel-hunter/travel-hunter-app/pull/52>
- 상태: draft, review required
- CI 상태: frontend/backend fast lane 통과, CodeRabbit success

PR #52에 포함된 핵심 정리:

- frontend lockfile security update 후 `npm audit --audit-level=high` 통과.
- backend-mode e2e fixture를 현재 seed policy slug와 현재 itinerary time slot에 맞게 수정.
- release checklist와 CHECKLIST에 개발 서버/RC 검증 상태 반영.

운영 전환 담당자는 운영 서버 반영 전, PR #52 또는 그 후속 PR이 `main`에 merge된 SHA를 기준으로 운영 배포해야 한다.

## 운영 전환 담당자에게 넘길 설정 항목

아래는 값이 아니라 **필요한 key 목록**이다. 실제 값은 운영 서버의 runtime secret 관리 방식으로만 주입한다.

### 공통/backend

```env
APP_ENV=production
DATABASE_URL=<production database url>
AUTH_SECRET_KEY=<long random secret>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14
REFRESH_COOKIE_NAME=travel_hunter_refresh
REFRESH_COOKIE_SECURE=true
CORS_ORIGINS=https://travel-hunter.co.kr
TRAVEL_HUNTER_PUBLIC_BASE_URL=https://travel-hunter.co.kr
PASSWORD_RESET_EXPIRE_MINUTES=30
```

### PostgreSQL

```env
POSTGRES_DB=<production db name>
POSTGRES_USER=<production db user>
POSTGRES_PASSWORD=<production db password>
```

### Frontend build args

```env
VITE_API_BASE_URL=https://travel-hunter.co.kr
VITE_KAKAO_MAP_JS_KEY=<kakao javascript key>
STAGING_DOMAIN=travel-hunter.co.kr
```

현재 compose 변수명이 `STAGING_DOMAIN`인 이유는 tunnel compose가 staging/dev/prod 유사 구성을 공유하면서 남은 legacy 이름이기 때문이다.
이 이름은 실제 환경이 staging이라는 뜻이 아니며, Vite preview allowed host에 넣을 public hostname으로만 해석한다.
운영 서버에서는 값만 production domain으로 둔다. 다음 runtime config 정리 때는 `PUBLIC_DOMAIN`처럼 중립적인 이름으로 바꾸는 follow-up을 검토한다.

### SMTP/Brevo

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=<brevo smtp username>
SMTP_PASSWORD=<brevo smtp password>
SMTP_FROM_EMAIL=no-reply@travel-hunter.co.kr
SMTP_USE_TLS=true
```

### Google OAuth

```env
GOOGLE_CLIENT_ID=<google client id>
GOOGLE_CLIENT_SECRET=<google client secret>
GOOGLE_REDIRECT_URI=https://travel-hunter.co.kr/api/auth/oauth/google/callback
```

Provider console에도 같은 redirect URI가 등록되어 있어야 한다.

### Kakao OAuth / Maps / Local

```env
KAKAO_CLIENT_ID=<kakao REST/client id>
KAKAO_CLIENT_SECRET=<kakao client secret>
KAKAO_REDIRECT_URI=https://travel-hunter.co.kr/api/auth/oauth/kakao/callback
KAKAO_LOCAL_ENABLED=true
KAKAO_LOCAL_REST_API_KEY=<kakao local REST api key>
KAKAO_LOCAL_TIMEOUT_SECONDS=5
```

Kakao console 확인 항목:

- Kakao Login ON.
- `account_email` 동의항목 사용 가능.
- Redirect URI: `https://travel-hunter.co.kr/api/auth/oauth/kakao/callback`.
- Web platform domain: `https://travel-hunter.co.kr`.

### Cloudflare Tunnel

```env
CLOUDFLARE_TUNNEL_TOKEN=<production tunnel token>
```

권장 public hostname:

```text
Hostname: travel-hunter.co.kr
Service:  http://caddy:80
```

현재 앱 구조는 same-origin API를 권장한다.

```text
Frontend: https://travel-hunter.co.kr
API:      https://travel-hunter.co.kr/api
```

`api.travel-hunter.co.kr`는 v1 필수 구성이 아니다.

## 운영 서버 반영 절차 개요

운영 전환 담당자가 운영 서버에서 조정할 절차:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config --quiet
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

빈 운영 DB에 한해 초기 seed를 실행할 수 있다.

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend python -m app.db.seed
```

기존 운영 DB가 있으면 seed/reset/drop을 하지 말고 먼저 backup 후 migration만 수행한다.

## 운영 서버 smoke checklist

운영 전환 담당자는 운영 도메인에서 아래를 확인한다.

- `https://travel-hunter.co.kr/api/health`
- `https://travel-hunter.co.kr/login`
- email/password signup/login/logout/refresh
- Google OAuth login/callback/session
- Kakao OAuth login/callback/session
- password reset email request, inbox receipt, reset completion
- trip invite email request, inbox receipt
- policy list/detail/search/filter
- policy save/unsave
- policy-to-trip link/unlink
- trip create/list/detail/place add/edit/delete/move
- invite link create/open/accept
- Kakao Maps rendering
- Kakao Local candidate recommendation
- admin external collection health/quality/manual run with runtime-only bearer token
- backend/caddy/cloudflared logs with secret redaction

## 운영 서버 No-Go

다음 중 하나라도 해당하면 운영 배포 완료로 주장하지 않는다.

- `travel-hunter.co.kr` DNS가 resolve되지 않는다.
- Cloudflare tunnel connector가 healthy가 아니다.
- OAuth provider console에 production redirect URI가 없다.
- SMTP sender/domain이 운영 발신 주소로 검증되지 않았다.
- 운영 DB가 이미 있는데 backup 없이 migration하려 한다.
- DB reset, table drop, Docker volume deletion이 필요하다.
- secret 값을 로그/채팅/문서에 출력해야만 진행할 수 있다.
- `/api/health`, 로그인, 정책, 일정, 초대 핵심 flow 중 하나가 실패한다.

## 현재 Codex 작업 범위 밖

이 문서 작성 시점의 Codex 범위 밖:

- 운영 서버 직접 접속/변경.
- 운영 서버 Docker stack 생성.
- production Cloudflare/DNS 변경.
- production OAuth provider console 변경.
- production DB migration/seed 실행.

Codex가 담당한 것은 개발 서버 RC 검증, release gate 정리, 운영 전환 담당자가 사용할 수 있는 인수인계 문서화다.
