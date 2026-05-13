# Travel Hunter Frontend Feature Work Plan

## 기준

- 기준 커밋: `a927ac4 docs: analyze prototype UX flow` 이후 현재 worktree의 프로토타입 기반 frontend UX 개편까지 포함한다.
- 현재 브랜치: `feat/prototype-to-react`, `origin/feat/prototype-to-react` 대비 `ahead 6`.
- 목적: 배포 smoke 이후 이어서 진행할 frontend 기능 추가 후보를 정리한다.
- API, DB schema, route 구조는 이 문서 작성 단계에서 변경하지 않는다.
- `frontend/src/pages`의 현재 기능군 단위 파일 구조는 유지한다.

## 현재 Frontend 구조

```text
frontend/src/api         backend API boundary and frontend data types
frontend/src/app         app root, router, session provider
frontend/src/components  reusable UI, layout, cards
frontend/src/data        static display constants
frontend/src/pages       route-level screen components
frontend/src/styles      global CSS, tokens, app styles
frontend/src/test        test helpers
frontend/src/utils       share, draft storage utilities
```

주요 route:

- Public: `/`, `/onboarding`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/oauth/callback`.
- Protected setup: `/nickname-setup`, `/profile-setup`.
- Service: `/home`, `/policies`, `/policies/:policyId`, `/trips`, `/trips/new`, `/trips/:tripId`, `/ai-results`, `/friend-invite`, `/invites/:inviteToken/accept`, `/mypage`.

## 작업 순서 원칙

1. 먼저 Cloudflare Tunnel full smoke를 통과시킨다.
2. Smoke 중 발견되는 frontend 결함은 feature backlog보다 우선 수정한다.
3. 새 API 없이 가능한 frontend-only 기능부터 진행한다.
4. 기존 API를 재사용하는 기능은 두 번째로 진행한다.
5. 새 API/DB가 필요한 기능은 별도 backend 계획을 세운 뒤 진행한다.

## 바로 가능한 Frontend-Only 후보

| 우선순위 | 작업 | 대상 화면 | 이유 | 성공 기준 |
|---:|---|---|---|---|
| Done | 정책 상세 조건 확인 요약/FAQ | `/policies/:slug` | `Travel-Hunter.zip`의 정책 상세 A/B 프로토타입에서 가져온 적용 후보. | 신청 가능 확정 표현 없이 조건 요약과 FAQ accordion을 제공한다. |
| Done | Draft 복원 안내/폐기 UX | `/trips/new`, `/trips/:id` 장소 sheet | 현재 draft는 자동 복원되지만 사용자가 복원 여부를 명시적으로 알기 어렵다. | 유효 draft가 있으면 "작성 중이던 내용을 불러왔어요" 안내와 "버리기" 액션을 제공한다. |
| Done | 일정 상세 DnD affordance 보강 | `/trips/:id` | 드래그앤드롭 기능은 있으나 모바일 사용자가 드래그 가능성을 더 쉽게 알아야 한다. | 드래그 핸들, 드롭 가능 Day 탭, 이동 중 상태가 명확히 보인다. |
| Done | Loading/empty/error state 통일 | `/policies`, `/trips`, `/mypage` | 데이터 로딩과 빈 상태 표현이 화면별로 다를 수 있다. | 공통 empty/error 패턴을 적용하고 주요 CTA를 함께 제공한다. |
| Done | 정책 목록 카테고리 인터리빙 | `/home`, `/policies` | 벤치마크에서 얻은 개선 후보로, 정책 탐색 피로도를 줄일 수 있다. | 추천/마감/유형별 탐색 블록과 홈 정책 레일을 제공한다. |
| Done | 프로토타입 기반 앱 UX 개편 | `/home`, `/policies/:slug`, `/trips/:id`, app shell | 업로드 HTML 프로토타입의 모바일 앱형 흐름을 실제 DB-backed React 앱에 반영한다. | 홈 대표 혜택 hero, 정책 상세 혜택 패키지, 일정 상세 혜택 묶음, 공통 카드/태그 톤을 적용하고 기존 기능을 유지한다. |
| P2 | PWA service worker 1차 | app shell | 설치 메타데이터는 완료됐고, offline shell은 후속 후보로 남아 있다. | `/api/*`, auth/reset/OAuth 데이터는 캐시하지 않고 static shell/assets만 캐시한다. |

## 기존 API 재사용 후보

| 우선순위 | 작업 | 기존 API | 이유 | 성공 기준 |
|---:|---|---|---|---|
| P1 | 저장 정책 quick filter | `GET /api/me/saved-policies`, `GET /api/policies` | 사용자가 저장한 정책만 빠르게 다시 찾을 수 있다. | `/policies`에서 저장됨 필터를 켜면 저장 정책만 남는다. |
| P1 | 일정 카드 세부 상태 강화 | `GET /api/trips`, `PATCH /api/trips/{id}/status` | draft/confirmed 상태가 생겼으므로 목록에서 다음 행동을 더 명확히 안내할 수 있다. | draft는 확정 CTA, confirmed는 다음 마감/장소 수/초대 상태를 보여준다. |
| P2 | 마이페이지 알림 상태 요약 보강 | `GET /api/me/notification-settings`, `GET /api/me/contact` | 연락처와 알림 설정이 분리되어 있어 발송 가능 상태가 한눈에 보이지 않는다. | "알림 준비 완료/연락처 필요/알림 꺼짐" 상태를 표시한다. |
| P2 | 초대 링크 공유 UX 보강 | `GET/POST /api/trips/{id}/invite` | 외부 발송은 없지만 링크 공유 흐름은 더 명확히 만들 수 있다. | 링크 활성화, 권한, 복사/공유 성공 상태가 한 영역에서 관리된다. |

## 새 API/DB가 필요한 후보

| 우선순위 | 작업 | 필요한 backend 변경 | 비고 |
|---:|---|---|---|
| P1 | 전화번호 OTP | OTP request/confirm endpoint, OTP table | 알림톡 실제 발송 전 연락처 실소유 검증에 필요하다. |
| P2 | 실제 지도/장소 검색 | Kakao Local/Maps adapter, place search endpoint | 일정 장소 입력 품질 개선. |
| P2 | 친구 초대 외부 발송 | email/SMS/Kakao send endpoint와 delivery history | 현재는 링크 생성/공유까지만 지원한다. |
| P3 | 실제 AI 추천 엔진 | recommendation job/provider/service | 현재 seed/result 기반 추천을 대체한다. |

## 권장 첫 Frontend 구현

프로토타입 기반 frontend UX 개편 변경분을 커밋한 뒤 다음 frontend-only 구현 후보는 `PWA service worker 1차 여부 결정`으로 둔다. 단, 정식 Cloudflare Tunnel full smoke와 visual QA가 끝나기 전에는 service worker를 추가하지 않는다.

이유:

- 새 API가 필요 없다.
- 이미 PWA manifest/meta는 적용되어 있어 app shell offline 전략만 남아 있다.
- 인증/API 데이터를 캐시하지 않는 조건을 지키면 범위를 작게 유지할 수 있다.
- 테스트 범위가 frontend Vitest/typecheck/build로 제한된다.

예상 변경:

- service worker 등록 여부와 캐시 제외 기준 확정.
- `/api/*`, auth/reset/OAuth route/data를 캐시하지 않는 static asset-only 캐시 구현.
- manifest/meta와 충돌하지 않는 update 전략 문서화.
- frontend build 산출물에서 service worker 파일 확인.

검증:

```powershell
cd frontend
npm run typecheck
npm test
npm run build

cd ..
git diff --check
```

## 제외 범위

- 배포 smoke 전에는 PWA service worker를 추가하지 않는다.
- 인증 token, reset token, 비밀번호, OAuth state, 전화번호 인증값은 localStorage draft에 저장하지 않는다.
- route/page 파일 재분리는 이번 frontend 기능 추가와 섞지 않는다.
- API/DB 변경이 필요한 기능은 별도 계획 없이 frontend만 먼저 만들지 않는다.
