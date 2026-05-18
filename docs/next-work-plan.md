# Travel Hunter 다음 작업 우선순위

## 기준

- DB-backed-only 원칙을 유지한다.
- Runtime mock mode는 다시 추가하지 않는다.
- 기능 변경 시 API 계약, frontend type, backend schema/test를 함께 갱신한다.
- 실제 secret/env 값은 repo에 기록하지 않는다.
- 기준 스냅샷: `7b8fec0` (feat: refresh frontend UX from prototype) 이후 현재 worktree의 랜딩 제거와 프로토타입 로그인 첫 화면 클론까지 포함한다.
- 브랜치 상태: `feat/prototype-to-react`가 `origin/feat/prototype-to-react` 대비 `ahead 7`이며, 현재 랜딩 제거/로그인 화면 변경분은 커밋 전이다.

## 완료된 최근 작업

- 일정 장소 추가/수정/삭제.
- 일정 장소 드래그앤드롭 순서/날짜 이동.
- `/trips` 일정 확정 상태 저장: `draft -> confirmed` 저장 버튼과 `trips.status` persistence.
- 마이페이지 프로필 편집.
- AI 추천 결과를 일정 타임라인에 추가.
- 초대 role 저장과 viewer/editor 편집 권한 enforcement.
- 마감 알림 설정, 연락처 저장, 대상 계산, scheduler, SOLAPI adapter, retry, webhook 추적.
- 버튼 audit 기반 수정:
  - 비밀번호 재설정 flow.
  - Kakao/Google OAuth flow.
  - 정책 링크 복사.
  - 필요 서류 static checklist.
  - 친구 초대 링크 활성화 문구.
  - AI 추천 기준 sheet.
- 일단체크인 벤치마크 분석 문서화.
- Production sourcemap 비공개 명시.
- PWA manifest/meta 1차 적용.
- 프로젝트 구조 audit 문서화.
- Web Share API 공유 fallback.
- 같은 네트워크 개발 서버 공유용 LAN runbook 문서화.
- Password reset SMTP smoke runbook 문서화와 local SMTP capture E2E 확인.
- 구현 기능명세서 문서화.
- Codex 모델 실행 스크립트 호환성 수정과 기준점 커밋.
- `vite preview` tunnel/staging host allowlist 수정.
- OAuth start/callback local preflight 확인.
- Cloudflare Quick Tunnel frontend `/login` 200 확인.
- 작성 중 draft autosave 1차 구현:
  - `/trips/new` 일정 생성 draft.
  - `/trips/:id` 장소 추가 draft.
- Draft autosave 2차 범위 검토:
  - 다음 구현 후보는 장소 수정 draft로 제한한다.
  - 마이페이지 프로필 draft는 보류하고 연락처 draft는 개인정보 저장 위험 때문에 제외한다.
- 장소 수정 draft autosave 구현:
  - `/trips/:id` 장소 수정 sheet의 `time`, `label`, `meta` draft를 `placeId` 기준으로 저장한다.
  - 저장 성공, 닫기, 장소 삭제 시 edit draft를 삭제한다.
- PWA service worker/offline 전략 검토:
  - 현재는 service worker를 추가하지 않는다.
  - 후속 구현 시 static shell/assets만 캐시하고 `/api/*`와 auth/reset/OAuth 데이터는 캐시하지 않는다.
- 프로토타입 기반 frontend UX 개편:
  - 업로드 HTML 프로토타입의 모바일 앱형 흐름을 실제 React 앱에 반영했다.
  - 홈 대표 혜택 hero, 정책 상세 혜택 패키지, 일정 상세 혜택 묶음, 공통 배경/카드/태그 톤을 정리했다.
  - backend API, DB schema, route URL은 변경하지 않았다.
- 랜딩 제거와 프로토타입 로그인 첫 화면 클론:
  - `/`는 온보딩 없이 프로토타입 로그인 화면을 렌더링한다.
  - `/onboarding`은 `/login`으로 redirect한다.
  - 실제 email/password login, password reset, signup, Kakao/Google OAuth는 유지한다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | 랜딩 제거와 프로토타입 로그인 첫 화면 변경분 커밋 | frontend typecheck/test/build와 `git diff --check` 결과를 함께 기록하고 기준점 고정 |
| 2 | `deploy/.env.tunnel` 실제값 확보 + Cloudflare Tunnel full-up | 실제 `CLOUDFLARE_TUNNEL_TOKEN`, DB password, `DATABASE_URL`, staging domain으로 compose tunnel migration/seed/up 성공 |
| 3 | 외부 HTTPS 핵심 smoke + visual QA | staging URL에서 `/api/health`, `/login`, `/policies`, `/trips` 접근과 테스트 계정 로그인을 확인하고 390/1024/1440 viewport에서 핵심 화면을 확인 |
| 4 | 실제 SMTP provider password reset staging smoke | SMTP env와 public HTTPS base URL을 주입해 reset email 발송, 링크 진입, password confirm을 외부 URL 기준으로 확인 |
| 5 | Kakao/Google OAuth provider console smoke | provider console redirect URI와 env 값을 맞추고 실제 social login callback/refresh를 확인 |
| 6 | 전화번호 OTP 설계/구현 | Kakao AlimTalk 수신 연락처 실소유 검증 |
| 7 | PWA service worker 1차 구현 여부 결정 | 인증/API 데이터를 캐시하지 않는 static shell/assets 전용 service worker 도입 여부 확정 |

## 구조 정리 참고

- 구조 점검 결과는 `docs/project-structure-audit.md`를 따른다.
- 프론트 기능 추가 후보는 `docs/frontend-feature-work-plan.md`를 따른다.
- route/page 파일 분리는 현재 우선순위에서 제외한다.
- 로컬 산출물 정리는 기능 작업과 분리해서 진행한다.

## 후순위 후보

- PWA service worker 1차 구현 여부 확정 및 적용.
- 정책 실시간 수집/검색 API 확장 여부 검토.
- 실제 AI 추천 엔진 연동 범위 정리.
- 친구 초대 외부 발송(email/SMS/Kakao) 확장 범위 정리.

## Fast Lane

```powershell
cd frontend
npm run typecheck
npm test

cd ..\backend
python -m pytest
```

Migration이 바뀌면 추가로 실행한다.

```powershell
cd backend
alembic upgrade head --sql
```

## Release Gate

```powershell
cd frontend
npm run build
npm run test:e2e

cd ..
docker compose -f compose.yaml config
docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config
docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config
```
