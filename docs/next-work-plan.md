# Travel Hunter 다음 작업 우선순위

## 기준

- DB-backed-only 원칙을 유지한다.
- Runtime mock mode는 다시 추가하지 않는다.
- 기능 변경 시 API 계약, frontend type, backend schema/test를 함께 갱신한다.
- 실제 secret/env 값은 repo에 기록하지 않는다.

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
- Password reset SMTP smoke runbook 문서화와 local preflight 확인.
- 구현 기능명세서 문서화.
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

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Password reset SMTP staging smoke | SMTP env와 public HTTPS base URL을 주입해 reset email 발송, 링크 진입, password confirm을 외부 URL 기준으로 확인 |
| 2 | Kakao/Google OAuth staging smoke | provider console redirect URI와 env 값을 맞추고 실제 social login callback/refresh를 확인 |
| 3 | Cloudflare Tunnel staging smoke | 외부 HTTPS URL에서 `/api/health`, 로그인, 정책/일정 핵심 흐름 확인 |
| 4 | 전화번호 OTP 설계/구현 | Kakao AlimTalk 수신 연락처 실소유 검증 |
| 5 | PWA service worker 1차 구현 | staging smoke 이후 static shell/assets only 정책으로 구현 여부 결정 |

## 구조 정리 참고

- 구조 점검 결과는 `docs/project-structure-audit.md`를 따른다.
- route/page 파일 분리는 현재 우선순위에서 제외한다.
- 로컬 산출물 정리는 기능 작업과 분리해서 진행한다.

## Current Priority Override

| Priority | Work | Success criteria |
|---:|---|---|
| 1 | Commit and push current pending changes | Fix one clean baseline for signup/nickname flow, Codex model workflow scripts, and matching docs/evals |
| 2 | Password reset SMTP staging smoke | Inject SMTP env and public HTTPS base URL, then verify reset email, link entry, and password confirm |
| 3 | Kakao/Google OAuth staging smoke | Align provider redirect URI/env values and verify real social login callback/refresh |
| 4 | Cloudflare Tunnel staging smoke | Verify `/api/health`, login, policies, and trips through the external HTTPS URL |
| 5 | Phone OTP design/implementation | Verify ownership of the Kakao AlimTalk destination contact |

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
