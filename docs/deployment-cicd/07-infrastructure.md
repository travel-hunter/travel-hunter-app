# 인프라 구성

## 기본 구성

팀 운영은 PC 2대와 도메인 1개를 기준으로 한다.

- 개발 PC
  - Jenkins 설치 예정.
  - 개발 서버 배포 대상.
  - `develop` 브랜치 기준.
- 운영 PC
  - 운영 애플리케이션 실행.
  - Cloudflare Tunnel 실행.
  - `main` 브랜치 기준.

## 네트워크 공개 방식

기본값은 Cloudflare Tunnel이다.

장점:

- 공유기 포트포워딩 없이 HTTPS domain 연결 가능.
- 운영 PC가 Cloudflare로 outbound 연결만 유지하면 된다.
- 도메인, TLS, WAF 관리를 Cloudflare 쪽에서 처리할 수 있다.

권장 hostname:

```text
dev.<domain>   -> 개발 PC 또는 개발 tunnel
app.<domain>   -> 운영 PC tunnel
```

도메인을 하나만 쓸 경우 운영은 root domain 또는 `app.<domain>`에 두고, 개발은 필요할 때만 임시 subdomain을 사용한다.

## Docker Compose 기준

로컬 개발:

```text
compose.yaml
```

Cloudflare Tunnel 서버 배포:

```text
compose.tunnel.yaml
deploy/Caddyfile.tunnel
```

현재 팀 기준은 Cloudflare Tunnel이다. 직접 80/443 노출 방식은 배포 기준 문서에서 제외한다.

## 임시 Docker 이미지 archive

`travel-server-images.tar.gz` 같은 파일은 팀원이 임시로 빌드한 Docker image archive일 수 있다. 이 파일은 source of truth가 아니며 GitHub에 올리지 않는다.

임시 확인 용도:

```bash
docker load -i travel-server-images.tar.gz
docker image ls
```

정식 배포 기준:

```bash
git pull origin main
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

archive 방식은 어떤 commit, Dockerfile, env 기준으로 만들어졌는지 추적이 어렵다. 따라서 반복 배포와 팀 협업은 GitHub repo를 기준으로 하고, 이미지는 서버나 Jenkins에서 재생성한다.

## 서버 env 파일

실제 env 파일은 서버에만 둔다.

예시:

```text
deploy/.env.dev
deploy/.env.prod
```

현재 `.gitignore`에는 다음 실제 env 파일이 제외되어 있다.

```text
deploy/.env.staging
deploy/.env.tunnel
```

추후 `deploy/.env.dev`, `deploy/.env.prod`를 쓸 경우 `.gitignore`에 추가한다.

## 필수 env 값

```env
STAGING_DOMAIN=<domain>
VITE_API_BASE_URL=https://<domain>
POSTGRES_DB=travelhunter
POSTGRES_USER=travelhunter
POSTGRES_PASSWORD=<strong-db-password>
DATABASE_URL=postgresql+psycopg://travelhunter:<strong-db-password>@db:5432/travelhunter
APP_ENV=production
AUTH_SECRET_KEY=<strong-random-secret>
REFRESH_COOKIE_SECURE=true
CORS_ORIGINS=https://<domain>
CLOUDFLARE_TUNNEL_TOKEN=<cloudflare-tunnel-token>
```

OAuth, SMTP, SOLAPI를 사용할 때만 해당 provider secret을 추가한다.

## 운영 PC 최초 배포

```bash
git clone <repo-url> travel-hunter-app
cd travel-hunter-app
git checkout main
cp deploy/.env.tunnel.example deploy/.env.prod
```

`deploy/.env.prod` 값을 실제 운영 값으로 바꾼다. 이 파일은 커밋하지 않는다.

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

## 상태 확인

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml ps
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 cloudflared
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 caddy
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 backend
```

외부 확인:

```bash
curl -fsS https://<domain>/api/health
```
