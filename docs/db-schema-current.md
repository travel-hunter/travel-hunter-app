# Travel Hunter Current DB Schema

## 기준

- 기준일: 2026-06-15
- 기준 Alembic head: `0019_email_first_signup`
- PostgreSQL: 16.13
- SQL 산출물: `docs/db-schema-current.sql`
- 생성 방식: fresh PostgreSQL DB에 `alembic upgrade head`를 적용한 뒤 `pg_dump --schema-only --no-owner --no-privileges`로 추출했다.

이 문서는 현재 앱이 사용하는 PostgreSQL schema의 기준 문서다. 초기 SQL 기준본 이후 Alembic migration `0002`~`0019`가 적용된 현재 구조를 설명한다.

## 테이블 그룹

Auth/User:

- `users`
- `auth_refresh_tokens`
- `social_accounts`
- `password_reset_tokens`
- `pending_signups`
- `user_notification_settings`

Policy:

- `policies`
- `policy_documents`
- `user_saved_policies`

Trip:

- `trips`
- `trip_days`
- `trip_places`
- `trip_members`
- `trip_policies`
- `trip_invites`
- `recommendations`

Notification:

- `notification_deliveries`

Migration metadata:

- `alembic_version`

## v0.3 이후 추가된 구조

추가 테이블:

- `user_saved_policies`
- `user_notification_settings`
- `notification_deliveries`
- `password_reset_tokens`
- `pending_signups`
- `alembic_version`

추가 컬럼:

- `users.travel_style`
- `users.travel_budget`
- `users.phone_number`
- `users.phone_verified_at`
- `policies.apply_url`
- `trip_invites.role`
- `trips.status`

## 운영 기준

- Schema 생성과 변경은 Alembic으로만 수행한다.
- 앱 schema 생성을 위해 SQLAlchemy `create_all()`을 사용하지 않는다.
- `docs/db-schema-current.sql`은 현재 구조 공유와 검토용 기준이다. 실제 배포 적용은 Alembic migration을 사용한다.
- API DTO는 `camelCase`, DB/SQLAlchemy field는 `snake_case`를 유지한다.
- `policies.slug`는 정책 상세 route key다.
- `trips.slug`는 만들지 않는다. 일정 route는 내부 trip id를 사용한다.

## 잔여 리스크

`alembic check`는 현재 index/unique constraint 이름 차이를 감지한다. 예시는 다음과 같다.

- `idx_policies_slug` vs SQLAlchemy metadata의 `ix_policies_slug`
- `idx_trip_invites_token` / `idx_trip_invites_trip_id` vs `ix_trip_invites_*`
- 일부 unique constraint와 unique index 표현 차이

이번 문서 작업은 schema 문서 최신화가 목적이므로 해당 drift를 수정하지 않는다. 필요하면 별도 migration/metadata 정리 작업으로 분리한다.
