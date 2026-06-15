# Travel Hunter Current DB Schema

## 기준

- 기준일: 2026-06-15
- 기준 Alembic head: `0019_email_first_signup`
- PostgreSQL: 16.13
- SQL 산출물: `docs/db-schema-current.sql`
- 생성 방식: fresh PostgreSQL DB에 `alembic upgrade head`를 적용한 뒤 `pg_dump --schema-only --no-owner --no-privileges`로 추출했다.

이 문서는 현재 앱이 사용하는 PostgreSQL schema의 기준 문서다. 초기 SQL 기준본 이후 Alembic migration `0002`~`0019`이 적용된 현재 구조를 설명한다.

## 테이블 그룹

Auth/User:

- `users`
- `auth_refresh_tokens`
- `social_accounts`
- `password_reset_tokens`
- `pending_signups`
- `user_notification_settings`

`social_accounts.provider_id`는 Google OIDC `sub` 등 긴 provider subject를 보관할 수 있도록 `varchar(255)`로 유지한다.

Policy:

- `policies`
- `policy_documents`
- `user_saved_policies`

External collection:

- `external_source_records`

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
- `phone_verification_codes`
- `admin_audit_logs`
- `external_source_records`
- `alembic_version`

추가 컬럼:

- `users.travel_style`
- `users.travel_budget`
- `users.phone_number`
- `users.phone_verified_at`
- `policies.apply_url`
- `trip_invites.role`
- `trips.status`
- `trips.revision`


## `pending_signups`

`pending_signups`는 email-first 회원가입 인증 링크를 위한 단기 pending 상태 저장 테이블이다. 원문 토큰은 저장하지 않고 `token_hash`만 보관하며, 비밀번호는 인증 완료 단계에서만 수집한다.

주요 컬럼:

- `id`
- `email`
- `token_hash`
- `created_at`
- `expires_at`

## `phone_verification_codes`

`phone_verification_codes`는 알림 연락처 OTP 실인증을 위한 단기 인증 코드 저장 테이블이다. 원문 인증번호는 저장하지 않고 `code_hash`만 보관하며, dev/test provider boundary가 발송을 담당한다.

주요 컬럼:

- `id`
- `user_id`
- `phone_number`
- `code_hash`
- `expires_at`
- `attempt_count`
- `verified_at`
- `created_at`

## `external_source_records`

`external_source_records`는 공식 외부 출처에서 수집한 원문과 파생 레코드를 내부 정책/추천 입력으로 변환하기 전에 보존하는 수집 기준 테이블이다. 목록/상세 원문, 출처 메타데이터, 정규화된 지역/상태/혜택/선호도 필드, 신뢰도와 freshness 정보를 함께 저장해 후속 collector, normalizer, recommendation API가 같은 근거 데이터를 재사용할 수 있게 한다. `source_category`는 `regional_benefit`, `traffic_benefit`, `local_half_trip`처럼 출처/혜택 계열을 구분하며, 기존 TravelMonth 지역 수집 전용 값으로 제한하지 않는다.

주요 컬럼 그룹:

- `id`
- `source_name` / `source_type` / `source_url` / `source_category`
- `external_id` / `canonical_key`
- `detail_url` / `collected_page_url`
- `title` / `organizer_text` / `organizers`
- `region` / `city` / `is_nationwide`
- `status_text` / `status` / `start_date` / `end_date`
- `benefit_text` / `benefit_value_text` / `extracted_amount_krw` / `extracted_discount_percent` / `benefit_value_type`
- `tags` / `contact_text` / `inferred_travel_styles`
- `confidence` / `field_completeness`
- `raw_list_text` / `raw_detail_text` / `raw_payload`
- `last_fetched_at` / `last_verified_at` / `freshness_status`
- `created_at` / `updated_at`

## `policies` source tracking

`policies`는 사용자에게 노출되는 공식 혜택의 정규화 테이블이다. TravelMonth 등 외부 공식 수집 레코드는 원문 근거를 `external_source_records`에 보존한 뒤 active/fresh 항목을 `policies`로 승격한다. 승격된 정책은 저장, 일정 연결, 추천 카드, 상세 페이지에서 일반 정책과 같은 경로를 사용한다.

정규화 출처 추적 컬럼:

- `source_type`
- `source_name`
- `source_category`
- `external_source_record_id`
- `source_url`
- `source_canonical_key`
- `normalized_at`
- `last_verified_at`
- `verification_status`

`external_source_record_id`는 `external_source_records.id`를 참조하며, 원문 레코드 삭제 시 정책 row는 유지하고 참조만 `NULL`로 만든다.

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

## 2026-05-27 trips.participant_count

`trips.participant_count` stores the planned travel party size for itinerary creation. It is separate from `trip_members`, which continues to represent real invited/authenticated trip members and permissions. The API exposes this field as `participantCount`.


## 2026-06-11 trips.revision

`trips.revision` is an integer optimistic-lock version for itinerary place edits. It defaults to `1` and is incremented atomically when owner/editor users add, update, move, or delete trip places. The API exposes this field as `Trip.revision`, while place mutation requests send the last seen value as `expectedRevision`.

## Admin management additions

??? v1? ?? ?? ??? ?? `users.role` ?? ???? `user`? `admin`? ????. ???? `user`??.

??? ?? ??? public ?? ??? ?? `policies`? ?? ??? ????.

- `status`: `active` ?? `hidden`, ??? `active`
- `admin_override_enabled`: external normalized policy? ???? ????? ??, ??? `false`
- `updated_at`: ??? ?? ?? ?? ??

`admin_audit_logs`? ??/?? ??? ?? ??? ????. `before_json`? `after_json`? sanitized JSON?? password hash, token, OTP, OAuth identifier ?? secret? ???? ???.
