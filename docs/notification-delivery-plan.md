# Travel Hunter 마감 알림 발송 기반 설계

## Summary

- 마감 알림은 카카오 알림톡을 1차 발송 채널로 둔다.
- 현재 구현 완료 범위는 알림 설정 저장, 연락처 저장, 발송 이력 테이블, D-7/D-1 대상 계산 service, FastAPI 내부 scheduler다.
- scheduler는 기본 비활성화이며 `NOTIFICATION_SCHEDULER_ENABLED=true`일 때만 하루 1회 target calculation service를 실행한다.
- 실제 카카오 알림톡 provider, 발송 성공/실패 처리, retry 정책은 다음 단계다.

## Current Implementation

- `users.phone_number`: 카카오 알림톡 수신 연락처.
- `users.phone_verified_at`: 연락처 검증 여부. 현재는 read-only 값이다.
- `user_notification_settings.deadline_enabled`: 사용자별 정책 마감 알림 전체 켜기/끄기.
- `notification_deliveries`: 사용자/정책/channel/lead day/마감일 조합의 발송 후보와 이력.
- `backend/app/services/notification_delivery.py`: D-7/D-1 대상 계산 service.
- `backend/app/services/notification_scheduler.py`: FastAPI 내부 scheduler.

## Target Calculation

- `user_saved_policies`에 저장된 정책만 대상이다.
- `policies.end_date == today + lead_day`인 정책만 대상이다.
- `lead_days` 기본값은 `[7, 1]`이다.
- `user_notification_settings` row가 없으면 `deadline_enabled=true`로 취급한다.
- `deadline_enabled=false` 사용자는 제외한다.
- 전화번호가 있고 `phone_verified_at`이 있으면 `pending` 후보를 만든다.
- 전화번호가 없거나 미검증이면 `skipped` 후보를 만든다.
- 기존 `sent`/`skipped` row는 제외한다.
- 기존 `pending` row는 재사용한다.
- 기존 `failed` row는 retry 정책이 생길 때까지 제외한다.

## Scheduler

- FastAPI lifespan에서 background task로 시작한다.
- `NOTIFICATION_SCHEDULER_ENABLED=false`가 기본값이다.
- enabled 상태에서 `DATABASE_URL`이 없으면 startup에서 실패한다.
- 시간 기준은 KST이며 `zoneinfo.ZoneInfo("Asia/Seoul")`를 사용한다.
- `NOTIFICATION_RUN_AT=09:00` 이후 같은 KST 날짜에 한 번만 실행한다.
- `NOTIFICATION_POLL_SECONDS=60` 간격으로 실행 가능 여부를 확인한다.
- target calculation 실패는 로그로 남기고 앱 프로세스는 죽이지 않는다.
- 실패한 날짜는 성공 처리하지 않으므로 다음 polling cycle에서 다시 시도할 수 있다.
- shutdown 시 background task를 cancel하고 정상 종료한다.
- multi-worker 중복 실행은 별도 distributed lock 없이 `notification_deliveries` unique key로 방어한다.

## Runtime Env

- `NOTIFICATION_SCHEDULER_ENABLED`: `true`일 때 scheduler 시작.
- `NOTIFICATION_RUN_AT`: KST 기준 실행 시각. 형식은 `HH:MM` 또는 `HH:MM:SS`.
- `NOTIFICATION_POLL_SECONDS`: scheduler polling 간격. 1 이상이어야 한다.

## Kakao AlimTalk Direction

실제 발송 전 준비물:

- 카카오 비즈니스 채널.
- 승인된 알림톡 템플릿.
- 발송 대행사 또는 Kakao-compatible provider 계정.
- sender key, template code, API key/secret.
- 수신 전화번호 검증 정책.

권장 환경변수:

- `KAKAO_ALIMTALK_ENABLED`
- `KAKAO_ALIMTALK_BASE_URL`
- `KAKAO_ALIMTALK_API_KEY`
- `KAKAO_ALIMTALK_SENDER_KEY`
- `KAKAO_ALIMTALK_TEMPLATE_CODE_D7`
- `KAKAO_ALIMTALK_TEMPLATE_CODE_D1`
- `KAKAO_ALIMTALK_TIMEOUT_SECONDS`

## Failure And Retry Rules

- 발송 성공: `status=sent`, `sent_at`, `provider_message_id` 저장.
- 전화번호 없음, 미검증, 템플릿 설정 없음: `status=skipped`.
- provider 또는 network 오류: `status=failed`, `attempt_count`, `error_message`, `failed_at` 저장.
- `failed` retry는 provider/retry 단계에서 구현한다.
- 같은 사용자/정책/channel/lead day/마감일 조합이 이미 `sent` 또는 `skipped`이면 다시 발송하지 않는다.

## Next Implementation Order

1. Kakao AlimTalk provider adapter 구현.
   - 처음에는 fake provider 테스트를 붙인다.
   - 실제 provider secret이 준비되면 real provider로 전환한다.
2. Retry 정책 구현.
   - `failed` delivery를 제한된 횟수만 재시도한다.
   - provider error와 permanent skip 조건을 분리한다.
3. 운영 방식 재검토.
   - MVP 이후에는 cron container, Jenkins scheduled job, 외부 job runner로 대체할 수 있다.

## Test Coverage

- target calculation service는 D-7/D-1 후보, skipped 후보, 기존 delivery 중복 방지를 검증한다.
- scheduler는 disabled 상태, run time 전/후, 같은 날짜 1회 실행, 다음 날짜 재실행, 실패 후 retry 가능성, cancellation, DB misconfig를 검증한다.

## Assumptions

- 1차 알림 대상은 저장 정책(`user_saved_policies`)으로 제한한다.
- 일정에 담긴 정책(`trip_policies`) 기반 알림은 후속 확장으로 둔다.
- 실제 카카오 알림톡은 비즈니스 채널, 승인 템플릿, provider secret 준비 후 연결한다.
- 전화번호 실인증/OTP는 이번 범위에 포함하지 않는다.
