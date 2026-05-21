# Travel Hunter 다음 작업 우선순위

## 기준

- 기준일: 2026-05-20
- 기준 검증 기준: `9bdcb73` 및 현재 문서 작업트리
- 브랜치: `develop`
- 원격 상태: PR #17, #18, #19, #20, #23이 `develop`에 병합됐고 staging smoke 준비로 전환하는 기준이다.
- 기준 상태: DB-backed-only MVP, numeric trip id 계약, 문서/계약/eval 동기화, frontend/backend 검증이 완료된 상태다.

## Current Local Priority

Cloudflare는 뒤로 미루고, 현재 1순위는 로컬 Docker Compose에서 공식 데이터 수집과 일정 자동 생성 추천 흐름을 끝까지 반복 검증 가능하게 만드는 것이다.

작업명세:

- `docs/superpowers/specs/2026-05-21-local-collection-itinerary-recommendation-smoke-design.md`

성공 기준:

- TravelMonth 공식 페이지 수집이 수동 명령으로 실행된다.
- 수집 결과가 `external_source_records`에 저장된다.
- `/api/ops/external-collection/quality`가 저장 품질과 recommendation preview를 보여준다.
- `/api/recommendations/regions`가 저장 데이터 기반 지역 추천을 반환한다.
- `/home` 추천 UI가 해당 API를 사용한다.
- `/trips/new`에서 새 일정을 만들면 `trip_days`, `trip_places`, `recommendations`가 자동 저장된다.
- `/trips/{id}`와 `/ai-results?tripId={id}`에서 생성 결과를 확인할 수 있다.

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
- PR #17, #18, #19, #20, #23이 `develop`에 병합됐다.
- 기존 non-numeric 제주 3일 trip handle 지원을 제거하고 `trip_id`는 numeric string `Trip.id`만 지원하도록 계약, backend, frontend, tests, `.agent/evals`를 동기화했다.
- Frontend `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, backend `python -m pytest`, compose config, stale alias search, API eval JSON validation, `git diff --check`가 통과했다.
- `docs/deployment-cicd/staging-ops-work-orders.md`에 외주/인프라 담당자용 남은 운영 검증 작업지시서를 추가했다.

## 다음 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Cloudflare Tunnel staging env 준비 | 실제 domain, tunnel token, DB, auth, CORS, public base URL 값이 준비됐는지 확인하고 누락값을 명시한다. |
| 2 | Cloudflare Tunnel actual env full-up | 실제 `deploy/.env.tunnel` 값으로 migration, seed, compose up, `/api/health` smoke가 통과한다. |
| 3 | public HTTPS route smoke | public HTTPS 기준 `/login`, `/policies`, `/trips`, `/mypage`가 blank root 없이 동작한다. |
| 4 | SMTP password reset staging smoke | 실제 SMTP provider와 HTTPS staging URL로 reset email 수신, token confirm, 새 비밀번호 로그인이 통과한다. |
| 5 | Kakao/Google OAuth provider smoke | provider console redirect URI와 runtime env를 맞춘 뒤 실제 social login callback과 session 복구가 통과한다. |
| 6 | SOLAPI Kakao AlimTalk staging smoke | 실제 SOLAPI/Kakao channel/template/env로 발송 요청, retry, webhook 수신이 확인된다. |
| 7 | Jenkins CD staging 자동화 | 수동 Compose 배포 흐름을 Jenkins job으로 재현하고 secret은 credentials로만 관리한다. |
| 8 | 홈 추천 목적지 ranking 운영 검증 | 정책 수, 마감 임박, 혜택 금액, 취향 보정, 프로필 지역 최종 tie-breaker 기준이 live data에서 기대대로 작동하는지 확인한다. |
| 9 | 전화번호 OTP 실제 발송 smoke | env-gated SOLAPI SMS provider를 실제 운영 env로 켜고, 비용 제한과 실패 처리 기준에 맞춰 staging smoke를 완료한다. |
| 10 | 여행가는 달 live collector 운영 모니터링 | 공식 여행가는 달 지역 여행할인 모아보기 live HTML 58건 수집 기준을 유지하고, `EXTERNAL_COLLECTION_MIN_PARSED_COUNT` 미달 수집을 실패로 처리한다. |
| 11 | external collection scheduler cadence 운영 검증 | 외부 수집 주기, 재검증 기준, freshness 상태 전환, 실패 재시도 정책이 live 운영 데이터에서 기대대로 동작하는지 확인한다. scheduler는 마지막 시도/성공/parsed count/outcome/error 내부 상태를 `GET /api/ops/external-collection`에서 확인하고, 저장 품질과 추천 반영 preview는 `GET /api/ops/external-collection/quality`에서 확인한다. |
| 12 | external source records 기반 홈 지역 추천 API | `external_source_records`의 지역/상태/혜택/선호도 파생 필드를 사용해 홈 지역 추천 API 후보와 정렬 기준을 구현한다. |
| 13 | AppDataApi 경유 홈 추천 UI | frontend 홈 추천 UI가 backend 추천 API를 `AppDataApi` 경계로 호출하고 loading/error/empty 상태를 처리한다. |

## 기능 개발 후보

- 홈 추천 목적지 ranking 운영 검증.
- 여행가는 달 live collector 운영 모니터링.
- external collection scheduler cadence 운영 검증.
- external source records 기반 홈 지역 추천 API.
- AppDataApi 경유 홈 추천 UI.
- 정책 신청 URL 데이터 품질 보강.
- 정책 신청 상태 모델 확장.
- 전화번호 OTP 실제 발송 staging smoke.
- PWA service worker 1차 적용 여부 결정.

## 운영 검증 후보

- Cloudflare Tunnel named tunnel full-up.
- public HTTPS 기준 `/login`, `/policies`, `/trips`, `/mypage` smoke.
- SMTP password reset staging smoke.
- Kakao/Google OAuth staging smoke.
- SOLAPI Kakao AlimTalk 실제 발송 smoke.
- Jenkins CD staging 자동화.

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
- trip route handle은 numeric string `Trip.id`만 지원하고 `trips.slug`는 추가하지 않는다.
- 현재 route URL과 DB-backed source of truth를 유지한다.
