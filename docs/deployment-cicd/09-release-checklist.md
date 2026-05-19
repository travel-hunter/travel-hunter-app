# Release Checklist

## 배포 전

- [ ] 배포 대상 브랜치가 맞다.
  - 개발 서버: `develop`
  - 운영 서버: `main`
- [ ] GitHub Actions CI가 통과했다.
- [ ] Jenkins build가 통과했다.
- [ ] 실제 `.env`, DB password, OAuth secret, tunnel token이 commit에 없다.
- [ ] 임시 Docker 이미지 archive(`*.tar`, `*.tar.gz`, `*.tgz`)가 commit에 없다.
- [ ] GitHub에는 source code, Dockerfile, Compose 설정, docs, safe example env만 올라간다.
- [ ] API 변경이 있으면 `docs/mvp-api-contract.md`와 frontend/backend/evals가 같이 갱신됐다.
- [ ] DB migration 변경이 있으면 `alembic upgrade head --sql` 결과를 확인했다.
- [ ] 운영 DB backup 필요 여부를 확인했다.
- [ ] `VITE_API_BASE_URL`, `CORS_ORIGINS`, `REFRESH_COOKIE_SECURE` 값이 배포 domain 기준이다.

## 배포 명령

Cloudflare Tunnel 기준:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml config
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

seed가 필요한 환경에서만 실행:

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml run --rm backend python -m app.db.seed
```

## 배포 후 상태 확인

```bash
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml ps
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 backend
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 caddy
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml logs --tail=100 cloudflared
curl -fsS https://<domain>/api/health
```

## Smoke Test

- [ ] `https://<domain>/api/health` returns ok.
- [ ] `https://<domain>/login` renders.
- [ ] 로그인 성공.
- [ ] 로그인 실패 메시지 확인.
- [ ] 정책 목록 검색/필터.
- [ ] 정책 상세 진입.
- [ ] 정책 저장/삭제.
- [ ] 일정 생성.
- [ ] 일정 상세 진입.
- [ ] 정책을 일정에 담기.
- [ ] AI 추천 결과 진입.
- [ ] AI 추천 항목을 일정에 추가.
- [ ] 초대 링크 생성/진입.
- [ ] 로그아웃.

테스트 계정은 seed 실행 환경에서만 사용한다.

```text
test.user@example.com / password123
```

## Release Readiness

Release candidate handoff는 아래 기준을 모두 설명할 수 있을 때만 ready로 본다.

- [ ] Core auth, profile, policies, trips, recommendations, saved policy, and invite flows work for the current MVP phase.
- [ ] `docs/mvp-api-contract.md`, frontend types, backend schemas, and focused tests agree.
- [ ] Public, protected, and authenticated routes render at target responsive widths without blank pages or horizontal overflow.
- [ ] Frontend keeps the `AppDataApi` boundary and backend keeps route/schema/service/repository separation.
- [ ] Fast lane checks, e2e/build checks, backend tests, Alembic SQL check, and Compose checks have release-candidate evidence.
- [ ] README, env examples, current plan, checklist, and deployment docs explain setup, behavior, and remaining risks.
- [ ] No known release blocker remains.

## Provider Smoke

실제 provider env가 준비된 staging/production 후보에서만 수행한다.

- [ ] SMTP: 비밀번호 재설정 email 수신, reset token confirm, 새 비밀번호 로그인.
- [ ] OAuth: Kakao/Google redirect URI, callback, session 복구.
- [ ] SOLAPI: D-7/D-1 승인 템플릿 기준 AlimTalk test 발송과 webhook 상태 반영.
- [ ] Cloudflare: public HTTPS domain에서 `/api/health`, `/login`, `/policies`, `/trips`, `/mypage` 확인.

## Rollback

코드 rollback:

```bash
cd /srv/travel-hunter-app
git checkout <previous-good-commit>
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.prod -f compose.tunnel.yaml up -d
```

DB migration rollback은 자동으로 가정하지 않는다. 데이터 손실 가능성이 있으면 backup restore 또는 별도 downgrade 계획을 먼저 적용한다.

## 배포 기록

배포 후 아래를 `CHECKLIST.md`, PR, 또는 release handoff 문서에 남긴다.

- 배포 날짜.
- 배포 commit.
- 대상 환경.
- 실행한 검증 명령.
- smoke test 결과.
- 발생한 문제와 조치.
- 남은 위험.
