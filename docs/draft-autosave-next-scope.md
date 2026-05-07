# Draft Autosave 2차 범위 검토

## Summary

- 1차 autosave는 `/trips/new` 일정 생성 draft와 `/trips/:id` 장소 추가 draft에 적용됐다.
- 2차 범위는 무조건 확대하지 않고, 입력 손실 위험과 개인정보 저장 위험을 나눠 판단한다.
- 결론은 **장소 수정 draft만 2차 구현 대상으로 둔다**.
- 마이페이지 프로필 draft는 보류하고, 연락처 draft는 localStorage 저장 대상에서 제외한다.

## 현재 구현

| 화면 | 저장 대상 | 저장 위치 | 삭제 시점 |
|---|---|---|---|
| `/trips/new` | `region`, `style`, `durationDays`, `policySlug` | `travel-hunter:draft:trip-create:*` | 일정 생성 성공 |
| `/trips/:id` 장소 추가 sheet | `dayNumber`, `time`, `label`, `meta` | `travel-hunter:draft:trip-place:{tripId}:add:{dayNumber}` | 저장 성공 또는 sheet 닫기 |
| `/trips/:id` 장소 수정 sheet | `placeId`, `time`, `label`, `meta` | `travel-hunter:draft:trip-place:{tripId}:edit:{placeId}` | 저장 성공, sheet 닫기, 장소 삭제 |

공통 유틸은 `frontend/src/utils/draftStorage.ts`를 사용한다.

## 2차 후보 판단

| 후보 | 판단 | 이유 |
|---|---|---|
| 장소 수정 draft | 적용 후보 | 장소 메모가 길어질 수 있고, accidental refresh/tab close 때 입력 손실 가능성이 있다. 기존 `placeId` 기준 key로 stale draft 범위를 좁힐 수 있다. |
| 마이페이지 프로필 draft | 보류 | 지역/스타일/예산은 짧은 선택형 입력이고 다시 선택 비용이 낮다. DB profile과 local draft가 다르면 사용자가 현재 저장 상태를 오해할 수 있다. |
| 알림 연락처 draft | 제외 | 전화번호는 개인정보다. 저장 전 값을 localStorage에 남기는 것은 MVP 편의보다 개인정보/공용 PC 리스크가 크다. |
| 프로필 설정 onboarding draft | 후속 후보 | signup 직후 3단계 입력 손실 방지는 가능하지만, 현재 입력량이 짧고 flow가 단순해 장소 수정보다 우선순위가 낮다. |
| 정책 검색/필터 | autosave 대상 아님 | 검색 상태 보존이 필요하면 localStorage보다 URL query parameter가 적합하다. |
| auth/password reset/OAuth/OTP | 제외 | 비밀번호, reset token, OAuth state, OTP 관련 값은 localStorage에 저장하지 않는다. |

## 구현 완료: 장소 수정 draft

### 범위

- 대상: `/trips/:id` 장소 수정 sheet의 `time`, `label`, `meta`.
- key: `travel-hunter:draft:trip-place:{tripId}:edit:{placeId}`.
- TTL: 기존 공통 기본값 24시간.
- viewer 권한 사용자는 편집 UI가 없으므로 draft 저장도 하지 않는다.

### 동작 기준

- 장소 수정 sheet를 열 때 해당 `placeId`의 유효 draft가 있으면 draft 값을 우선 복원한다.
- draft가 없으면 서버에서 받은 기존 place 값을 사용한다.
- 입력 변경 시 draft를 저장한다.
- 저장 성공 시 해당 edit draft를 삭제한다.
- 취소/닫기 시 해당 edit draft를 삭제한다. 사용자가 닫기를 누른 경우는 의도적 취소로 본다.
- 장소 삭제 성공 시 해당 edit draft도 삭제한다.

### 보류 기준

- 같은 장소가 서버에서 이미 수정됐는지 비교하는 conflict detection은 1차 구현에 넣지 않는다.
- draft 복원 안내 banner는 1차 구현에 넣지 않는다. 필요하면 UX polish로 분리한다.
- 장소 추가 draft의 “닫기 시 삭제” 정책은 유지한다.

## Privacy Guardrails

- localStorage에는 auth token, refresh token, password, reset token, OAuth state, OTP, 전화번호 draft를 저장하지 않는다.
- source of truth는 계속 PostgreSQL이다.
- draft는 입력 손실 방지용 best-effort 보조 기능이며 서버 동기화 기능이 아니다.

## Test Plan

- edit sheet에서 값을 바꾸면 `trip-place:{tripId}:edit:{placeId}` draft가 저장된다.
- 같은 장소 edit sheet를 다시 열면 draft 값이 복원된다.
- 저장 성공 후 edit draft가 삭제된다.
- 닫기/취소 후 edit draft가 삭제된다.
- 장소 삭제 후 edit draft가 삭제된다.
- viewer 권한에서는 draft 저장이 발생하지 않는다.
- 기존 add-place draft 테스트는 계속 통과해야 한다.

## Decision

- 2차 autosave 구현은 **장소 수정 draft**로 제한해 완료했다.
- 마이페이지 프로필과 연락처는 이번 autosave 확장 범위에서 제외한다.
