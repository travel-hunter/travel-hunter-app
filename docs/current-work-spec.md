# Travel Hunter 현재 작업 명세

## 기준

- 기준일: 2026-05-20
- 기준 검증 기준: `9bdcb73` 및 현재 문서 작업트리
- 브랜치: `develop`
- 원칙: DB-backed-only MVP를 유지하고 runtime mock mode는 다시 추가하지 않는다.
- 현재 단계: PR #17, #18, #19, #20, #23이 `develop`에 합류했고, trip route alias 정리와 release handoff를 마친 뒤 staging 운영 검증 준비 상태다.

## 제품 범위

Travel Hunter는 여행 지원 정책을 탐색하고, 관심 정책을 저장하고, 여행 일정과 연결해 신청 준비 흐름을 돕는 모바일 앱형 웹 서비스다.

현재 구현은 다음 기준을 따른다.

- 인증, 정책, 일정, 마이페이지, 초대, 알림 설정은 FastAPI/PostgreSQL에 연결된다.
- frontend는 React/Vite 기반이며, `AppDataApi`를 API 경계로 사용한다.
- backend는 `api/core/db/models/repositories/schemas/services` 계층을 유지한다.
- Docker local과 Cloudflare Tunnel 중심 배포 산출물이 존재한다.
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
- 일정 route handle은 numeric string `Trip.id`만 지원하며 non-numeric handle은 not found로 처리한다.
- AI 추천 장소를 일정 타임라인에 추가.
- 초대 링크 role 저장과 viewer/editor 권한 enforcement.
- 마감 알림 설정, 연락처 저장, 알림 대상 계산, scheduler/provider/retry/webhook 기반.
- MyPage 신청 정책 카운트 `GET /api/me/applied-policies`.
- MyPage/PolicyList/PolicyDetail 즐겨찾기 상태 `SessionProvider.savedSlugs` 동기화.
- PWA manifest/meta, production sourcemap 비공개, Web Share API fallback.
- Prototype 기반 모바일 앱형 UX 적용.

## 최근 작업

- 정책 신청 URL 품질 점검과 MyPage 정보 콘텐츠 보강은 검증된 기준점으로 고정됐다.
- docs 루트 문서를 핵심 문서 중심으로 줄이고, 배포/CICD 문서는 `docs/deployment-cicd/` 기준으로 모았다.
- DB schema 기준을 `docs/db-schema-current.md`, `docs/db-schema-current.sql`로 교체하고 구버전 schema SQL 참조를 정리했다.
- frontend itinerary 관련 page를 개별 파일로 분리하면서 기존 route import를 유지했다.
- `.agent/evals`는 machine-readable API contract 기준인 `api-contract-golden.json`만 남겼다.
- PR #17, #18, #19, #20, #23이 `develop`에 병합됐고 로컬/원격 `develop` 기준으로 문서/계약 정합성을 다시 맞췄다.
- 기존 non-numeric 제주 3일 trip handle 지원을 제거하고, seed 여행 데이터는 유지한 채 API 계약과 frontend/backend 테스트를 numeric trip id 기준으로 갱신했다.
- 외주/인프라 담당자용 staging 운영 검증 작업지시서를 `docs/deployment-cicd/staging-ops-work-orders.md`로 추가했다.
- 여행가는 달 지역 여행할인 모아보기 외부 수집 기반을 추가해 공식 출처 레코드 저장, 원문 보존, 파생 지역/상태/혜택/선호도 필드를 지원한다. 현재 공식 live HTML의 목록/상세 modal 구조는 58건 fetch/parse/upsert smoke로 검증했다.
- `external_source_records` 기반 지역 추천 API는 신청 가능 혜택 수, 마감 임박, 명시 금액, 취향 보조 점수, 프로필 지역 최종 tie-breaker를 사용해 지역/목적지 추천 후보를 반환한다.

## 현재 조건부 항목

- SMTP password reset staging smoke는 실제 SMTP provider env와 public HTTPS domain이 필요하다.
- Kakao/Google OAuth 실로그인은 provider console redirect URI와 secret 설정이 필요하다.
- Cloudflare named tunnel full-up은 실제 `CLOUDFLARE_TUNNEL_TOKEN`, staging domain, DB/env 값이 필요하다.
- SOLAPI 실제 발송은 SOLAPI 계정, Kakao business channel, 승인 템플릿, secret env가 필요하다.
- 전화번호 OTP 실인증 foundation은 dev/test provider boundary, env-gated SOLAPI SMS provider, hashed OTP 저장, 요청/확인 API, MyPage UI까지 구현됐다. 실제 발송 smoke는 운영 env 준비 후 진행한다.

## 문서 역할

- `docs/requirements.md`: 제품 요구사항.
- `docs/implemented-feature-spec.md`: 실제 구현 기능 명세.
- `docs/mvp-api-contract.md`: API 계약.
- `docs/current-work-spec.md`: 현재 구현 상태 요약.
- `docs/next-work-plan.md`: 다음 작업 우선순위.
- `docs/deployment-cicd/README.md`: 팀 배포/CICD 기준 문서.
- `docs/deployment-cicd/09-release-checklist.md`: 배포 전후 smoke와 rollback 체크리스트.
- `docs/deployment-cicd/staging-ops-work-orders.md`: 비개발자/외주/인프라 담당자용 남은 운영 검증 작업지시서.

## 최신 검증 기록

- Frontend typecheck: passed.
- Frontend Vitest: `82 passed`.
- Frontend e2e: `4 passed`.
- Frontend build: passed.
- Backend schema pytest: `2 passed`.
- Backend pytest: `218 passed`.
- Alembic offline SQL: passed.
- Compose config/build checks: passed.
- `git diff --check`: passed.
- 삭제 문서 참조, stale trip alias 참조, secret/env/archive 추적 확인: passed.

## 다음 작업 방향

1. 실제 env가 준비되면 Cloudflare Tunnel actual env full-up, public route smoke, SMTP staging smoke, OAuth provider smoke 순서로 운영 검증을 진행한다.
2. SOLAPI Kakao AlimTalk staging smoke는 provider 계정, channel, 승인 템플릿, webhook secret 준비 후 진행한다.
3. 운영 검증 대기 중 기능 개발을 계속할 경우 전화번호 OTP 실제 발송 smoke와 live collector 정기 수집 운영 모니터링을 별도 의뢰로 진행한다.
