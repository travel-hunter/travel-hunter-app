# Staging Ops Work Orders

## 현재 상황

Travel Hunter는 개발 검증이 끝난 `develop` 기준 staging smoke 후보 상태다. PR #23이 `develop`에 병합됐고, 로컬과 원격 `develop` 기준은 merge commit `9bdcb73`로 맞아 있다.

남은 일은 새 기능 개발이 아니라 실제 외부 환경에서 서비스가 열리고, 로그인/정책/일정/이메일/OAuth/알림톡이 정상 동작하는지 확인하는 운영 검증이다.

실제 `.env`, DB password, OAuth secret, SMTP password, SOLAPI secret, Cloudflare tunnel token은 repo, 문서, 채팅에 적지 않는다. 서버의 `deploy/.env.tunnel` 파일이나 provider console에만 보관한다.

## 진행 순서 요약

| 순서 | 작업 | 결과물 |
|---:|---|---|
| 1 | Cloudflare/domain/env 준비 | staging domain, tunnel token, host-only env 준비 |
| 2 | Staging 서버 기동 | Docker Compose 서비스 정상 실행, `/api/health` 통과 |
| 3 | Public HTTPS route smoke | public domain에서 핵심 화면과 로그인 흐름 확인 |
| 4 | SMTP smoke | 비밀번호 재설정 email 수신, 재설정, 새 비밀번호 로그인 확인 |
| 5 | OAuth smoke | Kakao/Google callback 후 로그인 세션 복구 확인 |
| 6 | SOLAPI AlimTalk smoke | 승인 템플릿 기준 발송, retry, webhook 상태 확인 |
| 7 | Jenkins CD 준비 | 수동 배포를 자동 배포로 전환할 계획과 job 준비 |
| 8 | 후속 기능 개발 의뢰 | 홈 추천 ranking, 전화번호 OTP의 제품 요구사항 확정 |

## OPS-01. Cloudflare/domain/env 준비

목적: staging 서비스를 외부 HTTPS 주소로 열 수 있게 domain, Cloudflare Tunnel, 서버 환경값을 준비한다.

담당자: 외주/인프라 담당자. 필요하면 Cloudflare 계정 소유자와 개발자가 함께 확인한다.

준비물:

- staging에 사용할 domain 또는 subdomain. 예: `staging.<domain>` 또는 `dev.<domain>`.
- Cloudflare 계정과 해당 domain 관리 권한.
- staging 서버 접속 권한.
- GitHub repo pull 권한.
- Docker와 Docker Compose 실행 가능 환경.
- DB password, `AUTH_SECRET_KEY`, `CLOUDFLARE_TUNNEL_TOKEN`.

실행 요청:

- Cloudflare에서 named tunnel을 만들고 staging hostname을 tunnel에 연결한다.
- staging 서버에서 repo를 받은 뒤 `deploy/.env.tunnel.example`을 `deploy/.env.tunnel`로 복사한다.
- `deploy/.env.tunnel`에 실제 값을 채운다. 최소 필수값은 `STAGING_DOMAIN`, `VITE_API_BASE_URL`, `CORS_ORIGINS`, `POSTGRES_*`, `DATABASE_URL`, `AUTH_SECRET_KEY`, `REFRESH_COOKIE_SECURE=true`, `TRAVEL_HUNTER_PUBLIC_BASE_URL`, `CLOUDFLARE_TUNNEL_TOKEN`이다.
- provider smoke 전까지 SMTP/OAuth/SOLAPI 값은 비워 두거나 비활성 상태로 둔다.

무엇을 확인하는 명령인지: 아래 명령은 실제 secret을 출력하지 않고 Compose 설정이 빠짐없이 만들어지는지만 확인한다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config
```

완료 증거:

- staging hostname.
- Cloudflare tunnel과 hostname 연결 상태 screenshot.
- `docker compose ... config` 성공 여부.
- 실제 값은 가린 env key 목록. 값 자체는 공유하지 않는다.

막히면 확인할 것:

- domain이 Cloudflare에서 관리되는지.
- tunnel token이 staging 서버에 정확히 들어갔는지.
- `VITE_API_BASE_URL`, `CORS_ORIGINS`, `TRAVEL_HUNTER_PUBLIC_BASE_URL`이 모두 같은 HTTPS domain을 가리키는지.

## OPS-02. Staging 서버 기동

목적: staging 서버에서 DB, backend, frontend, Caddy, Cloudflare Tunnel을 실제로 실행한다.

담당자: 외주/인프라 담당자. DB migration 오류가 나면 개발자에게 전달한다.

준비물:

- OPS-01 완료.
- staging 서버의 `deploy/.env.tunnel`.
- 빈 staging DB 또는 seed 실행을 허용한 staging DB.

실행 요청:

- Compose 설정을 다시 확인한다.
- 이미지를 build한다.
- DB를 먼저 띄운다.
- Alembic migration을 적용한다.
- staging 초기 확인용 seed를 실행한다.
- 전체 서비스를 띄운다.
- backend health와 container 상태를 확인한다.

무엇을 확인하는 명령인지: 아래 명령은 서버 시작부터 health check까지 한 번에 진행하는 표준 순서다.

```bash
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml ps
curl -fsS https://<staging-domain>/api/health
```

완료 증거:

- `docker compose ... ps`에서 `db`, `backend`, `frontend`, `caddy`, `cloudflared`가 실행 중인 화면.
- `https://<staging-domain>/api/health` 응답 성공.
- migration과 seed 성공 로그.

막히면 확인할 것:

- DB health check가 통과하는지.
- backend log에 `DATABASE_URL`, CORS, auth secret 관련 오류가 있는지.
- Cloudflare log에 tunnel 인증 또는 hostname 라우팅 오류가 있는지.

## OPS-03. Public HTTPS route smoke

목적: 실제 public HTTPS domain에서 사용자가 핵심 화면을 볼 수 있는지 확인한다.

담당자: QA 또는 외주/인프라 담당자. 화면 오류가 있으면 개발자에게 screenshot과 URL을 전달한다.

준비물:

- OPS-02 완료.
- seed 계정이 필요한 경우 seed 실행 완료.

실행 요청:

- 브라우저에서 staging domain을 연다.
- 아래 route가 빈 화면 없이 보이는지 확인한다.
- 로그인 성공과 실패 메시지를 모두 확인한다.
- 정책 저장, 일정 생성, 일정 상세 진입, 로그아웃까지 최소 1회 확인한다.

확인 route:

- `https://<staging-domain>/api/health`
- `https://<staging-domain>/login`
- `https://<staging-domain>/policies`
- `https://<staging-domain>/trips`
- `https://<staging-domain>/mypage`

Seed 계정이 있는 환경에서만 사용하는 테스트 계정:

```text
test.user@example.com / password123
```

완료 증거:

- 각 route screenshot.
- 로그인 성공 후 `/mypage` 진입 screenshot.
- 정책 목록/상세, 일정 목록/상세 screenshot.
- 실패한 항목이 있으면 URL, 시간, 브라우저, screenshot, 재현 순서.

막히면 확인할 것:

- 로그인 후 바로 `/login`으로 돌아가면 cookie secure, CORS, API base URL을 확인한다.
- 화면이 비면 frontend build arg `VITE_API_BASE_URL`과 allowed host를 확인한다.
- API만 실패하면 backend log와 `/api/health`를 먼저 확인한다.

## OPS-04. SMTP password reset smoke

목적: 사용자가 비밀번호 재설정 email을 받고 새 비밀번호로 로그인할 수 있는지 확인한다.

담당자: 외주/인프라 담당자와 SMTP 계정 소유자. 실패 원인은 개발자에게 backend log와 함께 전달한다.

준비물:

- 실제 SMTP host, port, username, password, from email.
- `TRAVEL_HUNTER_PUBLIC_BASE_URL=https://<staging-domain>`.
- password reset을 받을 테스트 email 계정.

실행 요청:

- `deploy/.env.tunnel`에 SMTP 값을 넣고 backend를 재시작한다.
- `/forgot-password`에서 테스트 email로 재설정을 요청한다.
- email 수신 여부를 확인한다.
- reset link를 열어 새 비밀번호를 설정한다.
- 새 비밀번호로 로그인한다.

완료 증거:

- SMTP 값은 가리고 env key가 들어갔다는 확인.
- 재설정 email 수신 시간과 발신자 screenshot.
- 새 비밀번호 로그인 성공 screenshot.

막히면 확인할 것:

- SMTP provider가 staging 서버 IP 또는 계정을 차단하지 않는지.
- `SMTP_FROM_EMAIL` domain이 provider 정책과 맞는지.
- reset link domain이 localhost가 아니라 staging HTTPS domain인지.

## OPS-05. Kakao/Google OAuth smoke

목적: 실제 provider 로그인에서 callback 후 앱 세션이 정상 유지되는지 확인한다.

담당자: 외주/인프라 담당자와 OAuth provider console 관리자.

준비물:

- Kakao client id/secret.
- Google client id/secret.
- Provider console에 등록할 redirect URI:
  - `https://<staging-domain>/api/auth/oauth/kakao/callback`
  - `https://<staging-domain>/api/auth/oauth/google/callback`
- `KAKAO_REDIRECT_URI`, `GOOGLE_REDIRECT_URI` env.

실행 요청:

- Kakao/Google console에 staging redirect URI를 등록한다.
- `deploy/.env.tunnel`에 OAuth 값을 넣고 backend를 재시작한다.
- `/login`에서 Kakao와 Google 로그인을 각각 1회 수행한다.
- callback 후 앱으로 돌아오고 `/home` 또는 로그인 후 화면에 머무르는지 확인한다.
- 새로고침 후에도 로그인 상태가 유지되는지 확인한다.

완료 증거:

- Provider console redirect URI screenshot. secret 값은 가린다.
- Kakao login 성공 screenshot.
- Google login 성공 screenshot.
- 새로고침 후 session 유지 screenshot.

막히면 확인할 것:

- Provider console redirect URI와 env redirect URI가 글자 단위로 같은지.
- callback URL이 `http`나 localhost가 아닌지.
- OAuth state cookie가 차단되지 않는지.

## OPS-06. SOLAPI Kakao AlimTalk smoke

목적: 정책 마감 알림 후보가 SOLAPI/Kakao AlimTalk으로 접수되고, 실패 시 retry와 webhook 상태 반영이 되는지 확인한다.

담당자: SOLAPI/Kakao channel 관리자, 외주/인프라 담당자, 개발자.

준비물:

- SOLAPI API key/secret.
- Kakao channel `pfId`.
- 승인된 D-7, D-1 AlimTalk template id.
- 발신 번호.
- `SOLAPI_WEBHOOK_SECRET`.
- staging domain에서 webhook을 받을 수 있는 public HTTPS 환경.

실행 요청:

- SOLAPI/Kakao console에서 승인된 템플릿과 channel 정보를 확인한다.
- `deploy/.env.tunnel`에 SOLAPI 값을 넣는다.
- staging에서는 SMS 대체 발송 비용을 피하기 위해 별도 승인 전까지 `SOLAPI_DISABLE_SMS=true`를 유지한다.
- 실제 발송 검증 시점에만 `KAKAO_ALIMTALK_ENABLED=true`와 필요한 scheduler 설정을 켠다.
- 개발자에게 테스트 알림 대상 데이터를 준비해 달라고 요청한다.
- 발송 요청, provider 접수, webhook 수신, 상태 갱신을 확인한다.

완료 증거:

- SOLAPI/Kakao console에서 발송 접수 또는 실패 상태 screenshot.
- backend log의 발송 요청과 webhook 처리 결과.
- webhook secret 값은 공유하지 않고, header 검증이 통과했는지만 기록.

막히면 확인할 것:

- Template id가 D-7/D-1 용도와 맞는지.
- Kakao channel `pfId`가 운영 중인 channel인지.
- SOLAPI webhook endpoint가 public HTTPS에서 접근 가능한지.
- 비용이 발생하는 SMS fallback이 의도치 않게 켜져 있지 않은지.

## OPS-07. Jenkins CD 준비

목적: 지금의 수동 Docker Compose 배포를 Jenkins job으로 자동화할 준비를 한다.

담당자: 인프라 담당자와 개발자.

준비물:

- Jenkins 설치 서버.
- GitHub repo read 권한.
- staging 또는 운영 서버 SSH 접근 권한.
- Docker Compose 실행 권한.
- Jenkins credentials 저장소.

실행 요청:

- `docs/deployment-cicd/08-jenkins-pipeline.md` 기준으로 Jenkins credential과 job을 설계한다.
- Secret은 Jenkins credentials 또는 서버 env 파일에만 둔다.
- 첫 목표는 staging 배포 자동화다. production/main 자동 배포는 별도 승인 후 진행한다.

완료 증거:

- Jenkins job 구성 screenshot.
- staging deploy dry run 또는 수동 승인형 deploy 성공 로그.
- 실패 시 rollback 기준 문서화.

막히면 확인할 것:

- Jenkins agent가 Docker 명령을 실행할 권한이 있는지.
- 서버 SSH key가 repo에 커밋되지 않았는지.
- PR/branch 보호 규칙과 배포 trigger가 충돌하지 않는지.

## 후속 기능 개발 의뢰

운영 검증과 별개로 개발팀에 의뢰할 수 있는 다음 기능이다. 외주/인프라 담당자가 직접 구현하지 않는다.

### DEV-01. 홈 추천 목적지 ranking 고도화

목적: 홈 화면의 추천 목적지를 더 납득 가능한 순서로 보여준다.

의뢰 전 확정할 것:

- ranking 기준: 마감 임박, 혜택 금액, 사용자 지역, 저장한 정책, 여행 선호도 중 무엇을 우선할지.
- 사용자에게 ranking 이유를 보여줄지.
- 데이터가 부족할 때 기본 순서를 어떻게 둘지.

완료 증거:

- 기획 기준 문서.
- 개발 PR.
- ranking 단위 테스트 또는 화면 테스트.

### DEV-02. 전화번호 OTP 설계/구현

목적: 알림을 받을 전화번호가 실제 사용자 번호인지 확인한다.

의뢰 전 확정할 것:

- OTP provider를 SOLAPI SMS로 할지 다른 인증 provider로 할지.
- 1일 발송 제한, 재전송 간격, 실패 횟수 제한.
- 인증 성공 시 `phone_verified_at` 갱신 기준.

완료 증거:

- API/UI 설계 문서.
- 개발 PR.
- 성공/실패/만료/재전송 테스트.

## 보고 양식

작업을 마친 담당자는 아래 양식으로 공유한다.

```text
작업 ID:
담당자:
실행 일시:
대상 domain:
성공한 항목:
실패한 항목:
첨부 증거:
secret 공유 여부: 공유하지 않음
추가 조치 필요:
```

## 중단 기준

- 실제 secret을 repo나 문서에 적어야만 진행할 수 있는 상황.
- production/main 배포가 필요한 상황.
- DB 데이터를 삭제하거나 되돌리는 조치가 필요한 상황.
- 유료 발송이 대량 발생할 수 있는 SOLAPI/SMS 설정 변경.
- public HTTPS health가 실패한 상태에서 provider smoke를 진행해야 하는 상황.
