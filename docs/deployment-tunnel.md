# Travel Hunter Cloudflare Tunnel Staging 배포 계획

## Summary

- 목적은 학교/온프레미스 네트워크처럼 외부 inbound `80/443/22` 포트 개방이 제한되는 환경에서 MVP RC를 HTTPS 외부 URL로 테스트하는 것이다.
- 기존 Docker Compose, Caddy, PostgreSQL 구조는 유지하고, 외부 진입점만 Cloudflare Tunnel로 바꾼다.
- `docs/deployment-vps.md`는 public VPS가 직접 `80/443`을 받을 수 있는 경우에 사용하고, 이 문서는 NAT 제한 환경에서 사용한다.
- ngrok은 임시 발표/시연용 fallback으로만 보고, 내부 테스트용 staging은 Cloudflare Tunnel을 기본값으로 둔다.

## 권장 구조

```text
외부 사용자
→ Cloudflare HTTPS / DNS / WAF
→ Cloudflare Tunnel
→ cloudflared container
→ Caddy internal reverse proxy
→ frontend / backend
→ PostgreSQL
```

현재 repo의 reverse proxy 기준은 nginx가 아니라 Caddy다. 따라서 회의안의 nginx 역할은 `caddy` service가 담당한다.

요청 라우팅 기준:

| 요청 경로 | 내부 대상 | 용도 |
|---|---|---|
| `/api/*` | `backend:8000` | FastAPI API |
| `/docs*` | `backend:8000` | FastAPI Swagger 문서 |
| `/openapi.json` | `backend:8000` | OpenAPI schema |
| 그 외 | `frontend:4173` | React/Vite frontend |

## ngrok vs Cloudflare Tunnel 판단

| 용도 | 추천 |
|---|---|
| 하루짜리 임시 발표, 빠른 시연 | ngrok |
| 고정 도메인 기반 MVP staging | Cloudflare Tunnel |
| 학교 NAT 제한 환경의 장기 내부 테스트 | Cloudflare Tunnel |
| 공개 테스트 전 보안/WAF/DNS 관리 | Cloudflare Tunnel |

Cloudflare Tunnel은 서버가 Cloudflare로 outbound 연결을 유지하는 방식이므로 학교 네트워크에서 inbound port forwarding이 어려운 상황에 적합하다. 도메인은 Cloudflare에 연결해야 하고, 실제 tunnel token은 repo에 기록하지 않는다.

## 배포 산출물

Cloudflare Tunnel mode는 public VPS mode와 분리된 다음 파일을 사용한다:

- `compose.tunnel.yaml`
- `deploy/Caddyfile.tunnel`
- `deploy/.env.tunnel.example`

`compose.tunnel.yaml`은 host port를 열지 않는다. `cloudflared` container가 Cloudflare와 outbound tunnel을 유지하고, Cloudflare public hostname은 Docker network 내부의 `http://caddy:80`으로 전달한다.

`deploy/Caddyfile.tunnel`은 내부 reverse proxy 전용이므로 `:80`으로만 listen한다. 외부 HTTPS 인증서, WAF, DNS는 Cloudflare가 담당한다.

기존 public VPS 산출물은 유지한다:

- `compose.vps.yaml`
- `deploy/Caddyfile`
- `deploy/.env.staging.example`
- `docs/deployment-vps.md`

## Tunnel 환경 변수 기준

예상 `.env.tunnel` 값:

```env
STAGING_DOMAIN=staging.example.com
VITE_API_BASE_URL=https://staging.example.com

POSTGRES_DB=travelhunter
POSTGRES_USER=travelhunter
POSTGRES_PASSWORD=<strong-db-password>
DATABASE_URL=postgresql+psycopg://travelhunter:<strong-db-password>@db:5432/travelhunter

APP_ENV=staging
AUTH_SECRET_KEY=<strong-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14
REFRESH_COOKIE_NAME=travel_hunter_refresh
REFRESH_COOKIE_SECURE=true
CORS_ORIGINS=https://staging.example.com

CLOUDFLARE_TUNNEL_TOKEN=<cloudflare-tunnel-token>
```

`deploy/.env.tunnel`은 서버에만 두고 커밋하지 않는다.

## 배포 실행 순서

1. Cloudflare에 도메인을 연결한다.
2. Cloudflare Zero Trust에서 Tunnel을 만든다.
3. Public hostname을 추가한다.

```text
Hostname: staging.example.com
Service: http://caddy:80
```

4. 서버에 repo를 clone한다.

```bash
git clone <repo-url> travel-hunter-app
cd travel-hunter-app
git checkout <release-candidate-commit-or-branch>
```

5. tunnel env 파일을 만든다.

```bash
cp deploy/.env.tunnel.example deploy/.env.tunnel
```

6. compose 구성을 확인한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config
```

예시 env만으로 compose 구조를 확인하려면 다음 명령을 사용한다.

```bash
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```

7. 이미지를 빌드한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml build
```

8. DB를 먼저 시작한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d db
```

9. migration과 seed를 적용한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend python -m app.db.seed
```

10. 전체 서비스를 시작한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d
```

11. 상태와 로그를 확인한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml ps
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml logs --tail=100 cloudflared
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml logs --tail=100 caddy
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml logs --tail=100 backend
```

## Smoke Test

API:

```bash
curl -fsS https://<staging-domain>/api/health
```

브라우저:

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
- 일정 생성/삭제
- 정책을 일정에 담기
- 초대 수락 링크 진입
- 로그아웃

## Troubleshooting

- `cloudflared` 로그에 tunnel 연결 실패가 보이면 `CLOUDFLARE_TUNNEL_TOKEN`과 Cloudflare Zero Trust tunnel 상태를 확인한다.
- `502`가 보이면 `caddy`, `frontend`, `backend` service 상태와 container network 이름을 확인한다.
- 로그인 후 세션이 유지되지 않으면 `VITE_API_BASE_URL`, `CORS_ORIGINS`, `REFRESH_COOKIE_SECURE=true`, 외부 HTTPS 도메인을 함께 확인한다.
- `/api/health`만 실패하면 backend 로그와 `DATABASE_URL`/migration 상태를 확인한다.

## Assumptions

- Cloudflare 계정과 도메인은 별도로 준비한다.
- Tunnel token, DB password, `AUTH_SECRET_KEY`는 repo에 기록하지 않는다.
- Caddy는 외부 TLS 종료가 아니라 container 내부 reverse proxy 역할을 한다.
- 실제 공개 테스트 전에는 개인정보/약관, 로그, 백업, 모니터링 기준을 별도 확정한다.
