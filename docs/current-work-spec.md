# Travel Hunter 현재 작업 명세

## 기준

- 기준일: 2026-05-23
- 기준 검증 기준: `9bdcb73` 및 현재 문서 작업트리
- 브랜치: `develop`
- 원칙: DB-backed-only MVP를 유지하고 runtime mock mode는 다시 추가하지 않는다.
- 현재 단계: `develop` 기준 통합 이후 공식 혜택 수집/승격, 더미 정책 삭제, 정책 분류/필터/상세 UI 보정, stale 문서·테스트 정합성 복구를 진행 중이다.

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
- 정책 목록, 카테고리/지역/기간/금액 필터, 정책 저장/해제. `/policies` 목록은 DB `policies` 레코드만 노출한다. active/fresh 공식 외부 혜택(`external_source_records`)은 collection normalization service가 `policies`로 승격하며, 승격된 정책은 `travelmonth-{externalSourceRecordId}` slug로 기존 상세 링크 호환성을 유지한다.
- 정책 상세의 지원 내용, 신청 기간, 신청 대상, 필요 서류, 공유, 일정 담기. TravelMonth 등 공식 수집 혜택은 정규화된 `policies` 레코드로 노출되므로 저장/일정 담기 action을 동일하게 지원한다.
- 정책 상세 CTA 분리:
  - `applyUrl`: `신청하러 가기`
  - `officialUrl`: `혜택 안내 보기`
  - URL 없음: `신청 링크 준비 중`
- 정책 JSON validation:
  - shape, duplicate slug, deadline, encoding-risk marker 검사.
  - `officialUrl/applyUrl`의 localhost, placeholder, 잘못된 URL 차단.
- 일정 생성 3단계 UX, 동적 기본 날짜, draft autosave.
- 일정 목록, 삭제 dialog, draft/confirmed 상태 표시. 목록 카드는 상태 변경 액션을 노출하지 않고 `benefit`, `confirmed`, `draft` 의미 기반 태그 톤으로 혜택/상태 배지를 표시한다.
- 일정 상세 장소 추가/수정/삭제, 10분 단위 시간 스피너, 시간 없음 저장, drag-and-drop 이동. `draft` 일정 상세는 owner/editor가 `확정하기`로 일정을 확정할 수 있고, 작성 중 상태 카드는 노랑 계열로 표시한다. `confirmed` 일정 상세는 초록 계열 상태 카드로 편집 잠금을 보여주고, owner/editor에게도 편집 컨트롤을 잠그며 `확정취소`로 `draft` 상태로 되돌린 뒤 다시 편집할 수 있다. 일정 상세의 추천 정책 카드는 backend `recommendedPolicies` 응답을 사용해 정규화된 정책과 TravelMonth 혜택 상세 페이지로 이동한다.
- 정책 `category`는 혜택/출처 유형인 `교통`, `숙박`, `여행상품`, `지역할인`, `이벤트`, `기타`만 사용한다. 외부 수집 혜택은 title/benefit/tags/source metadata를 점수화하는 deterministic classifier로 category를 정하고, `travelStyles`는 지역/일정 추천 보정용으로만 사용한다.
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
- legacy dummy policy(`local-vacation`, `sokcho-stay`, `busan-cashback`)는 runtime seed와 frontend fallback에서 제거했고, DB seed는 남아 있는 legacy row와 연결 row를 삭제한다.
- 정책 예시는 현재 수집/승격 데이터에 존재하는 `dgtour-밀양-1`을 기준으로 갱신했다.
- PolicyList/PolicyDetail/App 테스트는 삭제된 더미 정책에 의존하지 않도록 현재 수집 정책 또는 명시적 API mock fixture를 사용한다.
- 기존 non-numeric 제주 3일 trip handle 지원을 제거하고, seed 여행 데이터는 유지한 채 API 계약과 frontend/backend 테스트를 numeric trip id 기준으로 갱신했다.
- 외주/인프라 담당자용 staging 운영 검증 작업지시서를 `docs/deployment-cicd/staging-ops-work-orders.md`로 추가했다.
- 외부 혜택 수집은 여행가는 달 지역 여행할인, 여행가는 달 교통 혜택, 대한민국 반값여행 지역 혜택을 `external_source_records`에 저장한다. 공식 출처 레코드 저장, 원문 보존, 파생 지역/상태/혜택/선호도 필드를 지원하며, scheduler는 source별 fetch/parse 실패를 분리해 `success`, `partial_success`, `error` outcome을 남긴다. 운영 확인은 기존 `/api/health` 계약을 유지한 채 Bearer 인증이 필요한 `GET /api/ops/external-collection`에서 scheduler 상태를, `GET /api/ops/external-collection/quality`에서 source category별 저장 품질과 추천 반영 preview를 분리해 확인한다.
- `external_source_records` 기반 지역 추천 API는 신청 가능 혜택 수, 마감 임박, 명시 금액, 취향 보조 점수, 프로필 지역 최종 tie-breaker를 사용해 지역/목적지 추천 후보를 반환한다. 목적지 랭킹에는 `regional_benefit`과 `local_half_trip`만 반영하고, 전국 단위 성격의 `traffic_benefit`은 정책 목록/상세에는 노출하되 지역 추천 점수에서는 제외한다.
- active/fresh 외부 수집 레코드 중 `regional_benefit`, `traffic_benefit`, `local_half_trip`은 수집 직후 `policies`로 정규화 승격된다. `/api/policies` 및 `/api/policies/{policySlug}`는 사용자 노출 정책을 `policies` 기준으로 반환하며, 모든 노출 정책은 공식 혜택으로 동일하게 저장/일정 연결을 지원한다. `external_source_records`는 원문 근거, 품질 리포트, 지역 추천 집계의 source of evidence로 남긴다. 상세 조회에는 migration gap 대응용 raw fallback이 남아 있지만 목록/추천/사용자 action 경로는 정규화 정책을 사용한다.

## 현재 조건부 항목

- SMTP password reset staging smoke는 실제 SMTP provider env와 public HTTPS domain이 필요하다.
- Kakao/Google OAuth 실로그인은 provider console redirect URI와 secret 설정이 필요하다.
- Cloudflare named tunnel full-up은 실제 `CLOUDFLARE_TUNNEL_TOKEN`, staging domain, DB/env 값이 필요하다.
- SOLAPI 실제 발송은 SOLAPI 계정, Kakao business channel, 승인 템플릿, secret env가 필요하다.
- 전화번호 OTP 실인증 foundation은 dev/test provider boundary, env-gated SOLAPI SMS provider, hashed OTP 저장, 요청/확인 API, MyPage UI까지 구현됐다. 실제 발송 smoke는 운영 env 준비 후 진행한다.

## Local Collection And Itinerary Recommendation Target

Cloudflare/public HTTPS/provider smoke는 별도 운영 검증으로 남기고, 현재 기능 개발 목표는 로컬 Docker Compose 환경에서 공식 데이터 수집과 일정 자동 생성 추천 흐름을 끝까지 반복 검증 가능하게 만드는 것이다.

기준 흐름:

```text
TravelMonth 공식 페이지 수집
-> external_source_records 저장
-> /api/policies 정책 목록에 TravelMonth 혜택 노출
-> /api/ops/external-collection/quality 저장 품질 확인
-> /api/recommendations/regions 지역 추천 확인
-> /home 추천 UI 확인
-> /trips/new 일정 생성
-> trip_days / trip_places 자동 코스 저장
-> /trips/{id}와 /ai-results?tripId={id}에서 결과 확인
```

2026-05-22 기준으로 `/home` 추천 지역 링크에서 들어온 `/trips/new?region=...`는 새 일정 생성 지역에 반영된다. 홈의 AI 추천 맞춤 일정 카드는 기존 일정 목록의 첫 일정을 재표시하지 않고 지역 추천 또는 정책 지역 fallback 후보를 사용해 `/trips/new?region=...` 새 일정 생성 CTA로 연결한다. `travelmonth-{id}` 정책 slug는 정규화된 `policies` 레코드로 저장/일정 연결이 가능하다. 생성된 일정 상세의 추천 정책 카드는 hardcoded article이 아니라 `GET /api/trips/{tripId}`의 `recommendedPolicies`를 렌더링하며 정규화된 정책을 `/policies/{slug}` 상세로 연결한다. `/ai-results?tripId=...`는 현재 trip timeline을 함께 조회해 이미 들어간 장소 후보를 `이미 일정에 있음`으로 표시하고 중복 추가를 막는다.

작업명세는 `docs/superpowers/specs/2026-05-21-local-collection-itinerary-recommendation-smoke-design.md`를 기준으로 한다. 다음 구현은 로컬 수동 수집 명령, local recommendation smoke 스크립트, backend/frontend/e2e 검증 보강 순서로 진행한다.

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
- Frontend App Vitest: `94 passed` (`npm test -- --run src/App.test.tsx`).
- Frontend e2e: `4 passed`.
- Frontend build: passed.
- Backend schema pytest: `2 passed`.
- Backend pytest: 이전 기준 `218 passed`; 이번 stale 정리에서는 전체 backend pytest를 재실행하지 않았다.
- Alembic offline SQL: passed.
- Compose config/build checks: passed.
- `git diff --check`: passed.
- 삭제 문서 참조, stale trip alias 참조, secret/env/archive 추적 확인: passed.

## 다음 작업 방향

1. 실제 env가 준비되면 Cloudflare Tunnel actual env full-up, public route smoke, SMTP staging smoke, OAuth provider smoke 순서로 운영 검증을 진행한다.
2. SOLAPI Kakao AlimTalk staging smoke는 provider 계정, channel, 승인 템플릿, webhook secret 준비 후 진행한다.
3. 운영 검증 대기 중 기능 개발을 계속할 경우 전화번호 OTP 실제 발송 smoke와 live collector 정기 수집 운영 모니터링을 별도 의뢰로 진행한다.
