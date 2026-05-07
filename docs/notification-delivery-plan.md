# Travel Hunter 마감 알림 발송 기반 설계

## Summary

- 이 문서는 마감 알림 발송 설계 기준이다. 현재 1차 기반으로 전화번호 저장과 발송 이력 테이블은 추가됐고, 실제 카카오 알림톡 발송과 scheduler 구현은 다음 단계로 둔다.
- 1차 발송 채널은 카카오 알림톡으로 고정한다.
- 스케줄러는 FastAPI 내부 background task 방식으로 설계한다.
- 현재 저장된 사용자 설정은 `user_notification_settings.deadline_enabled`이며, D-7/D-1 기준은 기존 API의 `deadlineLeadDays = [7, 1]`을 따른다.

## Targeting Rules

- 1차 알림 대상은 사용자가 저장한 정책이다.
- 기준 데이터는 `user_saved_policies`로 연결된 `policies.end_date`다.
- 매일 KST 기준 `NOTIFICATION_RUN_AT=09:00` 이후 한 번 실행한다.
- 실행일을 `today`라고 할 때, `today + 7일`, `today + 1일`에 마감되는 저장 정책을 찾는다.
- `policies.end_date`가 없거나 이미 지난 정책은 제외한다.
- 사용자 설정 row가 없으면 기존 API 기본값과 동일하게 `deadline_enabled=true`로 취급한다.
- `deadline_enabled=false`인 사용자는 제외한다.
- 카카오 알림톡 수신에 필요한 전화번호가 없거나 검증되지 않은 사용자는 `skipped`로 기록하고 발송하지 않는다.

## Data Model Direction

1차 기반 구현에서 다음 DB 기준을 추가했다.

- `users.phone_number`: 카카오 알림톡 수신 전화번호.
- `users.phone_verified_at`: MVP에서는 수동 검증 또는 테스트 seed 기준으로 채울 수 있는 nullable timestamp.
- `notification_deliveries`: 발송 이력과 중복 방지 테이블.

`notification_deliveries` 권장 필드:

- `id`
- `user_id`
- `policy_id`
- `channel`: 1차 값은 `kakao_alimtalk`
- `lead_day`: `7` 또는 `1`
- `target_deadline_date`: 정책 마감일
- `status`: `pending`, `sent`, `failed`, `skipped`
- `attempt_count`
- `provider_message_id`
- `error_message`
- `scheduled_at`
- `sent_at`
- `failed_at`
- `created_at`
- `updated_at`

중복 방지 unique key:

- `(user_id, policy_id, channel, lead_day, target_deadline_date)`

## Scheduler Design

- FastAPI lifespan/startup에서 background task를 시작한다.
- 환경변수 `NOTIFICATION_SCHEDULER_ENABLED=true`일 때만 동작한다.
- 기본값은 local 개발 혼선을 막기 위해 `false`로 둔다.
- scheduler는 60초 간격으로 현재 KST 시간을 확인하고, 해당 날짜에 아직 실행하지 않았고 `NOTIFICATION_RUN_AT` 이후면 한 번 실행한다.
- DB 작업은 sync SQLAlchemy 구조를 유지한다.
- 여러 프로세스가 동시에 실행되어도 `notification_deliveries` unique key로 중복 발송을 막는다.
- 운영 확장 단계에서는 cron container 또는 외부 job runner로 교체할 수 있게 발송 대상 계산/service 로직은 scheduler와 분리한다.

## Kakao AlimTalk Integration Direction

- 실제 발송 전 준비물:
  - 카카오 비즈니스 채널
  - 알림톡 템플릿 승인
  - 발송 대행사 또는 API provider 계정
  - sender key, template code, API key/secret
  - 수신자 전화번호 저장 및 검증 정책
- provider adapter를 `KakaoAlimtalkClient` 형태로 분리한다.
- 환경변수 후보:
  - `KAKAO_ALIMTALK_ENABLED`
  - `KAKAO_ALIMTALK_BASE_URL`
  - `KAKAO_ALIMTALK_API_KEY`
  - `KAKAO_ALIMTALK_SENDER_KEY`
  - `KAKAO_ALIMTALK_TEMPLATE_CODE_D7`
  - `KAKAO_ALIMTALK_TEMPLATE_CODE_D1`
  - `KAKAO_ALIMTALK_TIMEOUT_SECONDS`
- 템플릿 변수 후보:
  - 사용자 이름
  - 정책명
  - 마감일
  - 남은 일수
  - 공식 안내 URL 또는 앱 정책 상세 URL

## Failure And Retry Rules

- 발송 성공 시 `status=sent`, `sent_at`, `provider_message_id`를 저장한다.
- 전화번호 없음, 전화번호 미검증, 템플릿 설정 없음은 `status=skipped`로 저장한다.
- provider 오류나 네트워크 오류는 `status=failed`, `attempt_count`, `error_message`, `failed_at`을 저장한다.
- 1차 구현의 자동 재시도는 같은 실행 내 최대 1회로 제한한다.
- 장기 재시도 큐는 후속 작업으로 둔다.
- 같은 사용자/정책/마감일/lead day/channel 조합은 이미 `sent` 또는 `skipped`이면 다시 발송하지 않는다.
- `failed`는 다음 scheduler 실행에서 `attempt_count < 2`인 경우 한 번 더 시도할 수 있다.

## Next Implementation Order

1. 대상 계산 service 구현
   - D-7/D-1 저장 정책 조회.
   - 사용자 알림 설정과 전화번호 검증 필터.
2. FastAPI 내부 scheduler 구현
   - `NOTIFICATION_SCHEDULER_ENABLED`가 true일 때만 시작.
   - startup/lifespan에서 background task 실행.
3. Kakao AlimTalk adapter 구현
   - 처음에는 fake provider 테스트와 dry-run 로그를 먼저 붙인다.
   - 실제 provider secret이 준비되면 real provider로 전환한다.

## Test Plan For Next Implementation

- 대상 계산:
  - D-7 정책만 선택된다.
  - D-1 정책만 선택된다.
  - 마감일 없는 정책은 제외된다.
  - 저장하지 않은 정책은 제외된다.
  - `deadline_enabled=false` 사용자는 제외된다.
- 중복 방지:
  - 같은 user/policy/lead day/deadline/channel은 한 번만 delivery row가 생성된다.
  - 이미 `sent`인 row는 재발송되지 않는다.
- 전화번호:
  - 전화번호 없음 또는 미검증은 `skipped`.
  - 검증된 전화번호만 provider 호출 대상.
- provider:
  - 성공 시 `sent`.
  - 실패 시 `failed`와 오류 메시지 저장.
- scheduler:
  - disabled 환경에서는 시작하지 않는다.
  - enabled 환경에서는 하루 한 번만 실행한다.

## Assumptions

- 1차 알림 대상은 저장 정책(`user_saved_policies`)만 포함한다.
- 일정에 담긴 정책(`trip_policies`) 기반 알림은 후속 확장으로 둔다.
- 카카오 알림톡은 실제 운영 계정과 승인 템플릿이 준비된 뒤 real provider로 연결한다.
- FastAPI 내부 scheduler는 MVP 내부 테스트 기준이며, 운영 확장 시 cron container 또는 외부 job runner로 교체할 수 있다.
- `docs/requirements.md`는 기존 untracked 파일이므로 이 작업에서 건드리지 않는다.
