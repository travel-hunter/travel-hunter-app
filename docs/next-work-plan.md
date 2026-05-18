# Travel Hunter 다음 작업 우선순위

## 기준

- 기준일: 2026-05-18
- 기준 커밋: `239f09d fix: disable apply button when no application url`
- 브랜치: `feat/prototype-to-react`
- 원격 상태: `origin/feat/prototype-to-react` 대비 `ahead 1`
- worktree: tracked 변경 없음

## 완료된 최근 작업

- `/mypage` 빈 즐겨찾기 EmptyState 개선.
- `/mypage` FAQ/이용약관/개인정보처리방침 sheet 추가.
- 정책 상세 하트 저장 상태를 정책별 `savedSlugs` 기준으로 동기화.
- `/mypage` 신청 정책 카운트를 `GET /api/me/applied-policies`로 연결.
- `/home` 인기 국내 여행지를 정책 데이터 기반으로 동적 생성.
- 정책 신청 URL이 없을 때 신청 버튼을 비활성화.
- Docker frontend/backend/db rebuild 및 로컬 접속 확인.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | 현재 명세 문서 최신화 변경분 커밋 및 `origin/feat/prototype-to-react` push | 최신 기준 커밋과 다음 우선순위가 문서에 반영되고 원격 브랜치가 최신 커밋을 포함한다. |
| 2 | 정책 신청 URL 품질 점검 | seed/API 정책의 `applyUrl`, `officialUrl` 상태를 점검하고, 신청 가능한 정책과 준비 안내 정책의 CTA가 명확히 분리된다. |
| 3 | 공지사항/FAQ 실제 콘텐츠 보강 | 마이페이지 sheet의 임시 안내를 실제 서비스 안내 문구로 정리한다. |
| 4 | Cloudflare Tunnel actual env full-up | 실제 `deploy/.env.tunnel` 값으로 migration, seed, compose up, `/api/health` smoke가 통과한다. |
| 5 | SMTP password reset staging smoke | 실제 SMTP provider와 HTTPS staging URL로 reset email 수신, token confirm, 새 비밀번호 로그인이 통과한다. |
| 6 | Kakao/Google OAuth provider smoke | provider console redirect URI와 runtime env를 맞춘 뒤 실제 social login callback과 session 복구가 통과한다. |
| 7 | 전화번호 OTP 설계/구현 | 알림 수신 전화번호의 실제 검증 흐름과 `phone_verified_at` 갱신 기준을 확정한다. |

## 기능 개발 후보

- 정책 신청 URL 품질 점검과 신청 가능/준비 중 CTA 문구 정리.
- 공지사항/FAQ/이용약관/개인정보처리방침 콘텐츠 고도화.
- 홈 추천 목적지 ranking 기준 고도화.
- 신청 정책 상태 모델 확장.
- 전화번호 OTP 요청/확인 API와 UI.
- PWA service worker 1차 적용 여부 결정.

## 운영 검증 후보

- Cloudflare Tunnel named tunnel full-up.
- public HTTPS 기준 `/login`, `/policies`, `/trips`, `/mypage` smoke.
- SMTP password reset staging smoke.
- Kakao/Google OAuth staging smoke.
- SOLAPI Kakao AlimTalk 실제 발송 smoke.

## Fast Lane

```powershell
cd frontend
npm run typecheck
npm test -- --run
npm run build

cd ..\backend
python -m pytest
```

Migration이 바뀌면 추가로 실행한다.

```powershell
cd backend
alembic upgrade head --sql
```

문서만 변경한 경우에는 아래를 기본 검증으로 둔다.

```powershell
git diff --check
git status --short --branch
```

## Guardrails

- Runtime mock mode는 다시 추가하지 않는다.
- 실제 secret/env 값은 repo에 기록하지 않는다.
- API DTO는 `camelCase`, DB column은 `snake_case`를 유지한다.
- Frontend는 backend boundary를 `AppDataApi`로 유지한다.
- Backend route는 얇게 두고 business rule은 service/repository 계층에 둔다.
