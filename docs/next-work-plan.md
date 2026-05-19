# Travel Hunter 다음 작업 우선순위

## 기준

- 기준일: 2026-05-19
- 기준 검증 커밋: `f6fce98 docs: consolidate project documentation and validation`
- 브랜치: `feat/prototype-to-react`
- 원격 상태: `develop` 대상 PR 게시 후 GitHub Actions와 review 단계로 넘기는 기준이다.
- 기준 상태: MyPage 콘텐츠 보강, 문서 핵심화, DB schema current 문서화, frontend refactor 검증이 완료된 PR 준비 상태다.

## 최근 완료

- 문서 산출물을 핵심 문서와 `docs/deployment-cicd/` 기준으로 정리했다.
- DB schema 기준을 `docs/db-schema-current.md`, `docs/db-schema-current.sql`로 교체했다.
- frontend itinerary page를 개별 page 파일로 분리하고 기존 route import를 유지했다.
- 정책 상세 CTA가 `신청하러 가기`, `공식 안내 확인`, `신청 링크 준비 중`으로 분리됐다.
- 정책 JSON URL validation이 `localhost`, `127.0.0.1`, `example.*`, 빈 문자열, 잘못된 scheme을 잡도록 강화됐다.
- `/home` 인기 국내 여행지 rail이 정책 데이터 기반으로 생성되고 가짜 별점 문구를 제거했다.
- `/mypage` 신청 정책 카운트가 `GET /api/me/applied-policies`에 연결됐다.
- `/mypage`와 정책 목록/상세의 즐겨찾기 상태가 `SessionProvider.savedSlugs` 기준으로 동기화됐다.
- 미사용 untracked 후보였던 `TripCreateModal.tsx`, `TripItinerary.tsx`는 현재 route/import와 연결되지 않는 임시 파일로 판단해 정리했다.
- `/mypage` 공지사항/FAQ, 이용약관, 개인정보처리방침 sheet 콘텐츠를 실제 서비스 안내 수준으로 보강했다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | GitHub Actions CI와 review | PR CI가 통과하고, 실패 시 같은 브랜치에서 원인을 수정한다. |
| 2 | `develop` merge 준비 | 삭제 문서 참조, secret/env/archive 추적, API/DB schema drift가 없는 상태로 review를 요청한다. |
| 3 | Cloudflare Tunnel staging 준비 | 실제 env 값이 준비됐는지 확인하고, 준비되지 않은 항목은 release handoff에 보류 사유로 남긴다. |
| 4 | Cloudflare Tunnel actual env full-up | 실제 `deploy/.env.tunnel` 값으로 migration, seed, compose up, `/api/health` smoke가 통과한다. |
| 5 | SMTP password reset staging smoke | 실제 SMTP provider와 HTTPS staging URL로 reset email 수신, token confirm, 새 비밀번호 로그인이 통과한다. |
| 6 | Kakao/Google OAuth provider smoke | provider console redirect URI와 runtime env를 맞춘 뒤 실제 social login callback과 session 복구가 통과한다. |
| 7 | 홈 추천 목적지 ranking 고도화 | 정책 기반 목적지 추천에 마감 임박, 혜택 금액, 사용자 프로필 지역 가중치 같은 기준을 명확히 적용한다. |
| 8 | 전화번호 OTP 설계/구현 | 알림 수신 전화번호의 실제 검증 흐름과 `phone_verified_at` 갱신 기준을 확정한다. |

## 기능 개발 후보

- 홈 추천 목적지 ranking 기준 고도화.
- 정책 신청 URL 데이터 품질 보강.
- 정책 신청 상태 모델 확장.
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
npm test
npm run build
npm run test:e2e

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
rg -n "<stale-reference-pattern>" docs README.md PLANS.md CHECKLIST.md .agent
```

## Guardrails

- Runtime mock mode를 다시 추가하지 않는다.
- 실제 secret/env 값은 repo에 기록하지 않는다.
- API DTO는 `camelCase`, DB column은 `snake_case`를 유지한다.
- 현재 route URL과 DB-backed source of truth를 유지한다.
