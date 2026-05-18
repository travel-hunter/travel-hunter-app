# Travel Hunter 현재 작업 명세

## 기준

- 기준일: 2026-05-18
- 기준 커밋: `3f3924a fix: clarify policy application cta links`
- 브랜치: `feat/prototype-to-react`
- 원칙: DB-backed-only MVP를 유지하고 runtime mock mode는 다시 추가하지 않는다.
- 현재 단계: 정책 URL 품질 점검과 마이페이지 정보 콘텐츠 보강을 완료했고, 변경분 검증/커밋 전 상태다.

## 제품 범위

Travel Hunter는 여행 지원 정책을 탐색하고, 관심 정책을 저장하고, 여행 일정과 연결해 신청 준비 흐름을 돕는 모바일 앱형 웹 서비스다.

현재 구현은 다음 기준을 따른다.

- 인증, 정책, 일정, 마이페이지, 초대, 알림 설정은 FastAPI/PostgreSQL에 연결된다.
- frontend는 React/Vite 기반이며, `AppDataApi`를 API 경계로 사용한다.
- backend는 `api/core/db/models/repositories/schemas/services` 계층을 유지한다.
- Docker local, public VPS direct, Cloudflare Tunnel staging 산출물이 존재한다.
- 외부 secret이 필요한 SMTP/OAuth/SOLAPI/Cloudflare 실제 smoke는 env 준비 후 진행한다.

## 완료된 핵심 기능

- 이메일/비밀번호 회원가입과 로그인.
- 이메일 중복 확인 후 회원가입, `/nickname-setup` 닉네임 설정, 서버 추천 닉네임과 주사위 추천.
- Kakao/Google OAuth authorization code flow entry point.
- password reset request/confirm flow.
- 프로필 설정과 마이페이지 프로필 편집.
- 정책 목록, 카테고리/지역/기간/금액 필터, 정책 저장/해제.
- 정책 상세의 지원 내용, 신청 기간, 신청 대상, 필요 서류, 공유, 일정 담기.
- 정책 상세 CTA 분리:
  - `applyUrl`: `신청하러 가기`
  - `officialUrl`: `공식 안내 확인`
  - URL 없음: `신청 링크 준비 중`
- 정책 JSON validation:
  - shape, duplicate slug, deadline, encoding-risk marker 검사.
  - `officialUrl/applyUrl`의 localhost, placeholder, 잘못된 URL 차단.
- 일정 생성 3단계 UX, 동적 기본 날짜, draft autosave.
- 일정 목록, 삭제 dialog, draft/confirmed 상태 저장.
- 일정 상세 장소 추가/수정/삭제, 10분 단위 시간 스피너, 시간 없음 저장, drag-and-drop 이동.
- AI 추천 장소를 일정 타임라인에 추가.
- 초대 링크 role 저장과 viewer/editor 권한 enforcement.
- 마감 알림 설정, 연락처 저장, 알림 대상 계산, scheduler/provider/retry/webhook 기반.
- MyPage 신청 정책 카운트 `GET /api/me/applied-policies`.
- MyPage/PolicyList/PolicyDetail 즐겨찾기 상태 `SessionProvider.savedSlugs` 동기화.
- PWA manifest/meta, production sourcemap 비공개, Web Share API fallback.
- Prototype 기반 모바일 앱형 UX 적용.

## 최근 작업

- 정책 신청 URL 품질 점검을 완료하고 `3f3924a`로 커밋했다.
- `docs/next-work-plan.md`의 다음 우선순위를 FAQ/콘텐츠 보강 기준으로 갱신했다.
- import되지 않는 임시 untracked 파일 `TripCreateModal.tsx`, `TripItinerary.tsx`는 route와 연결되지 않고 깨진 문자열이 있어 정리했다.
- `/mypage`의 공지사항/FAQ, 이용약관, 개인정보처리방침 sheet 콘텐츠를 실제 서비스 안내 수준으로 보강했다.

## 현재 조건부 항목

- SMTP password reset staging smoke는 실제 SMTP provider env와 public HTTPS domain이 필요하다.
- Kakao/Google OAuth 실로그인은 provider console redirect URI와 secret 설정이 필요하다.
- Cloudflare named tunnel full-up은 실제 `CLOUDFLARE_TUNNEL_TOKEN`, staging domain, DB/env 값이 필요하다.
- SOLAPI 실제 발송은 SOLAPI 계정, Kakao business channel, 승인 템플릿, secret env가 필요하다.
- 전화번호 OTP 실인증은 아직 후속 설계/구현 범위다.

## 문서 역할

- `docs/requirements.md`: 제품 요구사항.
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

- Backend pytest: `218 passed`.
- Frontend Vitest: `74 passed`.
- Frontend typecheck: passed.
- Frontend build: passed.
- Alembic offline SQL: passed.
- `git diff --check`: passed.
- Policy data validation: passed.

## 다음 작업 방향

1. `/mypage` 공지사항/FAQ/이용약관/개인정보처리방침 콘텐츠 변경분을 커밋 가능한 기준점으로 고정한다.
2. 기능 개발 흐름을 계속할 경우 홈 추천 목적지 ranking 고도화를 진행한다.
3. 운영 검증 흐름으로 전환할 경우 Cloudflare Tunnel actual env full-up, SMTP staging smoke, OAuth provider smoke 순서로 진행한다.
