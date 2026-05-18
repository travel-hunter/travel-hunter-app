# Travel Hunter 현재 작업 명세

## 현재 기준

- 기준일: 2026-05-18
- 브랜치: `feat/prototype-to-react`
- 기준 커밋: `239f09d fix: disable apply button when no application url`
- 원격 상태: `origin/feat/prototype-to-react` 대비 `ahead 1`
- 작업 상태: tracked worktree clean
- 실행 모드: DB-backed-only MVP. Runtime mock mode는 제거된 상태를 유지한다.

Travel Hunter는 국내 여행 정책 탐색, 정책 저장/공유, 일정 생성/편집, 정책-일정 연결, 초대 협업, 마감 알림 기반을 제공하는 FastAPI/PostgreSQL 기반 MVP다. Frontend는 항상 `AppDataApi`를 통해 backend API를 호출하며, seed/demo 값은 운영 source of truth로 취급하지 않는다.

## 최근 완료 작업

- `/mypage` 빈 즐겨찾기 EmptyState 개선.
- FAQ, 이용약관, 개인정보처리방침을 마이페이지 인앱 sheet로 제공.
- 정책 상세 저장 하트 상태를 `savedSlugs` 기준으로 동기화.
- `/mypage` 신청 정책 카운트를 `GET /api/me/applied-policies` 기반으로 연결.
- `/home` 인기 국내 여행지 rail을 정책 제목/지역 기반으로 동적 생성하고, 가짜 별점 표시는 제거.
- 정책 신청 URL이 없을 때 신청 버튼을 비활성화하고 준비 안내를 유지.
- Docker frontend/backend/db rebuild 및 로컬 접속 확인.

## 구현 완료 범위

- Auth:
  - email/password 회원가입 및 로그인.
  - 이메일 중복 확인.
  - 닉네임 설정, 임시 닉네임 자동 생성, 주사위 추천.
  - refresh/logout/session 복구.
  - SMTP 기반 password reset request/confirm.
  - Kakao/Google OAuth authorization code flow.
- Profile/MyPage:
  - profile setup.
  - 닉네임/지역/스타일/예산 편집.
  - 저장 정책 목록, 빈 상태 안내, 삭제.
  - 신청 정책 카운트.
  - 알림 연락처 저장.
  - 마감 알림 설정 저장.
  - FAQ/약관/개인정보 sheet.
- Policies:
  - 목록, 상세, 검색, 카테고리/지역/기간/금액 필터.
  - 저장/해제와 세션 공유 상태 동기화.
  - 공유 링크 복사 및 Web Share API fallback.
  - 조건 확인 요약, 필요 서류 checklist, FAQ.
  - 신청 URL이 있는 정책은 외부 링크, 없는 정책은 비활성/준비 안내.
- Trips:
  - 일정 목록, 생성, 상세, 삭제.
  - `draft -> confirmed` 상태 저장.
  - 날짜 기반 일정 생성과 KST 기본 날짜 helper.
  - 정책 일정 담기.
  - 장소 추가/수정/삭제.
  - 방문 시간 10분 단위 spinner와 시간 없음 저장.
  - 장소 drag-and-drop 순서/날짜 이동.
  - 작성 중 draft autosave.
- AI recommendations:
  - 추천 결과 조회.
  - 추천 장소를 실제 `trip_places`에 저장.
  - 추천 기준 sheet.
- Invites:
  - 초대 링크 생성.
  - viewer/editor role 저장.
  - 초대 수락.
  - viewer 편집 제한 enforcement.
- Notifications:
  - 사용자 마감 알림 설정 저장.
  - 전화번호 저장.
  - `notification_deliveries` 발송 이력 기반.
  - D-7/D-1 target calculation service.
  - FastAPI 내부 scheduler.
  - SOLAPI Kakao AlimTalk provider adapter.
  - retry policy.
  - SOLAPI webhook delivery status tracking.
- Frontend UX:
  - 업로드 Prototype 기반 모바일 앱형 shell, bottom tab, 로그인 첫 화면, home/policy/trip/mypage 주요 화면 스타일 반영.
  - Prototype red theme 적용.
  - PWA manifest/meta와 icon 제공.
  - production sourcemap 비공개 명시.
- Dev/ops:
  - Docker local compose.
  - public VPS compose/Caddy 산출물.
  - Cloudflare Tunnel compose/Caddy 산출물.
  - LAN 개발 공유 runbook.
  - Codex model split workflow script/document.

## 주요 문서 역할

- `docs/requirements.md`: 공식 제품 요구사항.
- `docs/implemented-feature-spec.md`: 실제 구현 기능 명세.
- `docs/feature-implementation-status.md`: 기능별 완료/조건부/미구현 상태표.
- `docs/mvp-api-contract.md`: API 계약.
- `docs/current-work-spec.md`: 현재 구현 상태 요약.
- `docs/next-work-plan.md`: 다음 작업 우선순위.
- `docs/deployment-vps.md`: public VPS 직접 노출 runbook.
- `docs/deployment-tunnel.md`: NAT 제한 환경 Cloudflare Tunnel runbook.
- `docs/password-reset-smtp-smoke.md`: SMTP password reset smoke 절차.
- `docs/project-structure-audit.md`: 폴더/파일 구조 점검 기록.

## 최신 검증 기록

- Backend pytest: `184 passed`.
- Frontend Vitest: `72 passed`.
- Frontend typecheck: passed.
- Frontend build: passed.
- Alembic offline SQL: passed.
- `git diff --check`: passed.
- Docker frontend/backend/db rebuild: passed.
- 로컬 접속:
  - frontend: `http://127.0.0.1:4173/` 200.
  - backend health: `http://127.0.0.1:8000/api/health` 200, database connected.

## 현재 조건부 항목

- 실제 SMTP staging smoke는 SMTP provider env와 public HTTPS domain이 필요하다.
- Kakao/Google OAuth 실로그인은 provider console redirect URI와 secret 설정이 필요하다.
- Cloudflare named tunnel full-up은 실제 `CLOUDFLARE_TUNNEL_TOKEN`, staging domain, DB/env 값이 필요하다.
- SOLAPI 실제 발송은 SOLAPI 계정, Kakao business channel, 승인 템플릿, secret env가 필요하다.
- 전화번호 OTP 실인증은 아직 후속 설계/구현 범위다.

## 다음 작업 방향

1. 현재 명세 문서 최신화 변경분을 커밋하고 원격에 push한다.
2. 기능 개발 흐름을 계속할 경우 `정책 신청 URL 품질 점검` 또는 `공지사항/FAQ 실제 콘텐츠 보강`을 진행한다.
3. 운영 검증 흐름으로 전환할 경우 `Cloudflare Tunnel actual env full-up`, `SMTP staging smoke`, `OAuth provider smoke` 순서로 진행한다.
