# Travel Hunter VPS Staging Inputs

## 목적

- Docker VPS staging 배포 전에 필요한 입력값을 한곳에 정리한다.
- 이 문서는 secret 값을 저장하는 파일이 아니다. 실제 값은 안전한 비밀 공유 수단과 VPS의 `deploy/.env.staging`에만 둔다.
- repo에는 `deploy/.env.staging.example`만 커밋한다.

## 현재 상태

- Docker VPS 배포 산출물은 준비되어 있다.
- 실제 배포는 아래 입력값이 준비될 때까지 대기한다.
- 배포 runbook은 `docs/deployment-vps.md`를 따른다.

## Required Inputs

| 항목 | 예시 | 저장 위치 | 상태 |
| --- | --- | --- | --- |
| VPS SSH host | `203.0.113.10` | 별도 비밀 공유 수단 | Pending |
| VPS SSH user | `ubuntu` | 별도 비밀 공유 수단 | Pending |
| SSH key 또는 접속 방식 | `~/.ssh/travel-hunter-staging.pem` | 별도 비밀 공유 수단 | Pending |
| GitHub repo clone 권한 | deploy key 또는 collaborator 권한 | GitHub/VPS | Pending |
| Staging domain | `staging.example.com` | DNS provider, `deploy/.env.staging` | Pending |
| DNS A record | domain -> VPS public IP | DNS provider | Pending |
| `POSTGRES_PASSWORD` | strong random password | `deploy/.env.staging` only | Pending |
| `DATABASE_URL` | `postgresql+psycopg://travelhunter:<password>@db:5432/travelhunter` | `deploy/.env.staging` only | Pending |
| `AUTH_SECRET_KEY` | strong random secret | `deploy/.env.staging` only | Pending |
| `CORS_ORIGINS` | `https://<staging-domain>` | `deploy/.env.staging` only | Pending |
| `VITE_API_BASE_URL` | `https://<staging-domain>` | `deploy/.env.staging` only | Pending |
| `REFRESH_COOKIE_SECURE` | `true` | `deploy/.env.staging` | Required |

## Recommended Secret Rules

- `AUTH_SECRET_KEY`는 긴 random string을 사용한다.
- `POSTGRES_PASSWORD`는 local/dev 값과 다르게 설정한다.
- staging secret은 GitHub issue, PR, README, chat log에 평문으로 남기지 않는다.
- 실제 공개 테스트 전에는 DB backup, log retention, admin access, 개인정보/약관 기준을 별도 확정한다.

## 배포 전 확인 명령

VPS에서 repo clone과 env 작성 후 아래 순서로 확인한다.

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml config
docker compose --env-file deploy/.env.staging -f compose.vps.yaml build
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d db
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d
```

## Smoke Test

- `https://<staging-domain>/api/health`
- `https://<staging-domain>/docs`
- `https://<staging-domain>/login`
- 테스트 계정: `test.user@example.com / password123`

필수 플로우:

- 로그인 성공/실패
- 정책 목록 검색/필터
- 정책 상세 진입
- 정책 저장/삭제
- 일정 생성
- 일정 삭제
- 정책을 일정에 담기
- 초대 수락 링크 진입
- 로그아웃

## 완료 기준

- Required Inputs가 모두 준비됐다.
- `deploy/.env.staging`이 VPS에만 생성됐다.
- Caddy HTTPS가 정상 발급됐다.
- smoke test가 외부 URL에서 통과했다.
- 결과가 `docs/release-candidate-handoff.md`와 `CHECKLIST.md`에 기록됐다.
